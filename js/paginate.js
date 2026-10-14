'use strict';
/* =========================================================
   Paginação real
   - Desenha uma folha por página (sombra, cor, limites, marca d'água)
   - Empurra blocos que não cabem para a página seguinte
     (equivalente a "manter linhas juntas"), respeita quebras manuais,
     "manter com o seguinte" (títulos) e "quebra de página antes"
   - Cabeçalho/rodapé repetidos em todas as páginas (editáveis em
     qualquer página), primeira página diferente, campos PÁGINA/NUMPÁGINAS
   - Números de linha e tabulações (esquerda/centro/direita)
   ========================================================= */
const Pager = (() => {
  const GAP = 14;
  let count = 1, timer = 0, running = false;
  const sheetsEl = document.createElement('div');
  sheetsEl.id = 'sheets';
  page.prepend(sheetsEl);

  const geo = () => {
    const [, h] = pageDims();
    const ph = h * MM, m = settings.margins;
    return { ph, S: ph + GAP, CH: ph - (m.t + m.b) * CM };
  };
  const enabled = () => !pagesEl.classList.contains('web-layout') && !pagesEl.classList.contains('draft-layout') && !pagesEl.classList.contains('outline-layout');

  function flowBlocks() {
    const out = [];
    for (const el of editor.children) {
      if (el.matches('ul, ol')) out.push(...el.children);
      else out.push(el);
    }
    return out;
  }

  function clearPushes(root = editor) {
    $$('.pg-push', root).forEach(b => {
      b.classList.remove('pg-push');
      b.style.removeProperty('--push');
      b.style.removeProperty('--m0');
      if (!b.getAttribute('style')) b.removeAttribute('style');
      if (!b.className) b.removeAttribute('class');
    });
  }

  function setPush(b, delta) {
    if (!b.classList.contains('pg-push')) {
      b.style.setProperty('--m0', getComputedStyle(b).marginTop);
      b.classList.add('pg-push');
    }
    const cur = parseFloat(b.style.getPropertyValue('--push')) || 0;
    b.style.setProperty('--push', Math.max(0, cur + delta) + 'px');
  }

  function pushTo(b, target) {
    for (let i = 0; i < 3; i++) {
      const d = target - b.offsetTop;
      if (Math.abs(d) < 0.5) break;
      setPush(b, d);
    }
  }

  function layout() {
    if (running) return;
    running = true;
    try {
      clearPushes();
      window.References?.renumber?.();
      layoutTabs();
      const { S, CH } = geo();
      if (enabled() && settings.columns <= 1) {
        const blocks = flowBlocks();
        let forceTarget = -1;
        const kept = new Set();
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.matches('hr.page-break, hr.section-break')) {
            forceTarget = (Math.floor(b.offsetTop / S) + 1) * S;
            continue;
          }
          if (b.matches('hr.col-break, hr.section-cont')) continue;
          const y = b.offsetTop, h = b.offsetHeight, k = Math.floor(y / S), top = k * S, bottom = top + CH;
          let target = -1;
          if (forceTarget >= 0) { if (y < forceTarget) target = forceTarget; forceTarget = -1; }
          else if (b.dataset.pbBefore === '1' && y > top + 1) target = (k + 1) * S;
          else if (y >= bottom - 0.5) target = (k + 1) * S;
          else if (y + h > bottom + 0.5 && h <= CH && y > top + 0.5) target = (k + 1) * S;
          if (target < 0) continue;
          // manter com o seguinte: títulos ou parágrafos marcados acompanham o bloco
          const prev = blocks[i - 1];
          if (prev && !kept.has(prev) && (prev.matches('h1,h2,h3,h4') || prev.dataset.keepNext === '1') && Math.floor(prev.offsetTop / S) === k && prev.offsetTop > top + 0.5) {
            kept.add(prev);
            pushTo(prev, (k + 1) * S);
            i -= 1;
            continue;
          }
          pushTo(b, target);
        }
      }
      const last = editor.lastElementChild;
      const end = last ? last.offsetTop + last.offsetHeight : 0;
      count = enabled() ? Math.max(1, Math.floor(Math.max(0, end - 1) / S) + 1) : 1;
      if (settings.columns > 1 && enabled()) count = Math.max(1, Math.ceil(end / CH));
      renderSheets();
      renderFields(editor, null);
      layoutLineNumbers();
    } finally {
      running = false;
    }
    updateStatus();
    scheduleRulers();
    positionImgBox();
    window.Review?.layoutBalloons?.();
  }

  function schedule(delay = 120) {
    clearTimeout(timer);
    timer = setTimeout(layout, delay);
  }

  /* ---------- Folhas ---------- */
  function renderSheets() {
    const { ph, S } = geo();
    const on = enabled();
    page.classList.toggle('paged', on);
    page.style.minHeight = on ? (count * S - GAP) + 'px' : '';
    while (sheetsEl.children.length < (on ? count : 0)) {
      const s = document.createElement('div');
      s.className = 'sheet';
      s.innerHTML = '<div class="wm"></div><div class="hf hf-copy" data-kind="header" contenteditable="true" data-label="Cabeçalho"></div><div class="hf hf-copy" data-kind="footer" contenteditable="true" data-label="Rodapé"></div><div class="line-nums"></div>';
      sheetsEl.append(s);
    }
    while (sheetsEl.children.length > (on ? count : 0)) sheetsEl.lastElementChild.remove();
    [...sheetsEl.children].forEach((s, k) => {
      s.style.top = k * S + 'px';
      s.style.height = ph + 'px';
      s.style.backgroundColor = settings.pageColor || '#fff';
      s.dataset.border = settings.pageBorder ? (settings.pageBorderStyle || 'double') : '';
      s.style.setProperty('--pb-color', settings.pageBorderColor || '#1f497d');
      s.style.setProperty('--hd', (settings.headerDist ?? 1.25) + 'cm');
      s.style.setProperty('--fd', (settings.footerDist ?? 1.25) + 'cm');
      s.dataset.art = settings.pageBorder ? settings.pageBorderArt || '' : '';
      $('.wm', s).textContent = settings.watermark || '';
      s.classList.toggle('grid', !!settings.gridlines);
      $$('.hf-copy', s).forEach(c => {
        const html = hfSource(c.dataset.kind, k);
        if (document.activeElement !== c && c.dataset.src !== html) { c.innerHTML = html; c.dataset.src = html; }
        renderFields(c, k);
        c.classList.toggle('has-content', !!c.textContent.trim() || !!c.querySelector('img'));
      });
    });
  }

  const hfKey = (kind, k) => {
    if (k === 0 && settings.differentFirst) return kind === 'header' ? 'firstHeader' : 'firstFooter';
    if (settings.oddEven && (k + (settings.pageStart || 1)) % 2 === 0) return kind === 'header' ? 'evenHeader' : 'evenFooter';
    return null;
  };
  const hfSource = (kind, k) => {
    const key = hfKey(kind, k);
    return key ? settings[key] || '' : (kind === 'header' ? header : footer).innerHTML;
  };

  sheetsEl.addEventListener('input', e => {
    const c = e.target.closest('.hf-copy');
    if (!c) return;
    const k = [...sheetsEl.children].indexOf(c.closest('.sheet'));
    const html = c.innerHTML;
    c.dataset.src = html;
    const key = hfKey(c.dataset.kind, k);
    if (key) settings[key] = html;
    else (c.dataset.kind === 'header' ? header : footer).innerHTML = html;
    renderSheets();
    changed('typing');
  });

  /* Modo de edição do cabeçalho/rodapé (duplo clique na margem) */
  function enterHF(copy) {
    page.classList.add('hf-mode');
    ContextTabs?.update();
    placeCaret(copy, false);
  }
  function exitHF() {
    if (!page.classList.contains('hf-mode')) return;
    page.classList.remove('hf-mode');
    ContextTabs?.update();
    placeCaret(editor.firstElementChild || editor, true);
  }
  page.addEventListener('dblclick', e => {
    const sheet = e.target.closest('.sheet') || (e.target === page ? sheetAtY(e.clientY) : null);
    const copy = e.target.closest('.hf-copy');
    if (copy) return enterHF(copy);
    if (page.classList.contains('hf-mode') && rootOf(e.target) === editor) return exitHF();
    if (!sheet) return;
    const r = sheet.getBoundingClientRect(), z = zoom / 100, m = settings.margins;
    const y = (e.clientY - r.top) / z;
    if (y < m.t * CM) enterHF($('.hf-copy[data-kind="header"]', sheet));
    else if (y > r.height / z - m.b * CM) enterHF($('.hf-copy[data-kind="footer"]', sheet));
  });
  function sheetAtY(clientY) {
    return [...sheetsEl.children].find(s => { const r = s.getBoundingClientRect(); return clientY >= r.top && clientY <= r.bottom; }) || null;
  }
  function copyOn(kind, k = currentIndex()) {
    const s = sheetsEl.children[Math.min(k, sheetsEl.children.length - 1)];
    return s ? $(`.hf-copy[data-kind="${kind}"]`, s) : null;
  }

  /* ---------- Campos ---------- */
  const numFmt = n => {
    const f = settings.pageNumFormat || '1';
    if (f === 'i') return toRoman(n);
    if (f === 'I') return toRoman(n).toUpperCase();
    if (f === 'a' || f === 'A') { let s = '', x = n; while (x > 0) { s = String.fromCharCode(97 + ((x - 1) % 26)) + s; x = Math.floor((x - 1) / 26); } return f === 'A' ? s.toUpperCase() : s; }
    if (f === '-1-') return `- ${n} -`;
    return String(n);
  };
  function fieldValue(f, k, el) {
    const start = settings.pageStart || 1;
    const p = settings.props || {};
    switch (f) {
      case 'PAGE': return numFmt(k + start);
      case 'NUMPAGES': return String(count + start - 1);
      case 'SECTIONPAGES': return String(count);
      case 'DATE': return new Date().toLocaleDateString('pt-PT', el?.dataset.format ? JSON.parse(el.dataset.format) : undefined);
      case 'TIME': return new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      case 'AUTHOR': return p.author || prefs.user;
      case 'TITLE': return p.title || docName;
      case 'SUBJECT': return p.subject || '[Assunto]';
      case 'COMPANY': return p.company || '[Empresa]';
      case 'KEYWORDS': return p.keywords || '[Palavras-chave]';
      case 'FILENAME': return docName;
      case 'USERNAME': return prefs.user;
      case 'NUMWORDS': return String((editor.innerText.match(/\S+/g) || []).length);
      case 'PAGEREF': { const t = el && editor.querySelector(`[id="${CSS.escape(el.dataset.ref || '')}"]`); return t ? numFmt(Math.floor(t.offsetTop / geo().S) + start) : 'Erro! Marcador não definido.'; }
      default: return el?.textContent || '';
    }
  }
  function renderFields(root, k) {
    const { S } = geo();
    $$('.wc-field', root).forEach(f => {
      const v = fieldValue(f.dataset.field, k ?? Math.max(0, Math.floor(f.offsetTop / S)), f);
      if (f.textContent !== v) f.textContent = v;
    });
  }

  /* ---------- Números de linha ---------- */
  function layoutLineNumbers() {
    $$('.line-nums', sheetsEl).forEach(l => { l.innerHTML = ''; });
    if (!settings.lineNumbers || settings.lineNumbers === 'none' || !enabled()) return;
    const { S } = geo(), z = zoom / 100, er = editor.getBoundingClientRect(), m = settings.margins;
    let n = 0, lastK = -1;
    for (const b of flowBlocks()) {
      if (b.matches('table, hr, .toc')) continue;
      const r = document.createRange();
      r.selectNodeContents(b);
      const tops = [];
      for (const rect of r.getClientRects()) {
        if (!rect.height) continue;
        const y = (rect.top - er.top) / z;
        if (!tops.some(t => Math.abs(t.y - y) < rect.height / z * 0.6)) tops.push({ y, h: rect.height / z });
      }
      tops.sort((a, c) => a.y - c.y);
      for (const t of tops) {
        const k = Math.floor(t.y / S);
        if (settings.lineNumbers === 'page' && k !== lastK) n = 0;
        lastK = k;
        n++;
        const sheet = sheetsEl.children[k];
        if (!sheet) continue;
        const d = document.createElement('span');
        d.textContent = n;
        d.style.top = (m.t * CM + t.y - k * S) + 'px';
        d.style.height = t.h + 'px';
        d.style.lineHeight = t.h + 'px';
        d.style.left = Math.max(2, m.l * CM - 30) + 'px';
        $('.line-nums', sheet).append(d);
      }
    }
  }

  /* ---------- Tabulações ---------- */
  const DEFAULT_TAB = 1.25 * CM;
  const parseTabs = s => (s || '').split(',').filter(Boolean).map(t => { const [a, v] = t.includes(':') ? t.split(':') : ['L', t]; return { type: a, pos: num(v) * CM }; }).sort((a, b) => a.pos - b.pos);
  function layoutTabs() {
    const tabs = $$('.wc-tab', page);
    if (!tabs.length) return;
    tabs.forEach(t => { t.style.width = '1px'; });
    const z = zoom / 100;
    for (const t of tabs) {
      const root = rootOf(t);
      if (!root) continue;
      const block = blockOf(t) || root;
      const left = root.getBoundingClientRect().left;
      const x = (t.getBoundingClientRect().left - left) / z;
      const stops = parseTabs(block.dataset?.tabs);
      let stop = stops.find(s => s.pos > x + 1);
      if (!stop) stop = { type: 'L', pos: (Math.floor(x / DEFAULT_TAB) + 1) * DEFAULT_TAB };
      let w = stop.pos - x;
      if (stop.type !== 'L') {
        const seg = document.createRange();
        seg.setStartAfter(t);
        const next = [...block.querySelectorAll('.wc-tab')].find(o => o.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_PRECEDING);
        if (next) seg.setEndBefore(next); else seg.setEnd(block, block.childNodes.length);
        const sw = seg.getBoundingClientRect().width / z;
        w -= stop.type === 'R' ? sw : sw / 2;
      }
      t.style.width = Math.max(2, w) + 'px';
    }
  }

  /* ---------- Página actual ---------- */
  function currentIndex() {
    const r = currentRange();
    if (!r) return 0;
    const sheet = nodeEl(r.startContainer)?.closest('.sheet');
    if (sheet) return [...sheetsEl.children].indexOf(sheet);
    if (!editor.contains(r.startContainer)) return 0;
    let rect = r.getBoundingClientRect();
    if (!rect.height) rect = nodeEl(r.startContainer).getBoundingClientRect();
    return Math.max(0, Math.min(count - 1, Math.floor((rect.top - editor.getBoundingClientRect().top) / (zoom / 100) / geo().S)));
  }
  function sheetRect(k = currentIndex()) {
    const s = sheetsEl.children[k];
    return s ? s.getBoundingClientRect() : page.getBoundingClientRect();
  }
  function pageOfY(y) { return Math.floor(Math.max(0, y) / geo().S) + 1; }
  function scrollToPage(n) {
    const s = sheetsEl.children[n - 1];
    if (!s) return;
    scroller.scrollTop += s.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 10;
    const target = flowBlocks().find(b => Math.floor(b.offsetTop / geo().S) === n - 1);
    if (target) placeCaret(target, true);
  }

  return {
    hfKey, layout, schedule, clearPushes, enterHF, exitHF, copyOn, renderFields, fieldValue, currentIndex, sheetRect, pageOfY, scrollToPage, flowBlocks,
    get count() { return count; }, get S() { return geo().S; }, get CH() { return geo().CH; },
  };
})();
