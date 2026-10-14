'use strict';
/* =========================================================
   Caixas de diálogo do Nexora Word e painéis relacionados
   ========================================================= */

/* ---------- Ajudantes ---------- */
const tabsUI = tabs => `<div class="dlg-tabs">${tabs.map((t, i) => `<button class="dlg-tab${i ? '' : ' active'}" data-dtab="${t.id}">${t.label}</button>`).join('')}</div>${tabs.map((t, i) => `<div class="dlg-pane${i ? '' : ' active'}" data-dpane="${t.id}">${t.html}</div>`).join('')}`;
function wireTabs(ov, start) {
  const go = id => {
    $$('.dlg-tab', ov).forEach(t => t.classList.toggle('active', t.dataset.dtab === id));
    $$('.dlg-pane', ov).forEach(p => p.classList.toggle('active', p.dataset.dpane === id));
  };
  $$('.dlg-tab', ov).forEach(t => t.addEventListener('click', () => go(t.dataset.dtab)));
  if (start) go(start);
}
const sel = (id, opts, v) => `<select id="${id}">${opts.map(o => { const [val, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
const chk = (id, label, on) => `<label class="fcheck"><input type="checkbox" id="${id}"${on ? ' checked' : ''}> ${label}</label>`;
const numIn = (id, v, step = 0.1, min = '') => `<input type="number" id="${id}" value="${v}" step="${step}"${min !== '' ? ` min="${min}"` : ''}>`;
const fieldset = (title, html) => `<fieldset class="dlg-fs"><legend>${title}</legend>${html}</fieldset>`;
const v$ = (ov, id) => $('#' + id, ov);
const toHex = c => { const m = String(c).match(/\d+/g); return m ? '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join('') : '#000000'; };
const pxToCm = px => Math.round(parseFloat(px) / CM * 100) / 100;
const pxToPt = px => Math.round(parseFloat(px) * 0.75 * 10) / 10;

/* =========================================================
   Tipo de Letra
   ========================================================= */
async function fontDialog() {
  const r = currentRange();
  const el = nodeEl(r?.startContainer) || editor;
  const cs = getComputedStyle(el);
  const font = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const bold = +cs.fontWeight >= 600, italic = cs.fontStyle === 'italic';
  const styleV = bold && italic ? 'bi' : bold ? 'b' : italic ? 'i' : 'n';
  const deco = (() => { let n = el, u = false, s = false; while (n && n !== editor) { const c = getComputedStyle(n); if (c.textDecorationLine.includes('underline')) u = c.textDecorationStyle; if (c.textDecorationLine.includes('line-through')) s = c.textDecorationStyle; n = n.parentElement; } return { u, s }; })();
  const fx = c => !!el.closest('.' + c);
  const tab1 = `<div class="font-grid">
      <label>Tipo de letra:<input id="fd-font" value="${esc(font)}" list="fd-fontlist"><datalist id="fd-fontlist">${FONTS.map(f => `<option value="${f}">`).join('')}</datalist></label>
      <label>Estilo do tipo de letra:${sel('fd-style', [['n', 'Normal'], ['i', 'Itálico'], ['b', 'Negrito'], ['bi', 'Negrito Itálico']], styleV)}</label>
      <label>Tamanho:<input id="fd-size" value="${fmt(Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2)}" list="fd-sizelist"><datalist id="fd-sizelist">${SIZES.map(s => `<option value="${s}">`).join('')}</datalist></label>
    </div>
    <div class="font-grid">
      <label>Cor do tipo de letra:<input type="color" id="fd-color" value="${toHex(cs.color)}"></label>
      <label>Estilo de sublinhado:${sel('fd-under', [['none', '(nenhum)'], ['solid', 'Simples'], ['double', 'Duplo'], ['dotted', 'Pontilhado'], ['dashed', 'Tracejado'], ['wavy', 'Ondulado']], deco.u || 'none')}</label>
      <label>Cor do sublinhado:<input type="color" id="fd-ucolor" value="${toHex(cs.textDecorationColor || cs.color)}"></label>
    </div>
    ${fieldset('Efeitos', `<div class="fx-grid">
      ${chk('fd-strike', 'Rasurado', deco.s && deco.s !== 'double')}${chk('fd-shadow', 'Sombra', fx('fx-shadow'))}${chk('fd-smallcaps', 'Versaletes', cs.fontVariantCaps === 'small-caps')}
      ${chk('fd-dstrike', 'Rasurado duplo', deco.s === 'double')}${chk('fd-outline', 'Contorno', fx('fx-outline'))}${chk('fd-caps', 'Maiúsculas', cs.textTransform === 'uppercase')}
      ${chk('fd-sup', 'Superior à linha', !!el.closest('sup'))}${chk('fd-emboss', 'Relevo', fx('fx-emboss'))}${chk('fd-hidden', 'Oculto', fx('hidden-text'))}
      ${chk('fd-sub', 'Inferior à linha', !!el.closest('sub'))}${chk('fd-imprint', 'Gravado', fx('fx-imprint'))}</div>`)}`;
  const tab2 = `<div class="two">
      <label>Escala:${sel('fd-scale', [200, 150, 100, 90, 80, 66, 50, 33].map(v => [v, v + '%']), 100)}</label><span></span>
      <label>Espaçamento:${sel('fd-spmode', [['normal', 'Normal'], ['exp', 'Expandido'], ['cond', 'Condensado']], parseFloat(cs.letterSpacing) > 0 ? 'exp' : parseFloat(cs.letterSpacing) < 0 ? 'cond' : 'normal')}</label>
      <label>Por:<input type="number" id="fd-sp" step="0.1" min="0" value="${Math.abs(pxToPt(cs.letterSpacing) || 0)}"> pt</label>
      <label>Posição:${sel('fd-posmode', [['normal', 'Normal'], ['up', 'Elevado'], ['down', 'Baixado']], 'normal')}</label>
      <label>Por:<input type="number" id="fd-pos" step="0.5" min="0" value="3"> pt</label></div>
      ${chk('fd-kern', 'Kerning para tipos de letra:', cs.fontKerning !== 'none')}`;
  const res = await dialog({
    title: 'Tipo de Letra',
    width: 470,
    body: tabsUI([{ id: 'f', label: 'Tipo de Letra', html: tab1 }, { id: 's', label: 'Espaçamento entre Caracteres', html: tab2 }]) + '<div class="fd-preview-box">Pré-visualizar<div id="fd-preview">' + esc((r?.toString() || '').slice(0, 40) || font) + '</div></div>',
    onOpen: ov => {
      wireTabs(ov);
      const pv = $('#fd-preview', ov);
      const upd = () => {
        const st = v$(ov, 'fd-style').value;
        Object.assign(pv.style, {
          fontFamily: `'${v$(ov, 'fd-font').value}'`, fontSize: Math.min(26, num(v$(ov, 'fd-size').value) || 11) + 'pt', color: v$(ov, 'fd-color').value,
          fontWeight: st.includes('b') ? 'bold' : 'normal', fontStyle: st.includes('i') ? 'italic' : 'normal',
          textDecorationLine: [v$(ov, 'fd-under').value !== 'none' ? 'underline' : '', v$(ov, 'fd-strike').checked || v$(ov, 'fd-dstrike').checked ? 'line-through' : ''].join(' ').trim() || 'none',
          textDecorationStyle: v$(ov, 'fd-dstrike').checked ? 'double' : v$(ov, 'fd-under').value === 'none' ? 'solid' : v$(ov, 'fd-under').value,
          fontVariant: v$(ov, 'fd-smallcaps').checked ? 'small-caps' : 'normal', textTransform: v$(ov, 'fd-caps').checked ? 'uppercase' : 'none',
          letterSpacing: v$(ov, 'fd-spmode').value === 'normal' ? 'normal' : (v$(ov, 'fd-spmode').value === 'cond' ? -1 : 1) * num(v$(ov, 'fd-sp').value) + 'pt',
          textShadow: v$(ov, 'fd-shadow').checked ? '1px 1px 1px #999' : v$(ov, 'fd-emboss').checked ? '-1px -1px 0 #fff, 1px 1px 0 #888' : v$(ov, 'fd-imprint').checked ? '1px 1px 0 #fff, -1px -1px 0 #888' : 'none',
          webkitTextStroke: v$(ov, 'fd-outline').checked ? '0.6px ' + v$(ov, 'fd-color').value : '0',
        });
        if (v$(ov, 'fd-outline').checked) pv.style.color = '#fff';
      };
      ov.addEventListener('input', upd);
      ov.addEventListener('change', upd);
      upd();
    },
    buttons: [{ label: 'Predefinição...', value: ov => ({ ...collectFont(ov), asDefault: true }) }, { label: 'OK', primary: true, value: collectFont }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  if (res.asDefault) {
    DocStyles.set('normal', { font: res.font, size: res.size });
    changed();
    return infoBox(`O tipo de letra predefinido passou a ser <b>${esc(res.font)} ${fmt(res.size)}</b> para este documento.`);
  }
  applyFontProps(res);
}

function collectFont(ov) {
  return {
    font: v$(ov, 'fd-font').value.trim(), style: v$(ov, 'fd-style').value, size: num(v$(ov, 'fd-size').value), color: v$(ov, 'fd-color').value,
    under: v$(ov, 'fd-under').value, ucolor: v$(ov, 'fd-ucolor').value, strike: v$(ov, 'fd-strike').checked, dstrike: v$(ov, 'fd-dstrike').checked,
    sup: v$(ov, 'fd-sup').checked, sub: v$(ov, 'fd-sub').checked, shadow: v$(ov, 'fd-shadow').checked, outline: v$(ov, 'fd-outline').checked,
    emboss: v$(ov, 'fd-emboss').checked, imprint: v$(ov, 'fd-imprint').checked, smallcaps: v$(ov, 'fd-smallcaps').checked, caps: v$(ov, 'fd-caps').checked,
    hidden: v$(ov, 'fd-hidden').checked, scale: +v$(ov, 'fd-scale').value, spmode: v$(ov, 'fd-spmode').value, sp: num(v$(ov, 'fd-sp').value) || 0,
    posmode: v$(ov, 'fd-posmode').value, pos: num(v$(ov, 'fd-pos').value) || 0, kern: v$(ov, 'fd-kern').checked,
  };
}

function applyFontProps(p) {
  const spans = markSelection();
  if (!spans.length) return infoBox('Seleccione o texto ao qual pretende aplicar a formatação.');
  spans.forEach(sp => {
    const s = sp.style;
    if (p.font) s.fontFamily = `'${p.font}'`;
    if (p.size) s.fontSize = p.size + 'pt';
    s.color = p.color;
    s.fontWeight = p.style.includes('b') ? 'bold' : 'normal';
    s.fontStyle = p.style.includes('i') ? 'italic' : 'normal';
    const lines = [p.under !== 'none' ? 'underline' : '', p.strike || p.dstrike ? 'line-through' : ''].filter(Boolean);
    s.textDecorationLine = lines.join(' ') || '';
    s.textDecorationStyle = p.dstrike ? 'double' : p.under !== 'none' ? p.under : '';
    s.textDecorationColor = p.under !== 'none' ? p.ucolor : '';
    s.fontVariant = p.smallcaps ? 'small-caps' : '';
    s.textTransform = p.caps ? 'uppercase' : '';
    s.letterSpacing = p.spmode === 'normal' ? '' : (p.spmode === 'cond' ? -p.sp : p.sp) + 'pt';
    s.fontKerning = p.kern ? '' : 'none';
    s.verticalAlign = p.sup ? 'super' : p.sub ? 'sub' : '';
    if (p.sup || p.sub) s.fontSize = Math.round((p.size || 11) * 0.65 * 2) / 2 + 'pt';
    s.position = p.posmode === 'normal' ? '' : 'relative';
    s.top = p.posmode === 'up' ? -p.pos + 'pt' : p.posmode === 'down' ? p.pos + 'pt' : '';
    if (p.scale !== 100) { s.display = 'inline-block'; s.transform = `scaleX(${p.scale / 100})`; s.transformOrigin = 'left'; } else { s.display = ''; s.transform = ''; }
    ['fx-shadow', 'fx-outline', 'fx-emboss', 'fx-imprint', 'hidden-text'].forEach(c => sp.classList.remove(c));
    if (p.shadow) sp.classList.add('fx-shadow');
    if (p.outline) sp.classList.add('fx-outline');
    if (p.emboss) sp.classList.add('fx-emboss');
    if (p.imprint) sp.classList.add('fx-imprint');
    if (p.hidden) sp.classList.add('hidden-text');
    $$('span', sp).forEach(inner => { ['fontFamily', 'fontSize', 'color', 'fontWeight', 'fontStyle'].forEach(k => { inner.style[k] = ''; }); if (!inner.getAttribute('style')) inner.removeAttribute('style'); });
  });
  selectSpans(spans);
  History.setLabel('Tipo de Letra');
  changed();
}

/* =========================================================
   Parágrafo
   ========================================================= */
async function paragraphDialog(startTab) {
  const blocks = selectedBlocks();
  const b = blocks[0];
  if (!b) return;
  const cs = getComputedStyle(b);
  const ti = parseFloat(cs.textIndent);
  const lhRaw = b.style.lineHeight;
  const fs = parseFloat(cs.fontSize);
  let lineMode = 'mult', lineVal = (parseFloat(cs.lineHeight) / fs || 1.15).toFixed(2);
  if (lhRaw && /pt|px/.test(lhRaw)) { lineMode = b.dataset.lineRule === 'atLeast' ? 'atLeast' : 'exact'; lineVal = pxToPt(cs.lineHeight); }
  else if (Math.abs(+lineVal - 1) < 0.02) lineMode = 'single';
  else if (Math.abs(+lineVal - 1.5) < 0.02) lineMode = '1.5';
  else if (Math.abs(+lineVal - 2) < 0.02) lineMode = 'double';
  const al = { start: 'left', left: 'left', center: 'center', right: 'right', end: 'right', justify: 'justify' }[cs.textAlign];
  const tab1 = `${fieldset('Geral', `<div class="two"><label>Alinhamento:${sel('pd-align', [['left', 'Esquerda'], ['center', 'Centrado'], ['right', 'Direita'], ['justify', 'Justificado']], al)}</label>
      <label>Nível de destaque:${sel('pd-outline', [['', 'Corpo de Texto'], ['1', 'Nível 1'], ['2', 'Nível 2'], ['3', 'Nível 3']], /^H[1-3]$/.test(b.tagName) ? b.tagName[1] : '')}</label></div>`)}
    ${fieldset('Avanço', `<div class="two"><label>Esquerda:${numIn('pd-left', pxToCm(cs.marginLeft))} cm</label><label>Especial:${sel('pd-special', [['none', '(nenhum)'], ['first', 'Primeira linha'], ['hanging', 'Pendente']], ti > 0 ? 'first' : ti < 0 ? 'hanging' : 'none')}</label>
      <label>Direita:${numIn('pd-right', pxToCm(cs.marginRight))} cm</label><label>Por:${numIn('pd-by', Math.abs(pxToCm(ti)) || 1.25, 0.1, 0)} cm</label></div>`)}
    ${fieldset('Espaçamento', `<div class="two"><label>Antes:${numIn('pd-before', pxToPt(cs.marginTop), 6, 0)} pt</label><label>Entre linhas:${sel('pd-line', [['single', 'Simples'], ['1.5', '1,5 linhas'], ['double', 'Duplo'], ['atLeast', 'Pelo menos'], ['exact', 'Exactamente'], ['mult', 'Múltiplo']], lineMode)}</label>
      <label>Depois:${numIn('pd-after', pxToPt(cs.marginBottom), 6, 0)} pt</label><label>Em:${numIn('pd-lineval', lineVal, 0.05, 0)}</label></div>
      ${chk('pd-contextual', 'Não adicionar espaço entre parágrafos do mesmo estilo', b.dataset.contextual === '1')}`)}`;
  const tab2 = fieldset('Paginação', `${chk('pd-widow', 'Controlo de linhas isoladas', b.dataset.widow !== '0')}${chk('pd-keepnext', 'Manter com o seguinte', b.dataset.keepNext === '1' || /^H\d$/.test(b.tagName))}
    ${chk('pd-keeplines', 'Manter linhas juntas', b.dataset.keepLines !== '0')}${chk('pd-pbbefore', 'Quebra de página antes', b.dataset.pbBefore === '1')}`) +
    fieldset('Excepções de formatação', `${chk('pd-nolinenum', 'Suprimir números de linha', b.dataset.noLineNum === '1')}${chk('pd-nohyph', 'Não hifenizar', b.classList.contains('no-hyphen'))}`);
  const res = await dialog({
    title: 'Parágrafo',
    width: 480,
    body: tabsUI([{ id: 'i', label: 'Avanços e Espaçamento', html: tab1 }, { id: 'q', label: 'Quebras de Linha e de Página', html: tab2 }]),
    onOpen: ov => wireTabs(ov, startTab),
    buttons: [{ label: 'Tabulações...', value: ov => ({ ...collectPara(ov), tabs: true }) }, { label: 'OK', primary: true, value: collectPara }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  blocks.forEach(bl => {
    const s = bl.style;
    s.textAlign = res.align === 'left' ? '' : res.align;
    s.marginLeft = res.left + 'cm';
    s.marginRight = res.right + 'cm';
    s.textIndent = res.special === 'none' ? '' : (res.special === 'hanging' ? -res.by : res.by) + 'cm';
    if (res.special === 'hanging') s.paddingLeft = ''; 
    s.marginTop = res.before + 'pt';
    s.marginBottom = res.after + 'pt';
    s.lineHeight = { single: '1', '1.5': '1.5', double: '2', mult: String(res.lineval), atLeast: res.lineval + 'pt', exact: res.lineval + 'pt' }[res.line];
    if (res.line === 'atLeast') bl.dataset.lineRule = 'atLeast'; else delete bl.dataset.lineRule;
    const flag = (k, on, dflt = false) => { if (on === dflt) delete bl.dataset[k]; else bl.dataset[k] = on ? '1' : '0'; };
    flag('keepNext', res.keepnext, /^H\d$/.test(bl.tagName));
    flag('keepLines', res.keeplines, true);
    flag('pbBefore', res.pbbefore);
    flag('widow', res.widow, true);
    flag('contextual', res.contextual);
    flag('noLineNum', res.nolinenum);
    bl.classList.toggle('no-hyphen', res.nohyph);
  });
  if (res.outline && /^[123]$/.test(res.outline) && !/^H\d$/.test(b.tagName)) applyStyle('h' + res.outline);
  History.setLabel('Formatação de Parágrafo');
  changed();
  if (res.tabs) tabsDialog();
}

function collectPara(ov) {
  return {
    align: v$(ov, 'pd-align').value, outline: v$(ov, 'pd-outline').value, left: num(v$(ov, 'pd-left').value) || 0, right: num(v$(ov, 'pd-right').value) || 0,
    special: v$(ov, 'pd-special').value, by: num(v$(ov, 'pd-by').value) || 0, before: num(v$(ov, 'pd-before').value) || 0, after: num(v$(ov, 'pd-after').value) || 0,
    line: v$(ov, 'pd-line').value, lineval: num(v$(ov, 'pd-lineval').value) || 1, contextual: v$(ov, 'pd-contextual').checked,
    widow: v$(ov, 'pd-widow').checked, keepnext: v$(ov, 'pd-keepnext').checked, keeplines: v$(ov, 'pd-keeplines').checked, pbbefore: v$(ov, 'pd-pbbefore').checked,
    nolinenum: v$(ov, 'pd-nolinenum').checked, nohyph: v$(ov, 'pd-nohyph').checked,
  };
}

/* =========================================================
   Tabulações
   ========================================================= */
async function tabsDialog() {
  const blocks = selectedBlocks();
  if (!blocks.length) return;
  let stops = (blocks[0].dataset.tabs || '').split(',').filter(Boolean).map(t => { const [k, v] = t.includes(':') ? t.split(':') : ['L', t]; return { k, v: num(v) }; });
  const list = () => stops.sort((a, b) => a.v - b.v).map((s, i) => `<option value="${i}">${fmt(s.v)} cm (${{ L: 'Esquerda', C: 'Centro', R: 'Direita' }[s.k]})</option>`).join('');
  const res = await dialog({
    title: 'Tabulações',
    width: 380,
    body: `<div class="two"><div><label>Posição da tabulação:<input type="number" id="tb-pos" step="0.25" min="0" value="2,5"></label><select id="tb-list" size="6" style="height:110px">${list()}</select></div>
      <div><label>Tabulações predefinidas:<input value="1,25 cm" disabled></label>${fieldset('Alinhamento', `<label class="fcheck"><input type="radio" name="tb-al" value="L" checked> Esquerda</label><label class="fcheck"><input type="radio" name="tb-al" value="C"> Centro</label><label class="fcheck"><input type="radio" name="tb-al" value="R"> Direita</label>`)}</div></div>
      <div class="dlg-inline"><button class="std" id="tb-set">Definir</button><button class="std" id="tb-clear">Limpar</button><button class="std" id="tb-clearall">Limpar Tudo</button></div>`,
    onOpen: ov => {
      const refresh = () => { v$(ov, 'tb-list').innerHTML = list(); };
      v$(ov, 'tb-set').onclick = () => { const v = num(v$(ov, 'tb-pos').value); if (v >= 0) { stops = stops.filter(s => Math.abs(s.v - v) > 0.01); stops.push({ k: $('input[name=tb-al]:checked', ov).value, v }); refresh(); } };
      v$(ov, 'tb-clear').onclick = () => { const i = v$(ov, 'tb-list').selectedIndex; if (i >= 0) { stops.splice(i, 1); refresh(); } };
      v$(ov, 'tb-clearall').onclick = () => { stops = []; refresh(); };
      v$(ov, 'tb-list').onchange = e => { const s = stops[+e.target.value]; if (s) { v$(ov, 'tb-pos').value = s.v; $(`input[name=tb-al][value=${s.k}]`, ov).checked = true; } };
    },
    buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  const val = stops.map(s => `${s.k}:${s.v}`).join(',');
  blocks.forEach(b => { if (val) b.dataset.tabs = val; else delete b.dataset.tabs; });
  History.setLabel('Tabulações');
  changed();
  Pager.layout();
}

/* =========================================================
   Configurar Página
   ========================================================= */
async function pageSetup(startTab) {
  const m = settings.margins, [w, h] = PAGE_SIZES[settings.size] || PAGE_SIZES.A4;
  const sizes = Object.keys(PAGE_SIZES).filter(k => k !== 'Personalizado').map(k => [k, `${k} (${fmt(PAGE_SIZES[k][0] / 10)} x ${fmt(PAGE_SIZES[k][1] / 10)} cm)`]);
  sizes.push(['Personalizado', 'Tamanho personalizado']);
  const tab1 = `${fieldset('Margens', `<div class="two"><label>Superior:${numIn('ps-t', m.t)} cm</label><label>Inferior:${numIn('ps-b', m.b)} cm</label><label>Esquerda:${numIn('ps-l', m.l)} cm</label><label>Direita:${numIn('ps-r', m.r)} cm</label>
      <label>Medianiz:${numIn('ps-gutter', settings.gutter || 0)} cm</label><label>Posição da medianiz:${sel('ps-gpos', [['left', 'Esquerda'], ['top', 'Superior']], 'left')}</label></div>`)}
    ${fieldset('Orientação', `<div class="orient-pick"><label class="fcheck"><input type="radio" name="ps-or" value="p"${settings.landscape ? '' : ' checked'}><i class="ic lg" data-icon="portrait"></i> Vertical</label><label class="fcheck"><input type="radio" name="ps-or" value="l"${settings.landscape ? ' checked' : ''}><i class="ic lg" data-icon="landscape"></i> Horizontal</label></div>`)}`;
  const tab2 = fieldset('Tamanho do papel', `${sel('ps-size', sizes, settings.size)}<div class="two"><label>Largura:${numIn('ps-w', fmt(w / 10).replace(',', '.'))} cm</label><label>Altura:${numIn('ps-h', fmt(h / 10).replace(',', '.'))} cm</label></div>`);
  const tab3 = `${fieldset('Cabeçalhos e rodapés', `${chk('ps-first', 'Primeira página diferente', settings.differentFirst)}<div class="two"><label>Cabeçalho:${numIn('ps-hd', settings.headerDist ?? 1.25)} cm</label><label>Rodapé:${numIn('ps-fd', settings.footerDist ?? 1.25)} cm</label></div>`)}
    ${fieldset('Página', `<label>Alinhamento vertical:${sel('ps-valign', [['top', 'Superior'], ['center', 'Centro'], ['justify', 'Justificado'], ['bottom', 'Inferior']], settings.vAlign || 'top')}</label>`)}
    ${fieldset('Numeração', `<div class="two"><label>Números de linha:${sel('ps-ln', [['none', 'Nenhum'], ['continuous', 'Contínuo'], ['page', 'Reiniciar em cada página']], settings.lineNumbers || 'none')}</label><label>Começar a numeração das páginas em:${numIn('ps-start', settings.pageStart || 1, 1, 0)}</label></div>`)}`;
  const res = await dialog({
    title: 'Configurar Página',
    width: 440,
    body: tabsUI([{ id: 'm', label: 'Margens', html: tab1 }, { id: 'p', label: 'Papel', html: tab2 }, { id: 'e', label: 'Esquema', html: tab3 }]),
    onOpen: ov => {
      wireTabs(ov, startTab);
      v$(ov, 'ps-size').onchange = e => { const d = PAGE_SIZES[e.target.value]; if (d) { v$(ov, 'ps-w').value = d[0] / 10; v$(ov, 'ps-h').value = d[1] / 10; } };
      ['ps-w', 'ps-h'].forEach(id => v$(ov, id).addEventListener('input', () => { v$(ov, 'ps-size').value = 'Personalizado'; }));
    },
    buttons: [{ label: 'OK', primary: true, value: ov => ({
      m: { t: num(v$(ov, 'ps-t').value), b: num(v$(ov, 'ps-b').value), l: num(v$(ov, 'ps-l').value), r: num(v$(ov, 'ps-r').value) }, gutter: num(v$(ov, 'ps-gutter').value) || 0,
      land: $('input[name=ps-or]:checked', ov).value === 'l', size: v$(ov, 'ps-size').value, w: num(v$(ov, 'ps-w').value), h: num(v$(ov, 'ps-h').value),
      first: v$(ov, 'ps-first').checked, hd: num(v$(ov, 'ps-hd').value), fd: num(v$(ov, 'ps-fd').value), valign: v$(ov, 'ps-valign').value,
      ln: v$(ov, 'ps-ln').value, start: Math.max(0, Math.round(num(v$(ov, 'ps-start').value) || 1)),
    }) }, { label: 'Cancelar', value: null }],
  });
  if (!res || Object.values(res.m).some(v => !(v >= 0 && v < 30))) return;
  settings.margins = res.m;
  if (res.gutter) settings.margins.l += res.gutter;
  settings.landscape = res.land;
  if (res.size === 'Personalizado' && res.w > 2 && res.h > 2) PAGE_SIZES.Personalizado = [res.w * 10, res.h * 10];
  settings.size = res.size;
  Object.assign(settings, { differentFirst: res.first, headerDist: res.hd, footerDist: res.fd, vAlign: res.valign, lineNumbers: res.ln, pageStart: res.start });
  if (res.size === 'Personalizado') settings.customSize = PAGE_SIZES.Personalizado;
  applySettings();
  History.setLabel('Configurar Página');
  changed();
}

/* =========================================================
   Limites e Sombreado
   ========================================================= */
async function bordersDialog(target) {
  const blocks = target === 'page' ? [] : selectedBlocks();
  const b = blocks[0];
  const cs = b ? getComputedStyle(b) : null;
  const cellMode = target === 'cell';
  const styles = [['solid', 'Simples'], ['dotted', 'Pontilhado'], ['dashed', 'Tracejado'], ['double', 'Duplo'], ['groove', 'Ondulado/3D'], ['ridge', 'Relevo']];
  const widths = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6].map(v => [v, fmt(v) + ' pt']);
  const preset = id => `<div class="bd-presets">${[['none', 'Nenhum'], ['box', 'Caixa'], ['shadow', 'Sombra'], ['3d', '3D']].map(([v, l], i) => `<label class="bd-preset"><input type="radio" name="${id}" value="${v}"${i === (cs && cs.borderTopStyle !== 'none' ? 1 : 0) ? ' checked' : ''}><span class="bd-sample bd-${v}"></span>${l}</label>`).join('')}</div>`;
  const tab1 = `<div class="two"><div>${preset('bd-def')}</div><div><label>Estilo:${sel('bd-style', styles, cs?.borderTopStyle !== 'none' ? cs?.borderTopStyle : 'solid')}</label><label>Cor:<input type="color" id="bd-color" value="${cs ? toHex(cs.borderTopColor) : '#000000'}"></label><label>Largura:${sel('bd-width', widths, 0.5)}</label>
    <div class="bd-sides">${['top', 'bottom', 'left', 'right'].map(s => chk('bd-' + s, { top: 'Superior', bottom: 'Inferior', left: 'Esquerda', right: 'Direita' }[s], true)).join('')}</div>
    <label>Aplicar a:${sel('bd-apply', cellMode ? [['cell', 'Célula'], ['table', 'Tabela']] : [['para', 'Parágrafo']], cellMode ? 'cell' : 'para')}</label></div></div>`;
  const tab2 = `<div class="two"><div>${preset('pb-def').replace(/checked/g, '').replace(`value="${settings.pageBorder ? 'box' : 'none'}"`, `value="${settings.pageBorder ? 'box' : 'none'}" checked`)}</div><div><label>Estilo:${sel('pb-style', [['double', 'Duplo'], ['single', 'Simples'], ['dotted', 'Pontilhado'], ['dashed', 'Tracejado'], ['thick', 'Espesso']], settings.pageBorderStyle || 'double')}</label>
    <label>Cor:<input type="color" id="pb-color" value="${settings.pageBorderColor || '#1f497d'}"></label><label>Arte:${sel('pb-art', [['', '(nenhuma)'], ['stars', '★ ★ ★'], ['hearts', '♥ ♥ ♥'], ['dots', '● ● ●']], settings.pageBorderArt || '')}</label><label>Aplicar a:${sel('pb-apply', [['all', 'Todo o documento']], 'all')}</label></div></div>`;
  const tab3 = `<div class="two"><div>${fieldset('Preenchimento', `<input type="color" id="sh-fill" value="${cs && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) ? toHex(cs.backgroundColor) : '#ffffff'}">${chk('sh-none', 'Sem cor', !cs || /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor))}`)}</div>
    <div>${fieldset('Padrão', `<label>Estilo:${sel('sh-pattern', [['clear', 'Transparente'], ['5', '5%'], ['10', '10%'], ['25', '25%'], ['50', '50%']], 'clear')}</label>`)}</div></div>`;
  const tabs = [{ id: 'b', label: 'Limites', html: tab1 }, { id: 'p', label: 'Limite da Página', html: tab2 }, { id: 's', label: 'Sombreado', html: tab3 }];
  const res = await dialog({
    title: 'Limites e Sombreado',
    width: 470,
    body: tabsUI(tabs),
    onOpen: ov => wireTabs(ov, target === 'page' ? 'p' : 'b'),
    buttons: [{ label: 'OK', primary: true, value: ov => ({
      def: $('input[name=bd-def]:checked', ov)?.value, style: v$(ov, 'bd-style').value, color: v$(ov, 'bd-color').value, width: +v$(ov, 'bd-width').value,
      sides: ['top', 'bottom', 'left', 'right'].filter(s => v$(ov, 'bd-' + s).checked), apply: v$(ov, 'bd-apply').value,
      pdef: $('input[name=pb-def]:checked', ov)?.value, pstyle: v$(ov, 'pb-style').value, pcolor: v$(ov, 'pb-color').value, part: v$(ov, 'pb-art').value,
      fill: v$(ov, 'sh-none').checked ? '' : v$(ov, 'sh-fill').value, pattern: v$(ov, 'sh-pattern').value, pane: $('.dlg-tab.active', ov).dataset.dtab,
    }) }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  // limite da página
  settings.pageBorder = res.pdef && res.pdef !== 'none';
  settings.pageBorderStyle = res.pstyle;
  settings.pageBorderColor = res.pcolor;
  settings.pageBorderArt = res.part;
  if (target !== 'page') {
    const line = `${res.width}pt ${res.style} ${res.color}`;
    const targets = cellMode ? (res.apply === 'table' ? $$('td,th', TableTools.current() || document.createElement('table')) : TableTools.selectedCells()) : blocks;
    targets.forEach(el => {
      const s = el.style;
      ['top', 'bottom', 'left', 'right'].forEach(side => { s['border' + cap(side)] = res.def === 'none' ? (cellMode ? 'none' : '') : res.sides.includes(side) ? line : ''; });
      s.boxShadow = res.def === 'shadow' ? '3px 3px 0 ' + res.color : res.def === '3d' ? 'inset -1px -1px 0 #888, inset 1px 1px 0 #fff' : '';
      if (!cellMode) s.padding = res.def === 'none' ? '' : '1pt 4pt';
      const pat = res.pattern === 'clear' ? '' : `repeating-linear-gradient(45deg, rgba(0,0,0,${+res.pattern / 100}) 0 1px, transparent 1px 3px)`;
      s.backgroundColor = res.fill || '';
      s.backgroundImage = pat;
    });
  }
  applySettings();
  History.setLabel('Limites e Sombreado');
  changed();
}

/* =========================================================
   Estilos: painel, modificar, novo, conjuntos, temas
   ========================================================= */
function stylesPane() {
  const d = DocStyles.defs();
  const r = currentRange(), el = nodeEl(r?.startContainer);
  const cur = el ? DocStyles.keyOfChar(el) || DocStyles.keyOfBlock(blockOf(el)) : 'normal';
  const rows = Object.entries(d).map(([k, s]) => `<div class="sp-row${k === cur ? ' active' : ''}" data-key="${k}"><button class="sp-apply" data-cmd="style" data-arg="${k}" style="${$('#sp-prev')?.checked ? DocStyles.sampleCss(s).replace(/font-size:\d+px/, 'font-size:12px') : ''}">${esc(s.name)}</button><span class="sp-kind">${s.type === 'c' ? 'a' : '¶'}</span><button class="sp-menu" data-key="${k}" title="Modificar">▾</button></div>`).join('');
  const body = TaskPane.open('styles', 'Estilos', `<div class="sp-list">${rows}</div>
    <div class="sp-foot">${chk('sp-prev', 'Mostrar Pré-visualização', prefs.stylesPreview)}
    <div class="sp-btns"><button class="std" data-cmd="newStyle"><i class="ic" data-icon="newstyle"></i> Novo Estilo</button><button class="std" data-cmd="clearFormat"><i class="ic" data-icon="clear"></i> Limpar</button></div></div>`, { width: 240 });
  $('#sp-prev', body).addEventListener('change', e => { prefs.stylesPreview = e.target.checked; savePrefs(); stylesPane(); });
  $('#sp-prev', body).checked = !!prefs.stylesPreview;
  if (prefs.stylesPreview) $$('.sp-apply', body).forEach(b => { b.style.cssText = DocStyles.sampleCss(d[b.dataset.arg]).replace(/font-size:\d+px/, 'font-size:13px'); });
  $$('.sp-menu', body).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const k = b.dataset.key, m = $('#ctx-menu');
    m.innerHTML = `<button class="dd-item" data-cmd="modifyStyle" data-arg="${k}">Modificar...</button><button class="dd-item" data-cmd="style" data-arg="${k}">Aplicar</button>${d[k].custom ? `<button class="dd-item" data-cmd="deleteStyle" data-arg="${k}">Eliminar "${esc(d[k].name)}"...</button>` : ''}<button class="dd-item" data-cmd="selectStyleUses" data-arg="${k}">Seleccionar Todas as ${$$('*', editor).filter(x => DocStyles.metaOf(k).cls ? x.classList.contains(DocStyles.metaOf(k).cls) : x.tagName.toLowerCase() === DocStyles.metaOf(k).tag).length} Ocorrência(s)</button>`;
    const rr = b.getBoundingClientRect();
    m.classList.add('open');
    m.style.left = Math.min(rr.left, innerWidth - m.offsetWidth - 4) + 'px';
    m.style.top = rr.bottom + 'px';
  }));
}

async function modifyStyle(key, isNew = false) {
  const d = DocStyles.defs();
  const s = isNew ? { name: 'Estilo1', type: 'p', ...captureFormat() } : { ...d[key] };
  const n = d.normal;
  const res = await dialog({
    title: isNew ? 'Criar Novo Estilo a partir da Formatação' : 'Modificar Estilo',
    width: 470,
    body: `${fieldset('Propriedades', `<div class="two"><label>Nome:<input id="ms-name" value="${esc(s.name)}"${!isNew && !s.custom ? ' disabled' : ''}></label>
        <label>Tipo de estilo:${sel('ms-type', [['p', 'Parágrafo'], ['c', 'Carácter']], s.type)}</label></div>`)}
      ${fieldset('Formatação', `<div class="ms-row"><input id="ms-font" list="fd-fontlist2" value="${esc(s.font || n.font)}"><datalist id="fd-fontlist2">${FONTS.map(f => `<option value="${f}">`).join('')}</datalist>
        <input id="ms-size" type="number" step="0.5" value="${s.size || n.size}" style="width:60px">
        <label class="ms-tog"><input type="checkbox" id="ms-b"${s.bold ? ' checked' : ''}><b>N</b></label><label class="ms-tog"><input type="checkbox" id="ms-i"${s.italic ? ' checked' : ''}><i>I</i></label><label class="ms-tog"><input type="checkbox" id="ms-u"${s.underline ? ' checked' : ''}><u>S</u></label>
        <input type="color" id="ms-color" value="${s.color || '#000000'}"></div>
        <div class="ms-row">${sel('ms-align', [['', 'Alinhamento: herdado'], ['left', 'Esquerda'], ['center', 'Centrado'], ['right', 'Direita'], ['justify', 'Justificado']], s.align || '')}
        <label>Antes <input type="number" id="ms-before" step="6" min="0" value="${s.before ?? ''}" style="width:52px"> pt</label><label>Depois <input type="number" id="ms-after" step="6" min="0" value="${s.after ?? ''}" style="width:52px"> pt</label>
        <label>Linhas <input type="number" id="ms-line" step="0.05" min="0.5" value="${s.line ?? ''}" style="width:52px"></label></div>
        <div class="ms-preview" id="ms-preview">Texto de Exemplo Texto de Exemplo Texto de Exemplo</div>`)}
      ${chk('ms-gallery', 'Adicionar à lista Estilos Rápidos', true)}`,
    onOpen: ov => {
      const upd = () => Object.assign(v$(ov, 'ms-preview').style, { fontFamily: `'${v$(ov, 'ms-font').value}'`, fontSize: v$(ov, 'ms-size').value + 'pt', fontWeight: v$(ov, 'ms-b').checked ? 'bold' : 'normal', fontStyle: v$(ov, 'ms-i').checked ? 'italic' : 'normal', textDecoration: v$(ov, 'ms-u').checked ? 'underline' : 'none', color: v$(ov, 'ms-color').value, textAlign: v$(ov, 'ms-align').value || 'left' });
      ov.addEventListener('input', upd); ov.addEventListener('change', upd); upd();
    },
    buttons: [{ label: 'OK', primary: true, value: ov => {
      const o = { name: v$(ov, 'ms-name').value.trim() || s.name, type: v$(ov, 'ms-type').value, font: v$(ov, 'ms-font').value.trim(), size: num(v$(ov, 'ms-size').value), bold: v$(ov, 'ms-b').checked, italic: v$(ov, 'ms-i').checked, underline: v$(ov, 'ms-u').checked, color: v$(ov, 'ms-color').value };
      const al = v$(ov, 'ms-align').value; if (al) o.align = al;
      ['before', 'after', 'line'].forEach(k => { const v = v$(ov, 'ms-' + k).value; if (v !== '') o[k] = num(v); });
      return o;
    } }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  if (isNew) {
    const id = res.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '') || 'estilo' + Date.now();
    DocStyles.addCustom(id, res);
    applyStyle(id);
  } else {
    if (d[key].custom) DocStyles.addCustom(key, { ...d[key], ...res, custom: undefined });
    else DocStyles.set(key, res);
  }
  History.setLabel('Modificar Estilo');
  changed();
  if (TaskPane.kind === 'styles') stylesPane();
}

function captureFormat() {
  const r = currentRange(), el = nodeEl(r?.startContainer) || editor, cs = getComputedStyle(el), b = blockOf(el), bs = b ? getComputedStyle(b) : cs;
  return { font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2, bold: +cs.fontWeight >= 600, italic: cs.fontStyle === 'italic', color: toHex(cs.color), before: pxToPt(bs.marginTop), after: pxToPt(bs.marginBottom) };
}

const STYLE_SETS = {
  office: {},
  formal: { h1: { align: 'center', size: 16, bold: true }, h2: { italic: true }, title: { align: 'center', borderBottom: '' }, normal: { line: 1.15 } },
  moderno: { h1: { size: 18, bold: false, before: 18, after: 6 }, h2: { size: 14, bold: false }, title: { size: 32, letter: 1 }, normal: { line: 1.3, after: 8 } },
  simples: { h1: { color: '#000000', size: 14 }, h2: { color: '#000000' }, h3: { color: '#000000' }, title: { color: '#000000', borderBottom: '' }, subtitle: { color: '#444444' } },
};

/* ---------- Temas ---------- */
function themeCard(k, t, cmd = 'setTheme') {
  return `<button class="theme-item" data-cmd="${cmd}" data-arg="${k}" data-tip="${esc(t.name)}"><span class="th-prev"><span class="th-aa" style="font-family:'${t.major}'">Aa</span><span class="th-bars">${t.accents.map(c => `<i style="background:${c}"></i>`).join('')}</span></span><span class="th-name">${esc(t.name)}</span></button>`;
}
Object.assign(DD_HOOKS, {
  'dd-themes': dd => { dd.innerHTML = `<div class="dd-title">Incorporados</div><div class="theme-grid">${Object.entries(DocStyles.THEMES).map(([k, t]) => themeCard(k, t)).join('')}</div><div class="dd-sep"></div><button class="dd-item" data-cmd="setTheme" data-arg="office">Repor para Tema do Modelo</button>`; },
  'dd-themecolors': dd => { dd.innerHTML = `<div class="dd-title">Incorporados</div>${Object.entries(DocStyles.THEMES).map(([k, t]) => `<button class="dd-item tc-item" data-cmd="setThemeColors" data-arg="${k}"><span class="tc-sw">${[t.dk2, t.lt2, ...t.accents].map(c => `<i style="background:${c}"></i>`).join('')}</span>${esc(t.name)}</button>`).join('')}`; },
  'dd-themefonts': dd => { dd.innerHTML = `<div class="dd-title">Incorporados</div>${Object.entries(DocStyles.THEMES).map(([k, t]) => `<button class="dd-item tf-item" data-cmd="setThemeFonts" data-arg="${k}"><span class="tf-aa">Aa</span><span><b>${esc(t.name)}</b><br><span style="font-family:'${t.major}'">${esc(t.major)}</span><br><span style="font-family:'${t.minor}'">${esc(t.minor)}</span></span></button>`).join('')}`; },
});

/* =========================================================
   Propriedades, Inspeccionar, Marcar como Final, Proteger, Compatibilidade
   ========================================================= */
async function properties() {
  closeOfficeMenu();
  const p = settings.props || {};
  const s = docStats();
  const f = (id, l, v) => `<label>${l}<input id="pr-${id}" value="${esc(v || '')}"></label>`;
  const res = await dialog({
    title: `Propriedades de ${docName}`,
    width: 460,
    body: tabsUI([
      { id: 'r', label: 'Resumo', html: `<div class="two">${f('title', 'Título:', p.title)}${f('subject', 'Assunto:', p.subject)}${f('author', 'Autor:', p.author || prefs.user)}${f('manager', 'Gestor:', p.manager)}${f('company', 'Empresa:', p.company)}${f('category', 'Categoria:', p.category)}</div>${f('keywords', 'Palavras-chave:', p.keywords)}<label>Comentários:<textarea id="pr-comments" style="height:50px">${esc(p.comments || '')}</textarea></label>` },
      { id: 'e', label: 'Estatísticas', html: `<table class="stats"><tr><td>Criado:</td><td>${esc(p.created ? new Date(p.created).toLocaleString('pt-PT') : '—')}</td></tr><tr><td>Modificado:</td><td>${new Date().toLocaleString('pt-PT')}</td></tr><tr><td>Páginas:</td><td>${s.pages}</td></tr><tr><td>Parágrafos:</td><td>${s.paras}</td></tr><tr><td>Linhas:</td><td>${s.lines}</td></tr><tr><td>Palavras:</td><td>${s.words}</td></tr><tr><td>Caracteres:</td><td>${s.charsNoSpace}</td></tr><tr><td>Caracteres (com espaços):</td><td>${s.chars}</td></tr></table>` },
    ]),
    onOpen: wireTabs,
    buttons: [{ label: 'OK', primary: true, value: ov => Object.fromEntries(['title', 'subject', 'author', 'manager', 'company', 'category', 'keywords', 'comments'].map(k => [k, v$(ov, 'pr-' + k).value])) }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  settings.props = { ...p, ...res, created: p.created || new Date().toISOString() };
  History.setLabel('Propriedades');
  changed();
  Pager.layout();
}

async function inspect() {
  closeOfficeMenu();
  const found = {
    comments: $$('.comment', editor).length,
    revisions: $$('.tc-ins, .tc-del', page).length,
    hidden: $$('.hidden-text', editor).length,
    hf: !!(header.textContent.trim() || footer.textContent.trim() || settings.firstHeader || settings.firstFooter),
    watermark: !!settings.watermark,
    props: !!(settings.props && Object.values(settings.props).some(Boolean)),
  };
  const row = (k, title, n, desc) => `<div class="insp-row"><i class="ic" data-icon="${n ? 'warning' : 'accept'}"></i><div><b>${title}</b><br><small>${n ? desc : 'Não foram encontrados itens.'}</small></div>${n ? `<button class="std" data-rm="${k}">Remover Tudo</button>` : ''}</div>`;
  await dialog({
    title: 'Inspector de Documentos',
    width: 480,
    body: `<p>Reveja os resultados da inspecção.</p>
      ${row('comments', 'Comentários, Revisões, Versões e Anotações', found.comments + found.revisions, `Foram encontrados: ${found.comments} comentário(s) e ${found.revisions} revisão(ões).`)}
      ${row('props', 'Propriedades do Documento e Informações Pessoais', found.props, 'Foram encontradas as seguintes informações: propriedades do documento (autor, título, etc.).')}
      ${row('hf', "Cabeçalhos, Rodapés e Marcas d'Água", found.hf || found.watermark, "Foram encontrados cabeçalhos, rodapés ou marcas d'água.")}
      ${row('hidden', 'Texto Oculto', found.hidden, `Foram encontrados ${found.hidden} fragmento(s) de texto oculto.`)}`,
    onOpen: ov => $$('[data-rm]', ov).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.rm;
      if (k === 'comments') { $$('.comment', editor).forEach(unwrap); Review.acceptAll(true); }
      if (k === 'props') settings.props = {};
      if (k === 'hf') { header.innerHTML = footer.innerHTML = ''; settings.firstHeader = settings.firstFooter = ''; settings.watermark = ''; applySettings(); }
      if (k === 'hidden') $$('.hidden-text', editor).forEach(n => n.remove());
      b.closest('.insp-row').innerHTML = '<i class="ic" data-icon="accept"></i><div><b>Removido</b><br><small>Os itens foram removidos com êxito.</small></div>';
      renderIcons(ov);
      History.setLabel('Inspeccionar Documento');
      changed();
    })),
    buttons: [{ label: 'Fechar', primary: true, value: true }],
  });
}

function setReadOnly(on, reason) {
  page.classList.toggle('read-only', on);
  [editor, header, footer, ...$$('.hf-copy', page)].forEach(el => el.setAttribute('contenteditable', on ? 'false' : 'true'));
  if (on) MessageBar.show(reason, settings.final ? 'Editar Mesmo Assim' : 'Parar Protecção', settings.final ? () => { settings.final = false; setReadOnly(false); MessageBar.hide(); changed(); } : () => CMD.protect());
  else MessageBar.hide();
}

async function markFinal() {
  closeOfficeMenu();
  if (settings.final) { settings.final = false; setReadOnly(false); return changed(); }
  const ok = await dialog({ title: 'Nexora Word', body: '<div class="msg"><i class="ic" data-icon="info"></i><div>Este documento será marcado como final e, em seguida, guardado.</div></div>', buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancelar', value: null }] });
  if (!ok) return;
  settings.final = true;
  setReadOnly(true, '<b>Marcado como Final</b> Um autor marcou este documento como final para desencorajar a edição.');
  History.setLabel('Marcar como Final');
  changed();
  await save();
}

const sha256 = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');

async function protect() {
  closeOfficeMenu();
  if (settings.protect) {
    const pw = await dialog({ title: 'Desproteger Documento', width: 320, body: '<label>Palavra-passe:<input type="password" id="pw"></label>', buttons: [{ label: 'OK', primary: true, value: ov => v$(ov, 'pw').value }, { label: 'Cancelar', value: null }] });
    if (pw === null) return;
    if (settings.protect.hash && (await sha256(pw)) !== settings.protect.hash) return infoBox('A palavra-passe está incorrecta.', 'warning');
    settings.protect = null;
    setReadOnly(false);
    $('#btn-protect')?.classList.remove('active');
    return changed();
  }
  const res = await dialog({
    title: 'Restringir Formatação e Edição',
    width: 380,
    body: `${fieldset('1. Restrições de formatação', chk('pt-format', 'Limitar a formatação a uma selecção de estilos', false))}${fieldset('2. Restrições de edição', `${chk('pt-edit', 'Permitir apenas este tipo de edição no documento:', true)}${sel('pt-kind', [['readonly', 'Sem alterações (Só de leitura)'], ['comments', 'Comentários'], ['track', 'Alterações controladas']], 'readonly')}`)}
      ${fieldset('3. Iniciar imposição', '<label>Introduza a nova palavra-passe (opcional):<input type="password" id="pt-pw"></label><label>Reintroduza a palavra-passe para confirmar:<input type="password" id="pt-pw2"></label>')}`,
    buttons: [{ label: 'Sim, Iniciar Imposição de Protecção', primary: true, value: ov => ({ kind: v$(ov, 'pt-kind').value, pw: v$(ov, 'pt-pw').value, pw2: v$(ov, 'pt-pw2').value }) }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  if (res.pw !== res.pw2) return infoBox('A palavra-passe de confirmação não é idêntica.', 'warning');
  settings.protect = { kind: res.kind, hash: res.pw ? await sha256(res.pw) : '' };
  if (res.kind === 'track') { settings.trackChanges = true; Review.syncTrack(); MessageBar.show('<b>Documento protegido</b> Só são permitidas alterações controladas.', 'Parar Protecção', () => CMD.protect()); }
  else setReadOnly(true, `<b>Documento protegido</b> ${res.kind === 'comments' ? 'Só são permitidos comentários.' : 'Este documento está protegido contra edição.'}`);
  $('#btn-protect')?.classList.add('active');
  History.setLabel('Proteger Documento');
  changed();
}

async function compatCheck() {
  closeOfficeMenu();
  const issues = [];
  if ($$('.equation', editor).length) issues.push(['Equações', 'As equações serão convertidas em imagens que não podem ser editadas.', $$('.equation', editor).length]);
  if ($$('img[data-kind="smartart"], img[data-kind="chart"]', editor).length) issues.push(['Gráficos SmartArt e gráficos', 'Serão convertidos num único objecto que não pode ser editado.', $$('img[data-kind]', editor).length]);
  if (settings.theme && settings.theme !== 'office') issues.push(['Temas do documento', 'Os temas não são suportados; a formatação será mantida como formatação directa.', 1]);
  if ($$('.cs-emphasis, .cs-intense, .cs-subtleref, .cs-intenseref, .cs-booktitle', editor).length) issues.push(['Estilos rápidos', 'Alguns estilos podem ter um aspecto diferente.', 1]);
  if ($$('.wordart', editor).length) issues.push(['Efeitos de texto WordArt', 'Os efeitos serão removidos.', $$('.wordart', editor).length]);
  await dialog({
    title: 'Nexora Word - Verificador de Compatibilidade',
    width: 460,
    body: `<p>As seguintes funcionalidades deste documento não são suportadas por versões anteriores do Nexora Word e podem ser perdidas ao guardar como <b>Documento do Word 97-2003</b>.</p>
      <div class="compat-list">${issues.length ? issues.map(([t, d, n]) => `<div class="insp-row"><i class="ic" data-icon="warning"></i><div><b>${t}</b> (${n})<br><small>${d}</small></div></div>`).join('') : '<div class="insp-row"><i class="ic" data-icon="accept"></i><div>Não foram encontrados problemas de compatibilidade.</div></div>'}</div>`,
    buttons: [{ label: 'OK', primary: true, value: true }],
  });
}

/* =========================================================
   Imprimir e PDF
   ========================================================= */
async function printDialog() {
  closeOfficeMenu();
  const cur = Pager.currentIndex() + 1;
  const res = await dialog({
    title: 'Imprimir',
    width: 460,
    body: `${fieldset('Impressora', '<label>Nome:<select><option>Impressora predefinida do sistema</option><option>Microsoft Print to PDF</option></select></label><small>Estado: Pronta</small>')}
      <div class="two">${fieldset('Intervalo de páginas', `<label class="fcheck"><input type="radio" name="pr-r" value="all" checked> Tudo</label><label class="fcheck"><input type="radio" name="pr-r" value="cur"> Página actual (${cur})</label><label class="fcheck"><input type="radio" name="pr-r" value="sel"> Selecção</label><label class="fcheck"><input type="radio" name="pr-r" value="pages"> Páginas: <input id="pr-pages" placeholder="1-3, 5"></label>`)}
      ${fieldset('Cópias', `<label>Número de cópias:<input type="number" id="pr-copies" value="1" min="1"></label>${chk('pr-collate', 'Juntar', true)}<label>Imprimir:${sel('pr-what', [['doc', 'Documento'], ['markup', 'Documento com marcas'], ['props', 'Propriedades do documento']], 'doc')}</label>`)}</div>
      <small>Nota: o número de cópias e a impressora finais são confirmados na caixa de impressão do browser.</small>`,
    buttons: [{ label: 'OK', primary: true, value: ov => ({ r: $('input[name=pr-r]:checked', ov).value, pages: v$(ov, 'pr-pages').value, what: v$(ov, 'pr-what').value }) }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  printRange(res.r === 'cur' ? String(cur) : res.r === 'pages' ? res.pages : res.r === 'sel' ? 'sel' : '', res.what);
}

function printRange(spec, what = 'doc') {
  const hide = [];
  if (spec === 'sel') {
    const r = currentRange();
    if (r && !r.collapsed) Pager.flowBlocks().forEach(b => { if (!r.intersectsNode(b)) hide.push(b); });
  } else if (spec) {
    const pages = new Set();
    spec.split(',').forEach(p => { const [a, b] = p.split('-').map(x => parseInt(x)); if (a) for (let i = a; i <= (b || a); i++) pages.add(i); });
    Pager.flowBlocks().forEach(b => { if (!pages.has(Pager.pageOfY(b.offsetTop))) hide.push(b); });
  }
  hide.forEach(b => b.classList.add('print-hide'));
  document.body.classList.toggle('print-markup', what === 'markup');
  let propsEl = null;
  if (what === 'props') {
    const p = settings.props || {};
    propsEl = document.createElement('div');
    propsEl.id = 'print-props';
    propsEl.innerHTML = `<h2>${esc(docName)}</h2>${Object.entries({ Título: p.title, Assunto: p.subject, Autor: p.author || prefs.user, 'Palavras-chave': p.keywords, Comentários: p.comments }).map(([k, v]) => `<p><b>${k}:</b> ${esc(v || '')}</p>`).join('')}`;
    document.body.append(propsEl);
    document.body.classList.add('print-props');
  }
  deselectImage();
  window.print();
  hide.forEach(b => b.classList.remove('print-hide'));
  document.body.classList.remove('print-markup', 'print-props');
  propsEl?.remove();
}

function savePdf() {
  closeOfficeMenu();
  infoBox('Na caixa de impressão que vai abrir, escolha <b>Guardar como PDF</b> (ou <b>Microsoft Print to PDF</b>) como destino.').then(() => printRange(''));
}

/* =========================================================
   Ir Para, Colar Especial, Área de Transferência do Office
   ========================================================= */
async function goTo() {
  const kinds = [['page', 'Página'], ['heading', 'Título'], ['bookmark', 'Marcador'], ['comment', 'Comentário'], ['footnote', 'Nota de rodapé'], ['endnote', 'Nota de fim'], ['table', 'Tabela'], ['image', 'Gráfico'], ['field', 'Campo']];
  const targets = k => ({ heading: $$('h1,h2,h3,h4', editor), bookmark: $$('a[id]:not([href])', editor), comment: $$('.comment', editor), footnote: $$('sup.fn-ref', editor), endnote: $$('sup.en-ref', editor), table: $$('table', editor), image: $$('img', editor), field: $$('.wc-field', page) }[k] || []);
  let idx = -1;
  await dialog({
    title: 'Localizar e Substituir',
    width: 420,
    body: `<div class="dlg-tabs"><button class="dlg-tab" data-gt="find">Localizar</button><button class="dlg-tab" data-gt="replace">Substituir</button><button class="dlg-tab active">Ir Para</button></div>
      <div class="two"><label>Ir para quê:<select id="gt-kind" size="7" style="height:120px">${kinds.map(([v, l], i) => `<option value="${v}"${i ? '' : ' selected'}>${l}</option>`).join('')}</select></label>
      <div><label id="gt-label">Introduza o número da página:<input id="gt-num"></label><small>Pode utilizar + e - para mover em relação à localização actual.</small></div></div>
      <div class="dlg-inline"><button class="std" id="gt-prev">Anterior</button><button class="std primary" id="gt-go">Ir Para</button></div><div class="find-msg" id="gt-msg"></div>`,
    onOpen: ov => {
      $$('[data-gt]', ov).forEach(b => b.addEventListener('click', () => { ov.remove(); openFind(b.dataset.gt === 'replace'); }));
      const kind = () => v$(ov, 'gt-kind').value;
      v$(ov, 'gt-kind').addEventListener('change', () => { idx = -1; v$(ov, 'gt-label').firstChild.textContent = kind() === 'page' ? 'Introduza o número da página:' : `Introduza o número do ${kinds.find(k => k[0] === kind())[1].toLowerCase()}:`; });
      const go = dir => {
        const v = v$(ov, 'gt-num').value.trim();
        if (kind() === 'page') {
          let n = parseInt(v.replace(/[+-]/, '')) || 1;
          const cur = Pager.currentIndex() + 1;
          if (v.startsWith('+')) n = cur + n; else if (v.startsWith('-')) n = cur - n; else if (!v) n = cur + dir;
          n = Math.max(1, Math.min(Pager.count, n));
          Pager.scrollToPage(n);
          v$(ov, 'gt-msg').textContent = `Página ${n} de ${Pager.count}`;
          return;
        }
        const list = targets(kind());
        if (!list.length) { v$(ov, 'gt-msg').textContent = 'O Nexora Word não encontrou nenhum item deste tipo.'; return; }
        idx = v ? Math.max(0, Math.min(list.length - 1, parseInt(v) - 1)) : (idx + dir + list.length) % list.length;
        const t = list[idx];
        t.scrollIntoView({ block: 'center' });
        const rr = document.createRange();
        rr.selectNode(t);
        editor.focus(); setRange(rr);
        v$(ov, 'gt-msg').textContent = `${idx + 1} de ${list.length}`;
      };
      v$(ov, 'gt-go').onclick = () => go(1);
      v$(ov, 'gt-prev').onclick = () => go(-1);
    },
    buttons: [{ label: 'Fechar', value: null }],
  });
}

async function readClipboard() {
  const out = { html: '', text: '', image: null };
  try {
    for (const it of await navigator.clipboard.read()) {
      if (it.types.includes('text/html')) out.html = await (await it.getType('text/html')).text();
      if (it.types.includes('text/plain')) out.text = await (await it.getType('text/plain')).text();
      const im = it.types.find(t => t.startsWith('image/'));
      if (im) out.image = await it.getType(im);
    }
  } catch { try { out.text = await navigator.clipboard.readText(); } catch { return null; } }
  return out;
}

async function pasteSpecial() {
  const clip = await readClipboard();
  if (!clip) return infoBox('O browser não permite ler a área de transferência. Utilize <b>Ctrl+V</b>.');
  const opts = [];
  if (clip.html) opts.push(['html', 'Texto Formatado (HTML)']);
  if (clip.text) opts.push(['text', 'Texto não Formatado'], ['unicode', 'Texto Unicode não Formatado']);
  if (clip.image) opts.push(['image', 'Imagem (PNG)']);
  if (clip.text && /^https?:\/\//.test(clip.text.trim())) opts.push(['link', 'Hiperligação']);
  if (!opts.length) return infoBox('A Área de Transferência está vazia.');
  const v = await dialog({
    title: 'Colar Especial',
    width: 400,
    body: `<div class="two"><div><label class="fcheck"><input type="radio" checked> Colar</label><label class="fcheck"><input type="radio" disabled> Colar ligação</label></div><label>Como:<select id="psp" size="5" style="height:100px">${opts.map(([k, l], i) => `<option value="${k}"${i ? '' : ' selected'}>${l}</option>`).join('')}</select></label></div>`,
    buttons: [{ label: 'OK', primary: true, value: ov => v$(ov, 'psp').value }, { label: 'Cancelar', value: null }],
  });
  if (!v) return;
  if (v === 'html') exec('insertHTML', sanitize(clip.html));
  else if (v === 'image') insertImageFile(new File([clip.image], 'imagem.png', { type: clip.image.type }));
  else if (v === 'link') exec('insertHTML', `<a href="${esc(clip.text.trim())}">${esc(clip.text.trim())}</a>`);
  else exec('insertText', clip.text);
}

const OfficeClipboard = (() => {
  const items = [];
  const capture = () => {
    const s = getSelection();
    if (!s.rangeCount || s.isCollapsed) return;
    const div = document.createElement('div');
    div.append(s.getRangeAt(0).cloneContents());
    items.unshift({ html: div.innerHTML, text: s.toString() });
    if (items.length > 24) items.pop();
    if (TaskPane.kind === 'clipboard') pane();
  };
  document.addEventListener('copy', capture);
  document.addEventListener('cut', capture);
  function pane() {
    const body = TaskPane.open('clipboard', `Área de Transferência (${items.length} de 24)`, `<div class="cb-btns"><button class="std" id="cb-all">Colar Tudo</button><button class="std" id="cb-clear">Limpar Tudo</button></div><div class="cb-hint">Clique num item para colar:</div>
      <div class="cb-list">${items.map((it, i) => `<button class="cb-item" data-i="${i}"><i class="ic" data-icon="${it.html.includes('<img') ? 'image' : 'docx'}"></i><span>${esc(it.text.slice(0, 120) || '(imagem)')}</span></button>`).join('') || '<div class="om-empty">A Área de Transferência está vazia.</div>'}</div>`, { width: 230 });
    $$('.cb-item', body).forEach(b => b.addEventListener('click', () => exec('insertHTML', sanitize(items[+b.dataset.i].html))));
    $('#cb-all', body).onclick = () => exec('insertHTML', sanitize([...items].reverse().map(i => i.html).join(' ')));
    $('#cb-clear', body).onclick = () => { items.length = 0; pane(); };
  }
  return { pane };
})();

/* ---------- Seleccionar texto com formatação semelhante ---------- */
function selectSimilar() {
  const r = currentRange();
  const el = nodeEl(r?.startContainer);
  if (!el || !editor.contains(el)) return;
  const sig = n => { const c = getComputedStyle(n); return [c.fontFamily, c.fontSize, c.fontWeight, c.fontStyle, c.color, c.textDecorationLine].join('|'); };
  const target = sig(el);
  const ranges = [];
  const w = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode;
    if (!t.nodeValue.trim() || sig(t.parentElement) !== target) continue;
    const rr = document.createRange();
    rr.selectNodeContents(t);
    ranges.push(rr);
  }
  if (typeof Highlight !== 'undefined') CSS.highlights.set('wc-find', new Highlight(...ranges));
  if (ranges.length) { setRange(ranges[0].cloneRange()); const all = document.createRange(); all.setStart(ranges[0].startContainer, 0); all.setEnd(ranges.at(-1).endContainer, ranges.at(-1).endContainer.length); }
  MessageBar.show(`Foram encontrados <b>${ranges.length}</b> fragmentos de texto com formatação semelhante (realçados).`);
  setTimeout(() => MessageBar.hide(), 4000);
}

/* =========================================================
   Opções do Word
   ========================================================= */
async function showOptionsFull() {
  closeOfficeMenu();
  const P = prefs;
  const tabs = [
    { id: 'pop', label: 'Popular', html: `${fieldset('Opções mais utilizadas ao trabalhar com o Nexora Word', `${chk('op-mini', 'Mostrar a Mini Barra de Ferramentas na selecção', P.miniToolbar !== false)}${chk('op-live', 'Activar a Pré-visualização Dinâmica', P.livePreview !== false)}${chk('op-dev', 'Mostrar o separador Programador no Friso', false)}<label>Combinação de cores:${sel('op-theme', [['blue', 'Azul'], ['silver', 'Prateado'], ['black', 'Preto']], P.theme)}</label><label>Estilo das SuperSugestões:${sel('op-tips', [['full', 'Mostrar descrições de funcionalidades nas SuperSugestões'], ['simple', 'Não mostrar descrições'], ['none', 'Não mostrar SuperSugestões']], P.tips || 'full')}</label>`)}${fieldset('Personalizar a sua cópia do Nexora Word', `<div class="two"><label>Nome de utilizador:<input id="op-user" value="${esc(P.user)}"></label><label>Iniciais:<input id="op-init" value="${esc(P.initials)}"></label></div>`)}` },
    { id: 'apr', label: 'Apresentação', html: fieldset('Mostrar sempre estas marcas de formatação no ecrã', `${chk('op-marks', 'Mostrar todas as marcas de formatação', page.classList.contains('show-marks'))}${chk('op-hidden', 'Texto oculto', page.classList.contains('show-hidden'))}`) + fieldset('Opções de impressão', `${chk('op-printbg', 'Imprimir as cores e imagens de fundo', true)}${chk('op-printprops', 'Imprimir propriedades do documento', false)}`) },
    { id: 'ver', label: 'Verificação', html: fieldset('Ao corrigir a ortografia e a gramática no Nexora Word', `${chk('op-spell', 'Verificar a ortografia ao escrever', P.spell)}${chk('op-grammar', 'Marcar erros de gramática ao escrever', P.grammar !== false)}${chk('op-upper', 'Ignorar palavras em MAIÚSCULAS', P.ignoreUpper !== false)}${chk('op-nums', 'Ignorar palavras que contêm números', P.ignoreNums !== false)}`) + `<button class="std" id="op-ac">Opções de Correcção Automática...</button> <button class="std" id="op-dict">Dicionários Personalizados...</button>` },
    { id: 'gua', label: 'Guardar', html: fieldset('Guardar documentos', `<label>Guardar ficheiros neste formato:${sel('op-fmt', Object.entries(FORMATS).map(([k, f]) => [k, f.label]), P.defaultFormat || 'docx')}</label><label>Guardar informações de Recuperação Automática a cada:<input type="number" id="op-auto" value="${P.autosaveSec || 1}" min="1" style="width:60px"> segundos</label>`) },
    { id: 'ava', label: 'Avançadas', html: fieldset('Opções de edição', `${chk('op-ovrkey', 'Utilizar a tecla Insert para controlar o modo Sobrepor', P.overtypeKey !== false)}${chk('op-ovr', 'Utilizar o modo Sobrepor', !!P.overtype)}${chk('op-smartcut', 'Utilizar corte e colagem inteligentes', true)}${chk('op-ctrlclick', 'Utilizar Ctrl+Clique para seguir hiperligações', true)}`) + fieldset('Mostrar', `${chk('op-vruler', 'Mostrar a régua vertical no Esquema de Impressão', P.vruler !== false)}${chk('op-status', 'Mostrar a Barra de Estado', true)}`) },
  ];
  const res = await dialog({
    title: 'Opções do Nexora Word',
    width: 560,
    body: `<div class="opt-layout"><div class="opt-nav">${tabs.map((t, i) => `<button class="opt-tab${i ? '' : ' active'}" data-dtab="${t.id}">${t.label}</button>`).join('')}</div><div class="opt-body">${tabs.map((t, i) => `<div class="dlg-pane${i ? '' : ' active'}" data-dpane="${t.id}">${t.html}</div>`).join('')}</div></div>`,
    onOpen: ov => {
      $$('.opt-tab', ov).forEach(t => t.addEventListener('click', () => { $$('.opt-tab', ov).forEach(x => x.classList.toggle('active', x === t)); $$('.dlg-pane', ov).forEach(p => p.classList.toggle('active', p.dataset.dpane === t.dataset.dtab)); }));
      v$(ov, 'op-ac').onclick = () => Spell.autocorrectDialog();
      v$(ov, 'op-dict').onclick = () => Spell.dictionaryDialog();
    },
    buttons: [{ label: 'OK', primary: true, value: ov => ({
      miniToolbar: v$(ov, 'op-mini').checked, livePreview: v$(ov, 'op-live').checked, theme: v$(ov, 'op-theme').value, tips: v$(ov, 'op-tips').value,
      user: v$(ov, 'op-user').value.trim() || 'Utilizador', initials: v$(ov, 'op-init').value.trim() || 'U', marks: v$(ov, 'op-marks').checked, showHidden: v$(ov, 'op-hidden').checked,
      spell: v$(ov, 'op-spell').checked, grammar: v$(ov, 'op-grammar').checked, ignoreUpper: v$(ov, 'op-upper').checked, ignoreNums: v$(ov, 'op-nums').checked,
      defaultFormat: v$(ov, 'op-fmt').value, autosaveSec: Math.max(1, +v$(ov, 'op-auto').value || 1), overtypeKey: v$(ov, 'op-ovrkey').checked, overtype: v$(ov, 'op-ovr').checked,
      vruler: v$(ov, 'op-vruler').checked, statusbar: v$(ov, 'op-status').checked,
    }) }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  const { marks, showHidden, ...rest } = res;
  Object.assign(prefs, rest);
  toggleMarks(marks);
  page.classList.toggle('show-hidden', showHidden);
  StatusBar.setOvr(prefs.overtype);
  applyPrefs();
  savePrefs();
  Spell.schedule(0);
}

/* =========================================================
   Registo de comandos
   ========================================================= */
Object.assign(CMD, {
  fontDialog, paragraphDialog: () => paragraphDialog(), tabsDialog, pageSetup: () => pageSetup(), bordersDialog,
  stylesPane, modifyStyle: k => modifyStyle(k), newStyle: () => modifyStyle(null, true), saveStyle: () => modifyStyle(null, true),
  deleteStyle: async k => {
    const ok = await dialog({ title: 'Nexora Word', body: `Pretende eliminar o estilo <b>${esc(DocStyles.defs()[k]?.name)}</b> deste documento?`, buttons: [{ label: 'Sim', primary: true, value: true }, { label: 'Não', value: null }] });
    if (!ok) return;
    const cls = DocStyles.metaOf(k).cls;
    $$('.' + cls, editor).forEach(e => e.classList.remove(cls));
    DocStyles.removeCustom(k);
    changed();
    stylesPane();
  },
  selectStyleUses: k => { const m = DocStyles.metaOf(k); const els = $$(m.cls ? '.' + m.cls : m.tag, editor); if (!els.length) return; const r = document.createRange(); r.setStartBefore(els[0]); r.setEndAfter(els.at(-1)); editor.focus(); setRange(r); },
  styleSet: k => { settings.styles = JSON.parse(JSON.stringify(STYLE_SETS[k] || {})); DocStyles.apply(); changed(); },
  setTheme: k => { settings.themeColors = settings.themeFonts = undefined; DocStyles.setTheme(k); buildDropdowns(); changed(); },
  setThemeColors: k => { settings.themeColors = k; DocStyles.apply(); changed(); },
  setThemeFonts: k => { settings.themeFonts = k; DocStyles.apply(); changed(); },
  properties, inspect, markFinal, protect, compatCheck, printDialog, savePdf, goTo, pasteSpecial, selectSimilar,
  pastePlain: async () => { const c = await readClipboard(); if (c?.text) exec('insertText', c.text); else infoBox('Utilize <b>Ctrl+Shift+V</b> para colar texto não formatado.'); },
  pasteLink: async () => { const c = await readClipboard(); const t = c?.text?.trim(); if (t) exec('insertHTML', `<a href="${esc(/^(https?:|mailto:)/.test(t) ? t : 'http://' + t)}">${esc(t)}</a>`); },
  clipboardPane: () => OfficeClipboard.pane(), options: showOptionsFull,
  printPreview: () => Views.printPreview(),
});
