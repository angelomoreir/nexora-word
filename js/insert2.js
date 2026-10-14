'use strict';
/* =========================================================
   Inserir: WordArt, SmartArt, Gráficos, ClipArt, Equações,
   Peças Rápidas, campos, números de página, cabeçalhos e
   rodapés, folhas de rosto, referências cruzadas, objectos,
   quebras (coluna/secção/moldagem).
   ========================================================= */

/* ---------- Utilitários de renderização ---------- */
function canvasToImg(c, w, kind, spec, alt) {
  const url = c.toDataURL('image/png');
  const json = esc(JSON.stringify(spec));
  return `<img src="${url}" style="width:${w}px" alt="${esc(alt)}" data-kind="${kind}" data-spec="${json}">`;
}
const accentsNow = () => DocStyles.theme().accents;
function insertOrReplace(html, target) {
  if (target) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const n = tmp.firstElementChild;
    n.style.width = target.style.width || n.style.width;
    target.replaceWith(n);
    selectImage(n);
    changed();
  } else exec('insertHTML', html);
}

/* =========================================================
   WordArt
   ========================================================= */
const WordArt = (() => {
  const STYLES = [
    { fill: ['#000000'], stroke: null },
    { fill: ['#c0504d', '#f79646'], stroke: '#8c3a37' },
    { fill: ['#ffffff'], stroke: '#4f81bd', shadow: '#1f497d' },
    { fill: ['#4f81bd', '#1f497d'], stroke: '#17365d', shadow: 'rgba(0,0,0,.4)' },
    { fill: ['#ffc000', '#e36c09'], stroke: '#974806' },
    { fill: ['#9bbb59', '#4f6228'], stroke: null, shadow: 'rgba(0,0,0,.35)' },
    { fill: ['#8064a2', '#3f3151'], stroke: '#ffffff' },
    { fill: ['#d9d9d9', '#595959'], stroke: '#262626', shadow: 'rgba(0,0,0,.5)' },
    { fill: ['#4bacc6', '#ffffff', '#4bacc6'], stroke: '#215968' },
    { fill: ['#ffff00', '#ff0000'], stroke: '#7f0000' },
    { fill: ['#ffffff'], stroke: '#000000' },
    { fill: ['#000000'], stroke: null, shadow: '#bfbfbf', reflect: true },
  ];
  const SHAPES = [['plain', 'Texto simples'], ['arch', 'Arco para cima'], ['archdown', 'Arco para baixo'], ['wave', 'Onda'], ['slant', 'Inclinado'], ['grow', 'Aumentar']];

  function render(spec) {
    const st = STYLES[spec.style] || STYLES[0];
    const fs = spec.size * 1.6, font = `${spec.italic ? 'italic ' : ''}${spec.bold ? 'bold ' : ''}${fs}px '${spec.font}'`;
    const m = document.createElement('canvas').getContext('2d');
    m.font = font;
    const tw = m.measureText(spec.text).width;
    const pad = fs * 0.4;
    let W = Math.ceil(tw + pad * 2), H = Math.ceil(fs * 1.5 + pad * 2);
    if (spec.shape === 'arch' || spec.shape === 'archdown') H = Math.ceil(fs * 2.4 + pad * 2);
    if (spec.shape === 'wave') H = Math.ceil(fs * 2.1 + pad * 2);
    if (st.reflect) H = Math.ceil(H * 1.7);
    const c = document.createElement('canvas');
    const dpr = 2;
    c.width = W * dpr; c.height = H * dpr;
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    x.font = font;
    x.textBaseline = 'alphabetic';
    const grad = x.createLinearGradient(0, pad, 0, pad + fs);
    st.fill.forEach((col, i) => grad.addColorStop(st.fill.length === 1 ? 0 : i / (st.fill.length - 1), col));
    const drawGlyph = (ch, gx, gy, rot = 0, scale = 1) => {
      x.save();
      x.translate(gx, gy);
      x.rotate(rot);
      x.scale(scale, scale);
      if (st.shadow) { x.shadowColor = st.shadow; x.shadowOffsetX = 3; x.shadowOffsetY = 3; x.shadowBlur = 3; }
      x.fillStyle = grad;
      x.fillText(ch, 0, 0);
      x.shadowColor = 'transparent';
      if (st.stroke) { x.lineWidth = Math.max(1, fs / 30); x.strokeStyle = st.stroke; x.strokeText(ch, 0, 0); }
      x.restore();
    };
    const chars = [...spec.text];
    const widths = chars.map(ch => x.measureText(ch).width);
    const base = pad + fs;
    if (spec.shape === 'plain' || spec.shape === 'slant') {
      if (spec.shape === 'slant') { x.setTransform(dpr, 0, -0.35 * dpr, dpr, 0.35 * base * dpr, 0); }
      let cx = pad;
      chars.forEach((ch, i) => { drawGlyph(ch, cx, base); cx += widths[i]; });
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else if (spec.shape === 'arch' || spec.shape === 'archdown') {
      const R = Math.max(tw / Math.PI * 1.1, fs * 1.5), cxc = W / 2, up = spec.shape === 'arch';
      const cy = up ? pad + fs + R : H - pad - fs * 0.2 - R;
      let ang = -tw / R / 2;
      chars.forEach((ch, i) => {
        const a = ang + widths[i] / 2 / R;
        const gx = cxc + R * Math.sin(a), gy = up ? cy - R * Math.cos(a) : cy + R * Math.cos(a) + fs * 0.75;
        drawGlyph(ch, gx - widths[i] / 2 * Math.cos(a), gy, up ? a : -a);
        ang += widths[i] / R;
      });
    } else if (spec.shape === 'wave') {
      let cx = pad;
      chars.forEach((ch, i) => { const y = base + fs * 0.3 + Math.sin((cx / tw) * Math.PI * 2) * fs * 0.3; drawGlyph(ch, cx, y, Math.cos((cx / tw) * Math.PI * 2) * 0.25); cx += widths[i]; });
    } else if (spec.shape === 'grow') {
      let cx = pad;
      chars.forEach((ch, i) => { const s = 0.6 + 0.6 * (i / Math.max(1, chars.length - 1)); drawGlyph(ch, cx, base + fs * 0.1, 0, s); cx += widths[i] * s; });
    }
    if (st.reflect) {
      const h0 = Math.ceil(H / 1.7);
      x.save();
      x.globalAlpha = 0.3;
      x.translate(0, h0 * 2 - pad * 0.6);
      x.scale(1, -1);
      x.drawImage(c, 0, 0, W * dpr, h0 * dpr, 0, 0, W, h0);
      x.restore();
    }
    return { canvas: c, w: W };
  }

  async function dialogFor(styleIdx, target) {
    const s = target ? JSON.parse(target.dataset.spec) : { text: 'O seu texto aqui', font: 'Impact', size: 36, bold: false, italic: false, style: +styleIdx || 0, shape: 'plain' };
    const r = currentRange();
    if (!target && r && !r.collapsed) s.text = r.toString().slice(0, 200);
    const res = await dialog({
      title: 'Editar Texto WordArt',
      width: 470,
      body: `<div class="ms-row"><label>Tipo de letra:<input id="wa-font" list="fd-fontlist3" value="${esc(s.font)}"><datalist id="fd-fontlist3">${FONTS.map(f => `<option value="${f}">`).join('')}</datalist></label>
        <label>Tamanho:<input type="number" id="wa-size" value="${s.size}" style="width:60px"></label><label class="ms-tog"><input type="checkbox" id="wa-b"${s.bold ? ' checked' : ''}><b>N</b></label><label class="ms-tog"><input type="checkbox" id="wa-i"${s.italic ? ' checked' : ''}><i>I</i></label></div>
        <label>Texto:<textarea id="wa-text" style="height:60px">${esc(s.text)}</textarea></label>
        <div class="two"><label>Estilo:<select id="wa-style">${STYLES.map((_, i) => `<option value="${i}"${i === s.style ? ' selected' : ''}>Estilo WordArt ${i + 1}</option>`).join('')}</select></label><label>Forma:<select id="wa-shape">${SHAPES.map(([k, l]) => `<option value="${k}"${k === s.shape ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
        <div class="wa-preview" id="wa-preview"></div>`,
      onOpen: ov => {
        const upd = () => { const sp = collect(ov); if (!sp.text) return; const { canvas } = render({ ...sp, size: Math.min(sp.size, 40) }); canvas.style.maxWidth = '100%'; canvas.style.height = 'auto'; canvas.style.width = canvas.width / 2 + 'px'; $('#wa-preview', ov).replaceChildren(canvas); };
        ov.addEventListener('input', upd); ov.addEventListener('change', upd); upd();
      },
      buttons: [{ label: 'OK', primary: true, value: collect }, { label: 'Cancelar', value: null }],
    });
    if (!res || !res.text.trim()) return;
    const { canvas, w } = render(res);
    insertOrReplace(canvasToImg(canvas, w, 'wordart', res, res.text), target);
    function collect(ov) { return { text: $('#wa-text', ov).value, font: $('#wa-font', ov).value || 'Impact', size: Math.max(8, +$('#wa-size', ov).value || 36), bold: $('#wa-b', ov).checked, italic: $('#wa-i', ov).checked, style: +$('#wa-style', ov).value, shape: $('#wa-shape', ov).value }; }
  }

  DD_HOOKS['dd-wordart'] = dd => {
    dd.innerHTML = `<div class="wa-grid">${STYLES.map((_, i) => { const { canvas } = render({ text: 'A', font: 'Times New Roman', size: 18, bold: true, style: i, shape: 'plain' }); return `<button class="wa-item" data-cmd="wordart" data-arg="${i}" data-tip="Estilo WordArt ${i + 1}"><img src="${canvas.toDataURL()}" alt=""></button>`; }).join('')}</div>`;
  };
  return { dialogFor, render };
})();

/* =========================================================
   SmartArt
   ========================================================= */
const SmartArt = (() => {
  const LAYOUTS = [
    ['list', 'Lista', 'Lista com Marcas Básica'], ['process', 'Processo', 'Processo Básico'], ['cycle', 'Ciclo', 'Ciclo Básico'],
    ['hierarchy', 'Hierarquia', 'Organigrama'], ['pyramid', 'Pirâmide', 'Pirâmide Básica'], ['venn', 'Relação', 'Venn Básico'], ['radial', 'Ciclo', 'Radial Básico'],
  ];
  const wrapText = (ctx, text, maxW) => {
    const words = text.split(/\s+/), lines = [];
    let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  };
  function box(ctx, x, y, w, h, fill, text, round = 8, color = '#fff') {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, DocStyles.shadeHex(fill, 0.25)); g.addColorStop(1, fill);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, round); ctx.fill();
    ctx.restore();
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.min(18, h / 3)}px Calibri, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = wrapText(ctx, text, w - 12).slice(0, 3);
    const lh = Math.min(18, h / 3) * 1.15;
    lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * lh));
  }
  function render(spec) {
    const items = spec.items.filter(i => i.text.trim());
    const W = 600, H = spec.layout === 'hierarchy' ? 360 : spec.layout === 'list' ? Math.max(120, Math.ceil(items.length / 3) * 120) : 320;
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const x = c.getContext('2d');
    x.scale(2, 2);
    const acc = accentsNow(), col = i => spec.colorful ? acc[i % 6] : acc[0];
    const top = items.filter(i => !i.level), n = Math.max(1, top.length);
    if (spec.layout === 'list') {
      const per = Math.min(3, n), bw = (W - 20 * (per + 1)) / per, bh = 90;
      top.forEach((it, i) => box(x, 20 + (i % per) * (bw + 20), 15 + Math.floor(i / per) * 110, bw, bh, col(i), it.text, 4));
    } else if (spec.layout === 'process') {
      const bw = Math.min(150, (W - 40 * n) / n), bh = 90, y = H / 2 - bh / 2;
      top.forEach((it, i) => {
        const bx = 20 + i * (bw + 40);
        box(x, bx, y, bw, bh, col(i), it.text, 6);
        if (i < n - 1) { x.fillStyle = DocStyles.shadeHex(acc[0], 0.5); x.beginPath(); x.moveTo(bx + bw + 8, y + bh / 2 - 12); x.lineTo(bx + bw + 30, y + bh / 2); x.lineTo(bx + bw + 8, y + bh / 2 + 12); x.fill(); }
      });
    } else if (spec.layout === 'cycle' || spec.layout === 'radial') {
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 55, bw = 110, bh = 60;
      const ring = spec.layout === 'radial' ? top.slice(1) : top;
      if (spec.layout === 'radial' && top[0]) box(x, cx - 60, cy - 40, 120, 80, acc[0], top[0].text, 40);
      ring.forEach((it, i) => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / Math.max(1, ring.length);
        const bx = cx + R * Math.cos(a) - bw / 2, by = cy + R * Math.sin(a) - bh / 2;
        if (spec.layout === 'radial') { x.strokeStyle = DocStyles.shadeHex(acc[0], 0.4); x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(bx + bw / 2, by + bh / 2); x.stroke(); }
        else { const a2 = a + Math.PI / Math.max(1, ring.length); x.fillStyle = DocStyles.shadeHex(acc[0], 0.5); x.beginPath(); x.arc(cx + R * Math.cos(a2), cy + R * Math.sin(a2), 8, 0, 7); x.fill(); }
        box(x, bx, by, bw, bh, col(i + 1), it.text, 30);
      });
    } else if (spec.layout === 'hierarchy') {
      const root = spec.items[0];
      const kids = [];
      spec.items.slice(1).forEach(it => { if (it.level === 1) kids.push({ ...it, kids: [] }); else if (it.level >= 2 && kids.length) kids.at(-1).kids.push(it); });
      if (root) box(x, W / 2 - 75, 15, 150, 60, acc[0], root.text, 4);
      const kw = Math.min(140, (W - 20) / Math.max(1, kids.length) - 20);
      kids.forEach((k, i) => {
        const kx = 10 + i * (W - 20) / kids.length + ((W - 20) / kids.length - kw) / 2;
        x.strokeStyle = '#7f7f7f'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(W / 2, 75); x.lineTo(W / 2, 100); x.lineTo(kx + kw / 2, 100); x.lineTo(kx + kw / 2, 120); x.stroke();
        box(x, kx, 120, kw, 55, col(i + 1), k.text, 4);
        k.kids.forEach((g, j) => { x.beginPath(); x.moveTo(kx + 10, 175); x.lineTo(kx + 10, 205 + j * 55 + 22); x.lineTo(kx + 20, 205 + j * 55 + 22); x.stroke(); box(x, kx + 20, 205 + j * 55, kw - 20, 45, DocStyles.shadeHex(col(i + 1), 0.35), g.text, 4, '#000'); });
      });
    } else if (spec.layout === 'pyramid') {
      const bh = (H - 30) / n;
      top.forEach((it, i) => {
        const y = 15 + i * bh, wTop = (W - 100) * i / n, wBot = (W - 100) * (i + 1) / n;
        x.fillStyle = col(i);
        x.beginPath(); x.moveTo(W / 2 - wTop / 2, y); x.lineTo(W / 2 + wTop / 2, y); x.lineTo(W / 2 + wBot / 2, y + bh - 3); x.lineTo(W / 2 - wBot / 2, y + bh - 3); x.closePath(); x.fill();
        x.fillStyle = '#fff'; x.font = 'bold 15px Calibri, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(it.text, W / 2, y + bh * 0.62);
      });
    } else if (spec.layout === 'venn') {
      const R = Math.min(130, W / (n + 1)), cy = H / 2;
      top.forEach((it, i) => {
        const cx = W / 2 + (i - (n - 1) / 2) * R * 1.1;
        x.globalAlpha = 0.6; x.fillStyle = col(i); x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill(); x.globalAlpha = 1;
        x.fillStyle = '#fff'; x.font = 'bold 16px Calibri, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(it.text, cx, cy);
      });
    }
    return { canvas: c, w: W };
  }
  async function open(target) {
    const s = target ? JSON.parse(target.dataset.spec) : { layout: 'process', colorful: false, items: [{ text: 'Passo 1', level: 0 }, { text: 'Passo 2', level: 0 }, { text: 'Passo 3', level: 0 }] };
    const toText = it => it.map(i => '\t'.repeat(i.level) + i.text).join('\n');
    const res = await dialog({
      title: target ? 'Editar Gráfico SmartArt' : 'Escolher um Gráfico SmartArt',
      width: 620,
      body: `<div class="sa-layout"><div class="sa-cats">${LAYOUTS.map(([k, cat, name]) => `<label class="sa-cat"><input type="radio" name="sa-l" value="${k}"${k === s.layout ? ' checked' : ''}><b>${name}</b><small>${cat}</small></label>`).join('')}</div>
        <div class="sa-right"><label>Escreva o texto aqui (uma linha por forma; Tab para subníveis):<textarea id="sa-text" style="height:110px">${esc(toText(s.items))}</textarea></label>${chk('sa-color', 'Colorido (cores de destaque variadas)', s.colorful)}<div class="sa-preview" id="sa-preview"></div></div></div>`,
      onOpen: ov => {
        const ta = $('#sa-text', ov);
        ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); const p = ta.selectionStart; ta.setRangeText('\t', p, p, 'end'); upd(); } });
        const upd = () => { const { canvas } = render(collect(ov)); canvas.style.width = '100%'; $('#sa-preview', ov).replaceChildren(canvas); };
        ov.addEventListener('input', upd); ov.addEventListener('change', upd); upd();
      },
      buttons: [{ label: 'OK', primary: true, value: collect }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    const { canvas } = render(res);
    insertOrReplace(canvasToImg(canvas, Math.min(editor.clientWidth, 520), 'smartart', res, 'SmartArt'), target);
    function collect(ov) { return { layout: $('input[name=sa-l]:checked', ov).value, colorful: $('#sa-color', ov).checked, items: $('#sa-text', ov).value.split('\n').filter(l => l.trim()).map(l => ({ text: l.trim(), level: l.match(/^\t*/)[0].length })) }; }
  }
  return { open, render };
})();

/* =========================================================
   Gráficos
   ========================================================= */
const Charts = (() => {
  const TYPES = [['column', 'Colunas'], ['bar', 'Barras'], ['line', 'Linhas'], ['pie', 'Circular'], ['area', 'Área'], ['scatter', 'XY (Dispersão)'], ['doughnut', 'Anel']];
  const SAMPLE = 'Categoria;Série 1;Série 2;Série 3\nCategoria 1;4,3;2,4;2\nCategoria 2;2,5;4,4;2\nCategoria 3;3,5;1,8;3\nCategoria 4;4,5;2,8;5';
  const parse = csv => {
    const rows = csv.trim().split(/\r?\n/).map(r => r.split(/[;\t]/).map(c => c.trim()));
    const series = rows[0].slice(1);
    const cats = rows.slice(1).map(r => r[0]);
    const data = series.map((_, si) => rows.slice(1).map(r => num(r[si + 1]) || 0));
    return { series, cats, data };
  };
  function render(spec) {
    const { series, cats, data } = parse(spec.data);
    const W = 560, H = 320, c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const x = c.getContext('2d');
    x.scale(2, 2);
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#868686'; x.strokeRect(0.5, 0.5, W - 1, H - 1);
    const acc = accentsNow();
    x.font = '12px Calibri, sans-serif';
    x.fillStyle = '#000';
    let top = 15;
    if (spec.title) { x.font = 'bold 16px Calibri, sans-serif'; x.textAlign = 'center'; x.fillText(spec.title, W / 2, 26); top = 40; x.font = '12px Calibri, sans-serif'; }
    const legendW = spec.legend ? 100 : 0;
    const pie = spec.type === 'pie' || spec.type === 'doughnut';
    // legenda
    if (spec.legend) {
      const labels = pie ? cats : series;
      labels.forEach((l, i) => { const y = top + 20 + i * 20; x.fillStyle = acc[i % 6]; x.fillRect(W - legendW + 4, y - 9, 10, 10); x.fillStyle = '#000'; x.textAlign = 'left'; x.fillText(l, W - legendW + 20, y); });
    }
    if (pie) {
      const vals = data[0] || [], total = vals.reduce((a, b) => a + b, 0) || 1;
      const cx = (W - legendW) / 2, cy = (H + top) / 2, R = Math.min(W - legendW, H - top) / 2 - 20;
      let a = -Math.PI / 2;
      vals.forEach((v, i) => {
        const a2 = a + v / total * Math.PI * 2;
        x.fillStyle = acc[i % 6]; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a, a2); x.closePath(); x.fill();
        x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke();
        if (spec.labels) { const m = (a + a2) / 2; x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = 'bold 12px Calibri'; x.fillText(Math.round(v / total * 100) + '%', cx + R * 0.65 * Math.cos(m), cy + R * 0.65 * Math.sin(m)); }
        a = a2;
      });
      if (spec.type === 'doughnut') { x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, R * 0.5, 0, 7); x.fill(); }
      return { canvas: c, w: W };
    }
    const L = 45, R = W - legendW - 15, T = top + 5, B = H - 35;
    const all = data.flat();
    const maxV = Math.max(0, ...all), minV = Math.min(0, ...all);
    const step = (() => { const raw = (maxV - minV) / 5 || 1, p = 10 ** Math.floor(Math.log10(raw)), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; })();
    const hi = Math.ceil(maxV / step) * step || step, lo = Math.floor(minV / step) * step;
    const horiz = spec.type === 'bar';
    const valPos = v => horiz ? L + (v - lo) / (hi - lo) * (R - L) : B - (v - lo) / (hi - lo) * (B - T);
    // grelha e eixos
    x.strokeStyle = '#d9d9d9'; x.lineWidth = 1; x.fillStyle = '#404040'; x.font = '11px Calibri, sans-serif';
    for (let v = lo; v <= hi + 1e-9; v += step) {
      const p = Math.round(valPos(v)) + 0.5;
      x.beginPath(); if (horiz) { x.moveTo(p, T); x.lineTo(p, B); } else { x.moveTo(L, p); x.lineTo(R, p); } x.stroke();
      x.textAlign = horiz ? 'center' : 'right';
      x.fillText(fmt(Math.round(v * 100) / 100), horiz ? p : L - 6, horiz ? B + 14 : p + 4);
    }
    x.strokeStyle = '#868686'; x.beginPath(); x.moveTo(L, T); x.lineTo(L, B); x.lineTo(R, B); x.stroke();
    const nC = cats.length, nS = series.length;
    const slot = (horiz ? B - T : R - L) / nC;
    cats.forEach((cat, ci) => { x.fillStyle = '#404040'; x.textAlign = horiz ? 'right' : 'center'; if (horiz) x.fillText(cat, L - 6, T + slot * ci + slot / 2 + 4); else x.fillText(cat, L + slot * ci + slot / 2, B + 16); });
    if (spec.type === 'column' || spec.type === 'bar') {
      const bw = slot * 0.7 / nS;
      data.forEach((vals, si) => vals.forEach((v, ci) => {
        x.fillStyle = acc[si % 6];
        const s0 = slot * ci + slot * 0.15 + si * bw, z0 = valPos(0), z1 = valPos(v);
        if (horiz) x.fillRect(Math.min(z0, z1), T + s0, Math.abs(z1 - z0), bw - 1);
        else x.fillRect(L + s0, Math.min(z0, z1), bw - 1, Math.abs(z1 - z0));
        if (spec.labels) { x.fillStyle = '#000'; x.textAlign = 'center'; x.fillText(fmt(v), horiz ? z1 + 12 : L + s0 + bw / 2, horiz ? T + s0 + bw / 2 + 4 : z1 - 4); }
      }));
    } else {
      data.forEach((vals, si) => {
        const pts = vals.map((v, ci) => [L + slot * ci + slot / 2, valPos(v)]);
        if (spec.type === 'area') { x.globalAlpha = 0.75; x.fillStyle = acc[si % 6]; x.beginPath(); x.moveTo(pts[0][0], valPos(0)); pts.forEach(p => x.lineTo(...p)); x.lineTo(pts.at(-1)[0], valPos(0)); x.fill(); x.globalAlpha = 1; }
        if (spec.type === 'line') { x.strokeStyle = acc[si % 6]; x.lineWidth = 2.5; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(...p) : x.moveTo(...p))); x.stroke(); }
        if (spec.type === 'line' || spec.type === 'scatter') pts.forEach(p => { x.fillStyle = acc[si % 6]; x.beginPath(); x.arc(p[0], p[1], 4, 0, 7); x.fill(); });
      });
    }
    return { canvas: c, w: W };
  }
  async function open(target) {
    const s = target ? JSON.parse(target.dataset.spec) : { type: 'column', title: '', legend: true, labels: false, data: SAMPLE };
    const res = await dialog({
      title: target ? 'Editar Dados do Gráfico' : 'Inserir Gráfico',
      width: 640,
      body: `<div class="sa-layout"><div class="sa-cats">${TYPES.map(([k, l]) => `<label class="sa-cat"><input type="radio" name="ch-t" value="${k}"${k === s.type ? ' checked' : ''}><b>${l}</b></label>`).join('')}</div>
        <div class="sa-right"><label>Título do gráfico:<input id="ch-title" value="${esc(s.title)}"></label><label>Dados (folha de cálculo: separe colunas com ; ou Tab):<textarea id="ch-data" style="height:100px;font-family:Consolas,monospace">${esc(s.data)}</textarea></label>
        <div class="ms-row">${chk('ch-legend', 'Legenda', s.legend)}${chk('ch-labels', 'Rótulos de Dados', s.labels)}</div><div class="sa-preview" id="ch-preview"></div></div></div>`,
      onOpen: ov => {
        const ta = $('#ch-data', ov);
        ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); const p = ta.selectionStart; ta.setRangeText('\t', p, p, 'end'); } });
        const upd = () => { try { const { canvas } = render(collect(ov)); canvas.style.width = '100%'; $('#ch-preview', ov).replaceChildren(canvas); } catch { /* dados incompletos */ } };
        ov.addEventListener('input', upd); ov.addEventListener('change', upd); upd();
      },
      buttons: [{ label: 'OK', primary: true, value: collect }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    const { canvas } = render(res);
    insertOrReplace(canvasToImg(canvas, Math.min(editor.clientWidth, 480), 'chart', res, res.title || 'Gráfico'), target);
    function collect(ov) { return { type: $('input[name=ch-t]:checked', ov).value, title: $('#ch-title', ov).value, legend: $('#ch-legend', ov).checked, labels: $('#ch-labels', ov).checked, data: $('#ch-data', ov).value }; }
  }
  return { open, render };
})();

/* Duplo clique numa imagem gerada reabre o editor */
editor.addEventListener('dblclick', e => {
  const i = e.target;
  if (i.tagName !== 'IMG') return;
  if (i.dataset.kind === 'wordart') WordArt.dialogFor(null, i);
  else if (i.dataset.kind === 'smartart') SmartArt.open(i);
  else if (i.dataset.kind === 'chart') Charts.open(i);
  else { selectImage(i); selectTab('img-format'); }
});

/* =========================================================
   ClipArt
   ========================================================= */
const CLIPART = [
  ['Pessoa', 'pessoa homem mulher pessoas', '<circle cx="50" cy="28" r="16" fill="#f2c69b"/><path d="M22 95c0-25 12-40 28-40s28 15 28 40z" fill="#4f81bd"/>'],
  ['Casa', 'casa lar edifício', '<path d="M15 50L50 18l35 32z" fill="#c0504d"/><rect x="24" y="48" width="52" height="40" fill="#f2dcdb"/><rect x="44" y="62" width="12" height="26" fill="#8c3a37"/><rect x="29" y="56" width="10" height="10" fill="#8db3e2"/><rect x="62" y="56" width="10" height="10" fill="#8db3e2"/>'],
  ['Árvore', 'árvore natureza planta', '<rect x="45" y="60" width="10" height="30" fill="#8b5a2b"/><circle cx="50" cy="40" r="28" fill="#5aa04a"/><circle cx="35" cy="50" r="14" fill="#4a8a3a"/><circle cx="66" cy="48" r="14" fill="#6ab45a"/>'],
  ['Sol', 'sol tempo verão', '<circle cx="50" cy="50" r="20" fill="#fcc419"/>' + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${50 + 26 * Math.cos(a)} ${50 + 26 * Math.sin(a)}L${50 + 38 * Math.cos(a)} ${50 + 38 * Math.sin(a)}" stroke="#f08c00" stroke-width="5" stroke-linecap="round"/>`; }).join('')],
  ['Estrela', 'estrela prémio', '<path d="M50 10l11 26 28 2-21 18 7 28-25-15-25 15 7-28-21-18 28-2z" fill="#ffc000" stroke="#bf9000" stroke-width="2"/>'],
  ['Coração', 'coração amor', '<path d="M50 88S12 62 12 36a20 20 0 0138-8 20 20 0 0138 8c0 26-38 52-38 52z" fill="#e03131"/>'],
  ['Livro', 'livro leitura escola', '<path d="M12 22c14-6 26-6 38 2v64c-12-8-24-8-38-2z" fill="#4f81bd"/><path d="M88 22c-14-6-26-6-38 2v64c12-8 24-8 38-2z" fill="#365f91"/><path d="M20 34h22M20 44h22M58 34h22M58 44h22" stroke="#fff" stroke-width="2"/>'],
  ['Computador', 'computador pc tecnologia', '<rect x="14" y="16" width="72" height="50" rx="4" fill="#404040"/><rect x="19" y="21" width="62" height="40" fill="#8db3e2"/><rect x="40" y="66" width="20" height="10" fill="#7f7f7f"/><rect x="28" y="76" width="44" height="6" rx="2" fill="#595959"/>'],
  ['Telefone', 'telefone contacto', '<path d="M28 14c6-2 12 12 10 18-2 4-8 4-6 10 4 10 12 18 22 22 6 2 6-4 10-6 6-2 20 4 18 10-4 14-18 16-30 10C30 70 18 50 16 36c-2-10 4-20 12-22z" fill="#2b8a3e"/>'],
  ['Carro', 'carro automóvel transporte', '<path d="M10 62l10-22h56l14 22v14H10z" fill="#c0504d"/><rect x="28" y="44" width="18" height="14" fill="#cfe6ff"/><rect x="52" y="44" width="18" height="14" fill="#cfe6ff"/><circle cx="28" cy="78" r="9" fill="#262626"/><circle cx="72" cy="78" r="9" fill="#262626"/>'],
  ['Avião', 'avião viagem transporte', '<path d="M50 8c4 0 6 6 6 14v18l32 18v8L56 56v20l10 8v6l-16-4-16 4v-6l10-8V56L12 66v-8l32-18V22c0-8 2-14 6-14z" fill="#7f7f7f"/>'],
  ['Flor', 'flor natureza primavera', '<path d="M50 60v32" stroke="#5aa04a" stroke-width="5"/>' + Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3; return `<ellipse cx="${50 + 16 * Math.cos(a)}" cy="${38 + 16 * Math.sin(a)}" rx="12" ry="8" transform="rotate(${i * 60} ${50 + 16 * Math.cos(a)} ${38 + 16 * Math.sin(a)})" fill="#f783ac"/>`; }).join('') + '<circle cx="50" cy="38" r="10" fill="#ffd43b"/>'],
  ['Música', 'música nota som', '<path d="M38 20l40-10v56" fill="none" stroke="#212529" stroke-width="6"/><path d="M38 20v58" stroke="#212529" stroke-width="6"/><ellipse cx="30" cy="78" rx="12" ry="9" fill="#212529"/><ellipse cx="70" cy="66" rx="12" ry="9" fill="#212529"/>'],
  ['Lâmpada', 'lâmpada ideia luz', '<path d="M50 10a28 28 0 00-16 51v13h32V61a28 28 0 00-16-51z" fill="#ffe066" stroke="#f08c00" stroke-width="2"/><rect x="36" y="76" width="28" height="12" rx="3" fill="#868e96"/>'],
  ['Relógio', 'relógio tempo hora', '<circle cx="50" cy="50" r="38" fill="#fff" stroke="#343a40" stroke-width="6"/><path d="M50 50V24M50 50l18 10" stroke="#343a40" stroke-width="5" stroke-linecap="round"/>'],
  ['Seta', 'seta direcção', '<path d="M10 40h50V20l30 30-30 30V60H10z" fill="#4f81bd"/>'],
  ['Visto', 'visto correcto ok', '<circle cx="50" cy="50" r="40" fill="#2f9e44"/><path d="M30 52l14 14 28-30" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'],
  ['Envelope', 'envelope correio mensagem', '<rect x="10" y="24" width="80" height="54" fill="#fff" stroke="#8a6a3a" stroke-width="3"/><path d="M10 24l40 30 40-30" fill="none" stroke="#8a6a3a" stroke-width="3"/>'],
];
function clipartPane() {
  const body = TaskPane.open('clipart', 'ClipArt', `<label>Procurar:<div class="ms-row"><input id="ca-q" placeholder="ex.: casa, pessoa"><button class="std" id="ca-go">Ir</button></div></label><div class="ca-grid" id="ca-grid"></div><div class="cb-hint">Clique numa imagem para a inserir.</div>`, { width: 240 });
  const show = q => {
    const list = CLIPART.filter(([n, k]) => !q || (n + ' ' + k).toLowerCase().includes(q.toLowerCase()));
    $('#ca-grid', body).innerHTML = list.map(([n, , svg]) => `<button class="ca-item" data-name="${n}" title="${n}"><svg viewBox="0 0 100 100">${svg}</svg></button>`).join('') || '<div class="om-empty">Nenhum resultado.</div>';
    $$('.ca-item', body).forEach(b => b.addEventListener('click', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100">${CLIPART.find(c => c[0] === b.dataset.name)[2]}</svg>`;
      const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 400; c.getContext('2d').drawImage(im, 0, 0, 400, 400); exec('insertHTML', `<img src="${c.toDataURL()}" style="width:120px" alt="${esc(b.dataset.name)}">`); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }));
  };
  $('#ca-go', body).onclick = () => show($('#ca-q', body).value);
  $('#ca-q', body).addEventListener('keydown', e => { if (e.key === 'Enter') show(e.target.value); });
  show('');
}

/* =========================================================
   Equações (MathML) + conversão para OMML (.docx)
   ========================================================= */
const Equations = (() => {
  const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', Pi: 'Π', infty: '∞', pm: '±', times: '×', div: '÷', leq: '≤', geq: '≥', neq: '≠', approx: '≈', cdot: '·', to: '→', partial: '∂', nabla: '∇', in: '∈', forall: '∀', exists: '∃', cos: 'cos', sin: 'sin', tan: 'tan', log: 'log', ln: 'ln', lim: 'lim' };
  const BUILTIN = [
    ['Área do Círculo', 'A=\\pi r^{2}'],
    ['Teorema Binomial', '(x+a)^{n}=\\sum_{k=0}^{n}\\frac{n!}{k!(n-k)!}x^{k}a^{n-k}'],
    ['Fórmula Resolvente', 'x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}'],
    ['Teorema de Pitágoras', 'a^{2}+b^{2}=c^{2}'],
    ['Série de Fourier', 'f(x)=a_{0}+\\sum_{n=1}^{\\infty}(a_{n}\\cos\\frac{n\\pi x}{L}+b_{n}\\sin\\frac{n\\pi x}{L})'],
    ['Série de Taylor', 'e^{x}=1+\\frac{x}{1!}+\\frac{x^{2}}{2!}+\\frac{x^{3}}{3!}+\\cdots'],
    ['Identidade Trigonométrica', '\\sin^{2}\\theta+\\cos^{2}\\theta=1'],
    ['Integral', '\\int_{a}^{b}f(x)dx=F(b)-F(a)'],
  ];
  // analisador LaTeX simplificado -> MathML
  function toMathML(src) {
    let i = 0;
    const peek = () => src[i];
    const group = () => {
      if (peek() === '{') { i++; const out = seq('}'); i++; return out; }
      return atom();
    };
    const atom = () => {
      const c = src[i];
      if (c === '\\') {
        i++;
        let name = '';
        while (i < src.length && /[a-zA-Z]/.test(src[i])) name += src[i++];
        if (!name) { const ch = src[i++]; return `<mo>${esc(ch)}</mo>`; }
        if (name === 'frac') { const a = group(), b = group(); return `<mfrac><mrow>${a}</mrow><mrow>${b}</mrow></mfrac>`; }
        if (name === 'sqrt') { if (peek() === '[') { i++; let d = ''; while (src[i] !== ']') d += src[i++]; i++; return `<mroot><mrow>${group()}</mrow><mn>${esc(d)}</mn></mroot>`; } return `<msqrt><mrow>${group()}</mrow></msqrt>`; }
        if (name === 'sum' || name === 'int' || name === 'prod') return `<mo largeop="true">${{ sum: '∑', int: '∫', prod: '∏' }[name]}</mo>`;
        if (name === 'cdots') return '<mo>⋯</mo>';
        if (name === 'left' || name === 'right') return atom();
        const g = GREEK[name];
        if (g && g.length > 1) return `<mi mathvariant="normal">${g}</mi>`;
        return g ? (/[α-ωΑ-Ω∞]/.test(g) ? `<mi>${g}</mi>` : `<mo>${g}</mo>`) : `<mi>${esc(name)}</mi>`;
      }
      i++;
      if (/\d/.test(c)) { let n = c; while (/[\d.,]/.test(src[i] || '')) n += src[i++]; return `<mn>${n}</mn>`; }
      if (/[a-zA-Z]/.test(c)) return `<mi>${c}</mi>`;
      if (c === ' ') return '';
      return `<mo>${esc(c)}</mo>`;
    };
    const seq = end => {
      let out = '';
      while (i < src.length && src[i] !== end) {
        let base = atom();
        let sub = null, sup = null;
        while (src[i] === '_' || src[i] === '^') {
          const k = src[i++];
          const g = group();
          if (k === '_') sub = g; else sup = g;
        }
        if (sub !== null && sup !== null) {
          base = /largeop/.test(base) ? `<munderover>${base}<mrow>${sub}</mrow><mrow>${sup}</mrow></munderover>` : `<msubsup>${base}<mrow>${sub}</mrow><mrow>${sup}</mrow></msubsup>`;
          if (/∫/.test(base)) base = base.replace('munderover', 'msubsup').replace('</munderover>', '</msubsup>');
        } else if (sub !== null) base = `<msub>${base}<mrow>${sub}</mrow></msub>`;
        else if (sup !== null) base = `<msup>${base}<mrow>${sup}</mrow></msup>`;
        out += base;
      }
      return out;
    };
    return `<math display="inline"><mrow>${seq(undefined)}</mrow></math>`;
  }
  const html = (tex, name) => `<span class="equation" contenteditable="false" data-tex="${esc(tex)}" title="${esc(name || 'Equação')}">${toMathML(tex)}</span>&nbsp;`;

  // MathML -> OMML (subconjunto)
  function toOmml(node) {
    const kids = n => [...n.children].map(toOmml).join('');
    const run = t => `<m:r><m:t xml:space="preserve">${String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</m:t></m:r>`;
    const tag = node.localName;
    const k = [...node.children];
    switch (tag) {
      case 'math': case 'mrow': return kids(node);
      case 'mi': case 'mn': case 'mo': case 'mtext': return /[∑∏]/.test(node.textContent) ? `<m:nary><m:naryPr><m:chr m:val="${node.textContent}"/></m:naryPr><m:sub/><m:sup/><m:e/></m:nary>` : run(node.textContent);
      case 'mfrac': return `<m:f><m:num>${toOmml(k[0])}</m:num><m:den>${toOmml(k[1])}</m:den></m:f>`;
      case 'msqrt': return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${kids(node)}</m:e></m:rad>`;
      case 'mroot': return `<m:rad><m:deg>${toOmml(k[1])}</m:deg><m:e>${toOmml(k[0])}</m:e></m:rad>`;
      case 'msup': return `<m:sSup><m:e>${toOmml(k[0])}</m:e><m:sup>${toOmml(k[1])}</m:sup></m:sSup>`;
      case 'msub': return `<m:sSub><m:e>${toOmml(k[0])}</m:e><m:sub>${toOmml(k[1])}</m:sub></m:sSub>`;
      case 'msubsup': case 'munderover': {
        const op = k[0].textContent;
        if (/[∑∫∏]/.test(op)) return `<m:nary><m:naryPr><m:chr m:val="${op}"/>${op === '∫' ? '<m:limLoc m:val="subSup"/>' : ''}</m:naryPr><m:sub>${toOmml(k[1])}</m:sub><m:sup>${toOmml(k[2])}</m:sup><m:e/></m:nary>`;
        return `<m:sSubSup><m:e>${toOmml(k[0])}</m:e><m:sub>${toOmml(k[1])}</m:sub><m:sup>${toOmml(k[2])}</m:sup></m:sSubSup>`;
      }
      default: return run(node.textContent);
    }
  }
  // OMML -> LaTeX (para reabrir .docx)
  function fromOmml(el) {
    const kids = n => [...n.children].map(fromOmml).join('');
    const ch = (n, name) => [...n.children].find(c => c.localName === name);
    switch (el.localName) {
      case 'oMath': case 'oMathPara': case 'e': case 'num': case 'den': case 'sub': case 'sup': case 'deg': return kids(el);
      case 'r': return [...el.children].filter(c => c.localName === 't').map(t => t.textContent.replace(/π/g, '\\pi ').replace(/∞/g, '\\infty ').replace(/±/g, '\\pm ')).join('');
      case 'f': return `\\frac{${fromOmml(ch(el, 'num'))}}{${fromOmml(ch(el, 'den'))}}`;
      case 'rad': { const d = ch(el, 'deg'); const dt = d ? fromOmml(d) : ''; return dt ? `\\sqrt[${dt}]{${fromOmml(ch(el, 'e'))}}` : `\\sqrt{${fromOmml(ch(el, 'e'))}}`; }
      case 'sSup': return `{${fromOmml(ch(el, 'e'))}}^{${fromOmml(ch(el, 'sup'))}}`;
      case 'sSub': return `{${fromOmml(ch(el, 'e'))}}_{${fromOmml(ch(el, 'sub'))}}`;
      case 'sSubSup': return `{${fromOmml(ch(el, 'e'))}}_{${fromOmml(ch(el, 'sub'))}}^{${fromOmml(ch(el, 'sup'))}}`;
      case 'nary': { const pr = ch(el, 'naryPr'); const c = pr && [...pr.children].find(x => x.localName === 'chr'); const sym = c ? c.getAttribute('m:val') || c.getAttributeNS(c.namespaceURI, 'val') : '∫'; return `${{ '∑': '\\sum', '∏': '\\prod' }[sym] || '\\int'}_{${fromOmml(ch(el, 'sub') || el)}}^{${fromOmml(ch(el, 'sup') || el)}}${fromOmml(ch(el, 'e'))}`; }
      case 'd': return `(${[...el.children].filter(c => c.localName === 'e').map(fromOmml).join(',')})`;
      default: return [...el.children].length ? kids(el) : '';
    }
  }

  async function newEquation(target) {
    const tex = target?.dataset.tex || 'x=\\frac{a}{b}';
    const res = await dialog({
      title: 'Ferramentas de Equação - Estrutura',
      width: 520,
      body: `<div class="eq-tools">${['\\frac{}{}', '^{}', '_{}', '\\sqrt{}', '\\sum_{}^{}', '\\int_{}^{}', '\\pi', '\\infty', '\\pm', '\\leq', '\\geq', '\\neq', '\\alpha', '\\beta', '\\theta', '\\Delta'].map(t => `<button class="std eq-btn" data-ins="${esc(t)}">${toMathML(t.replace(/\{\}/g, '{□}'))}</button>`).join('')}</div>
        <label>Equação (notação linear):<input id="eq-src" value="${esc(tex)}" style="font-family:Consolas,monospace"></label><div class="eq-preview" id="eq-prev"></div>`,
      onOpen: ov => {
        const inp = $('#eq-src', ov);
        const upd = () => { $('#eq-prev', ov).innerHTML = toMathML(inp.value).replace('display="inline"', 'display="block"'); };
        $$('.eq-btn', ov).forEach(b => b.addEventListener('click', () => { const p = inp.selectionStart; inp.setRangeText(b.dataset.ins, p, inp.selectionEnd, 'end'); inp.focus(); upd(); }));
        inp.addEventListener('input', upd);
        upd();
      },
      buttons: [{ label: 'OK', primary: true, value: ov => $('#eq-src', ov).value.trim() }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    if (target) { target.outerHTML = html(res).replace('&nbsp;', ''); changed(); }
    else exec('insertHTML', html(res));
  }

  DD_HOOKS['dd-equation'] = dd => {
    dd.innerHTML = `<div class="dd-title">Incorporadas</div>${BUILTIN.map(([n, t], i) => `<button class="dd-item eq-item" data-cmd="equation" data-arg="${i}"><span class="dd-two"><b>${n}</b><span class="eq-sample">${toMathML(t)}</span></span></button>`).join('')}<div class="dd-sep"></div><button class="dd-item" data-cmd="newEquation"><i class="ic" data-icon="equation"></i>Inserir Nova Equação</button>`;
  };
  editor.addEventListener('dblclick', e => { const eq = e.target.closest?.('.equation'); if (eq) newEquation(eq); });
  return { toMathML, toOmml, fromOmml, newEquation, html, BUILTIN };
})();

/* =========================================================
   Peças Rápidas e Campos
   ========================================================= */
const QuickParts = (() => {
  const load = () => { try { return JSON.parse(localStorage.getItem('wc-quickparts') || '[]'); } catch { return []; } };
  const store = l => localStorage.setItem('wc-quickparts', JSON.stringify(l));
  const field = (f, extra = '') => `<span class="wc-field" data-field="${f}" contenteditable="false"${extra}>${esc(Pager.fieldValue(f, Pager.currentIndex()))}</span>`;
  DD_HOOKS['dd-quickparts'] = dd => {
    const parts = load();
    dd.innerHTML = `${parts.length ? `<div class="dd-title">Geral</div>${parts.map((p, i) => `<button class="dd-item dd-desc" data-cmd="qpInsert" data-arg="${i}"><span class="dd-two"><b>${esc(p.name)}</b><small>${esc(p.text.slice(0, 60))}</small></span></button>`).join('')}<div class="dd-sep"></div>` : ''}
      <div class="dd-title">Propriedade do Documento</div>${[['AUTHOR', 'Autor'], ['TITLE', 'Título'], ['SUBJECT', 'Assunto'], ['COMPANY', 'Empresa'], ['KEYWORDS', 'Palavras-chave']].map(([f, l]) => `<button class="dd-item" data-cmd="insertField" data-arg="${f}">${l}</button>`).join('')}
      <div class="dd-sep"></div><button class="dd-item" data-cmd="fieldDialog"><i class="ic" data-icon="insertfield"></i>Campo...</button>
      <button class="dd-item" data-cmd="qpOrganizer"><i class="ic" data-icon="quickparts"></i>Organizador de Blocos Modulares...</button>
      <button class="dd-item" data-cmd="qpSave"><i class="ic" data-icon="save"></i>Guardar Selecção na Galeria de Peças Rápidas...</button>`;
  };
  async function save() {
    const r = currentRange();
    if (!r || r.collapsed) return infoBox('Seleccione o conteúdo que pretende guardar como peça rápida.');
    const div = document.createElement('div');
    div.append(r.cloneContents());
    const name = await dialog({ title: 'Criar Novo Bloco Modular', width: 320, body: `<label>Nome:<input id="qp-n" value="${esc(r.toString().trim().split(/\s+/).slice(0, 3).join(' '))}"></label><label>Galeria:<select><option>Peças Rápidas</option></select></label>`, buttons: [{ label: 'OK', primary: true, value: ov => $('#qp-n', ov).value.trim() }, { label: 'Cancelar', value: null }] });
    if (!name) return;
    const l = load();
    l.push({ name, html: cleanFragment(div.innerHTML), text: r.toString() });
    store(l);
  }
  const cleanFragment = h => { const d = document.createElement('div'); d.innerHTML = h; Pager.clearPushes(d); return d.innerHTML; };
  async function organizer() {
    const l = load();
    const res = await dialog({ title: 'Organizador de Blocos Modulares', width: 420, body: l.length ? `<select id="qp-l" size="8" style="height:150px">${l.map((p, i) => `<option value="${i}">${esc(p.name)} — ${esc(p.text.slice(0, 40))}</option>`).join('')}</select>` : '<p>Não existem blocos modulares.</p>', buttons: l.length ? [{ label: 'Inserir', primary: true, value: ov => ({ a: 'ins', i: +$('#qp-l', ov).value }) }, { label: 'Eliminar', value: ov => ({ a: 'del', i: +$('#qp-l', ov).value }) }, { label: 'Fechar', value: null }] : [{ label: 'Fechar', primary: true, value: null }] });
    if (!res || isNaN(res.i)) return;
    if (res.a === 'ins') exec('insertHTML', sanitize(l[res.i].html));
    else { l.splice(res.i, 1); store(l); organizer(); }
  }
  async function fieldDialog() {
    const fields = [['PAGE', 'Page', 'Número da página actual'], ['NUMPAGES', 'NumPages', 'Número de páginas do documento'], ['DATE', 'Date', 'Data de hoje'], ['TIME', 'Time', 'Hora actual'], ['AUTHOR', 'Author', 'Nome do autor'], ['TITLE', 'Title', 'Título do documento'], ['SUBJECT', 'Subject', 'Assunto do documento'], ['FILENAME', 'FileName', 'Nome do ficheiro'], ['USERNAME', 'UserName', 'Nome do utilizador'], ['NUMWORDS', 'NumWords', 'Número de palavras']];
    const f = await dialog({ title: 'Campo', width: 420, body: `<div class="two"><label>Nomes de campos:<select id="fl" size="10" style="height:170px">${fields.map(([k, n], i) => `<option value="${k}"${i ? '' : ' selected'}>${n}</option>`).join('')}</select></label><div id="fl-desc" style="padding-top:20px;color:#444"></div></div>`, onOpen: ov => { const s = $('#fl', ov); const u = () => { $('#fl-desc', ov).textContent = fields.find(x => x[0] === s.value)[2]; }; s.onchange = u; u(); }, buttons: [{ label: 'OK', primary: true, value: ov => $('#fl', ov).value }, { label: 'Cancelar', value: null }] });
    if (f) exec('insertHTML', field(f) + '&#8203;');
  }
  return { save, organizer, fieldDialog, field, load };
})();

/* =========================================================
   Cabeçalho, rodapé e números de página
   ========================================================= */
const HF_TEMPLATES = {
  blank: () => '<p>[Escreva texto]</p>',
  three: () => '<p data-tabs="C:7.5,R:15">[Escreva texto]<span class="wc-tab" contenteditable="false">\t</span>[Escreva texto]<span class="wc-tab" contenteditable="false">\t</span>[Escreva texto]</p>',
  title: () => `<p style="text-align:right;color:${DocStyles.theme().accents[0]};font-weight:bold">${QuickParts.field('TITLE')}</p>`,
  line: () => `<p style="border-bottom:1pt solid ${DocStyles.theme().accents[0]};padding-bottom:2pt">${QuickParts.field('TITLE')}<span class="wc-tab" contenteditable="false">\t</span>${QuickParts.field('DATE')}</p>`,
  pagexy: () => `<p style="text-align:center">Página ${QuickParts.field('PAGE')} de ${QuickParts.field('NUMPAGES')}</p>`,
};
function setHF(kind, html, enter = true) {
  const k = Pager.currentIndex();
  const key = Pager.hfKey(kind, k);
  if (key) settings[key] = html; else (kind === 'header' ? header : footer).innerHTML = html;
  Pager.layout();
  if (enter) { const c = Pager.copyOn(kind, k); if (c) Pager.enterHF(c); }
  History.setLabel(kind === 'header' ? 'Cabeçalho' : 'Rodapé');
  changed();
}

/* =========================================================
   Folhas de rosto
   ========================================================= */
const COVERS = {
  alfabeto: a => `<div class="cover cover-alfabeto"><p class="cover-title">[Escreva o título do documento]</p><p class="cover-sub">[Escreva o subtítulo do documento]</p><p class="cover-meta">${esc(prefs.user)} · ${esc(new Date().toLocaleDateString('pt-PT'))}</p></div>`,
  anual: a => `<div class="cover cover-anual" style="--acc:${a}"><div class="cv-band">${new Date().getFullYear()}</div><p class="cover-title">[Escreva o título do documento]</p><p class="cover-sub">[Escreva o nome da empresa]</p></div>`,
  cubiculos: a => `<div class="cover cover-cubiculos" style="--acc:${a}"><div class="cv-blocks"><i></i><i></i><i></i><i></i></div><p class="cover-title">[Escreva o título do documento]</p><p class="cover-sub">[Escreva o subtítulo do documento]</p><p class="cover-meta">${esc(prefs.user)}</p></div>`,
  movimento: a => `<div class="cover cover-movimento" style="--acc:${a}"><div class="cv-wave"></div><p class="cover-title">[Escreva o título do documento]</p><p class="cover-meta">${esc(new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }))}</p></div>`,
};

/* =========================================================
   Referência cruzada
   ========================================================= */
async function crossRef() {
  const types = {
    heading: ['Título', () => $$('h1,h2,h3,h4', editor)],
    bookmark: ['Marcador', () => $$('a[id]:not([href])', editor)],
    footnote: ['Nota de rodapé', () => $$('sup.fn-ref', editor)],
    figure: ['Figura', () => $$('p.caption[data-label="Figura"]', editor)],
    table: ['Tabela', () => $$('p.caption[data-label="Tabela"]', editor)],
  };
  const res = await dialog({
    title: 'Referência Cruzada',
    width: 440,
    body: `<div class="two"><label>Tipo de referência:<select id="cr-type">${Object.entries(types).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select></label><label>Inserir referência para:<select id="cr-what"><option value="text">Texto</option><option value="page">Número de página</option><option value="above">Acima/abaixo</option></select></label></div>
      ${chk('cr-link', 'Inserir como hiperligação', true)}<label>Para que item:<select id="cr-item" size="8" style="height:140px"></select></label>`,
    onOpen: ov => {
      const fill = () => { const list = types[$('#cr-type', ov).value][1](); $('#cr-item', ov).innerHTML = list.map((el, i) => `<option value="${i}">${esc(el.id && !el.textContent.trim() ? el.id : el.textContent.trim().slice(0, 80))}</option>`).join(''); if (list.length) $('#cr-item', ov).selectedIndex = 0; };
      $('#cr-type', ov).onchange = fill;
      fill();
    },
    buttons: [{ label: 'Inserir', primary: true, value: ov => ({ type: $('#cr-type', ov).value, what: $('#cr-what', ov).value, link: $('#cr-link', ov).checked, i: +$('#cr-item', ov).value }) }, { label: 'Cancelar', value: null }],
  });
  if (!res || isNaN(res.i)) return;
  const el = types[res.type][1]()[res.i];
  if (!el) return;
  if (!el.id) el.id = '_Ref' + Math.random().toString(36).slice(2, 9);
  const r = currentRange();
  let text;
  if (res.what === 'page') text = `<span class="wc-field" data-field="PAGEREF" data-ref="${el.id}" contenteditable="false">${Pager.fieldValue('PAGEREF', 0, { dataset: { ref: el.id } })}</span>`;
  else if (res.what === 'above') text = r && (el.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'acima' : 'abaixo';
  else text = esc(el.id && !el.textContent.trim() ? el.id : el.textContent.trim());
  exec('insertHTML', res.link ? `<a href="#${el.id}">${text}</a>` : text);
}

/* =========================================================
   Registo de comandos
   ========================================================= */
Object.assign(CMD, {
  wordart: i => WordArt.dialogFor(i), smartart: () => SmartArt.open(), chart: () => Charts.open(), clipart: clipartPane,
  equation: i => exec('insertHTML', Equations.html(Equations.BUILTIN[+i][1], Equations.BUILTIN[+i][0])), newEquation: () => Equations.newEquation(),
  insertField: f => exec('insertHTML', QuickParts.field(f) + '&#8203;'), fieldDialog: () => QuickParts.fieldDialog(),
  qpSave: () => QuickParts.save(), qpOrganizer: () => QuickParts.organizer(), qpInsert: i => exec('insertHTML', sanitize(QuickParts.load()[+i].html)),
  hfTemplate: a => { const [kind, t] = a.split(':'); setHF(kind, HF_TEMPLATES[t]()); },
  hfEdit: kind => { const c = Pager.copyOn(kind); if (c) Pager.enterHF(c); },
  hfRemove: kind => { setHF(kind, '', false); },
  header: () => CMD.hfEdit('header'), footer: () => CMD.hfEdit('footer'),
  hfGoto: kind => { const c = Pager.copyOn(kind); if (c) { Pager.enterHF(c); c.scrollIntoView({ block: 'nearest' }); } },
  hfClose: () => Pager.exitHF(),
  hfNav: dir => { const k = Math.max(0, Math.min(Pager.count - 1, Pager.currentIndex() + (dir === 'next' ? 1 : -1))); const kind = nodeEl(currentRange()?.startContainer)?.closest('.hf-copy')?.dataset.kind || 'header'; const c = Pager.copyOn(kind, k); if (c) { Pager.enterHF(c); c.scrollIntoView({ block: 'center' }); } },
  pageNumber: a => {
    if (a === 'here') return exec('insertHTML', QuickParts.field('PAGE') + '&#8203;');
    const [kind, pos] = a.split(':');
    setHF(kind, pos === 'xy' ? HF_TEMPLATES.pagexy() : `<p style="text-align:${pos}">${QuickParts.field('PAGE')}</p>`);
  },
  pageNumberFormat: async () => {
    const r = await dialog({ title: 'Formato dos Números de Página', width: 320, body: `<label>Formato numérico:${sel('pn-f', [['1', '1, 2, 3, ...'], ['-1-', '- 1 -, - 2 -, - 3 -, ...'], ['a', 'a, b, c, ...'], ['A', 'A, B, C, ...'], ['i', 'i, ii, iii, ...'], ['I', 'I, II, III, ...']], settings.pageNumFormat || '1')}</label>${fieldset('Numeração de páginas', `<label class="fcheck"><input type="radio" name="pn-s" value="cont"${settings.pageStart > 1 ? '' : ' checked'}> Continuar da secção anterior</label><label class="fcheck"><input type="radio" name="pn-s" value="at"${settings.pageStart > 1 ? ' checked' : ''}> Começar em: <input type="number" id="pn-at" value="${settings.pageStart || 1}" min="0" style="width:60px"></label>`)}`, buttons: [{ label: 'OK', primary: true, value: ov => ({ f: $('#pn-f', ov).value, start: $('input[name=pn-s]:checked', ov).value === 'at' ? +$('#pn-at', ov).value : 1 }) }, { label: 'Cancelar', value: null }] });
    if (!r) return;
    settings.pageNumFormat = r.f;
    settings.pageStart = r.start;
    Pager.layout();
    changed();
  },
  pageNumberRemove: () => {
    const strip = h => { const d = document.createElement('div'); d.innerHTML = h || ''; $$('.wc-field[data-field="PAGE"], .wc-field[data-field="NUMPAGES"]', d).forEach(f => f.remove()); return d.innerHTML.replace(/Página\s+de\s*/g, ''); };
    header.innerHTML = strip(header.innerHTML); footer.innerHTML = strip(footer.innerHTML);
    ['firstHeader', 'firstFooter', 'evenHeader', 'evenFooter'].forEach(k => { if (settings[k]) settings[k] = strip(settings[k]); });
    Pager.layout(); changed();
  },
  coverPage: kind => {
    if (!COVERS[kind]) kind = 'alfabeto';
    CMD.coverRemove(true);
    editor.insertAdjacentHTML('afterbegin', COVERS[kind](DocStyles.theme().accents[0]) + '<hr class="page-break">');
    const t = $('.cover .cover-title', editor);
    const r = document.createRange(); r.selectNodeContents(t); editor.focus(); setRange(r);
    History.setLabel('Folha de Rosto');
    changed();
  },
  coverRemove: silent => { const old = $('.cover', editor); if (!old) return; if (old.nextElementSibling?.matches('hr.page-break')) old.nextElementSibling.remove(); old.remove(); if (silent !== true) changed(); },
  crossRef,
  insertFileText: async () => {
    const f = await pickAux('.docx,.txt,.html,.htm');
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    let html;
    if (ext === 'docx') { const r = await DocxIO.read(await f.arrayBuffer()); html = r.html ?? r.altChunk; }
    else if (ext === 'txt') html = textToHtml(await f.text());
    else html = await f.text();
    const d = new DOMParser().parseFromString(html, 'text/html');
    restore();
    exec('insertHTML', sanitize((d.querySelector('div.WordSection1') || d.body).innerHTML));
  },
  insertObjectImage: async () => {
    const f = await pickAux('*/*');
    if (!f) return;
    if (f.type.startsWith('image/')) return insertImageFile(f);
    const reader = new FileReader();
    reader.onload = () => exec('insertHTML', `<span class="wc-object" contenteditable="false"><a href="${reader.result}" download="${esc(f.name)}">📎 ${esc(f.name)}</a></span>&nbsp;`);
    reader.readAsDataURL(f);
  },
  colBreak: () => exec('insertHTML', '<hr class="col-break"><p><br></p>'),
  lineBreak: () => exec('insertLineBreak'),
  sectionBreak: k => exec('insertHTML', `<hr class="${k === 'cont' ? 'section-cont' : 'section-break'}"><p><br></p>`),
  lineNumbers: k => { settings.lineNumbers = k; applySettings(); changed(); },
  hyphenate: v => { settings.hyphenate = v === '1'; applySettings(); changed(); },
  textbox: () => exec('insertHTML', `<div class="textbox" style="border-color:${DocStyles.theme().accents[0]}"><p>[Escreva uma citação do documento ou o resumo de um ponto interessante. Pode posicionar a caixa de texto em qualquer parte do documento.]</p></div><p><br></p>`),
});

/* Opções do separador Cabeçalho e Rodapé */
$('#hf-first').addEventListener('change', e => { settings.differentFirst = e.target.checked; Pager.layout(); changed(); });
$('#hf-oddeven').addEventListener('change', e => { settings.oddEven = e.target.checked; Pager.layout(); changed(); });
$('#hf-showdoc').addEventListener('change', e => page.classList.toggle('hide-body', !e.target.checked));
$('#hf-top').addEventListener('change', e => { settings.headerDist = num(e.target.value) || 1.25; Pager.layout(); changed(); });
$('#hf-bottom').addEventListener('change', e => { settings.footerDist = num(e.target.value) || 1.25; Pager.layout(); changed(); });
const syncHFTab = () => {
  $('#hf-first').checked = !!settings.differentFirst;
  $('#hf-oddeven').checked = !!settings.oddEven;
  $('#hf-top').value = settings.headerDist ?? 1.25;
  $('#hf-bottom').value = settings.footerDist ?? 1.25;
};
