'use strict';
/* =========================================================
   Arranque da aplicação + régua interactiva (arrastar margens,
   avanços e tabulações; clique na régua cria uma tabulação;
   canto da régua muda o tipo de tabulação).
   ========================================================= */

/* ---------- Régua interactiva ---------- */
const Ruler = (() => {
  const hr = $('#hruler'), corner = $('#ruler-corner');
  let tabType = 'L';
  const TAB_GLYPH = { L: '└', C: '┴', R: '┘' };
  corner.addEventListener('click', () => {
    tabType = { L: 'C', C: 'R', R: 'L' }[tabType];
    corner.title = { L: 'Tabulação à Esquerda', C: 'Tabulação ao Centro', R: 'Tabulação à Direita' }[tabType];
    $('span', corner).textContent = TAB_GLYPH[tabType];
  });
  $('span', corner).textContent = TAB_GLYPH.L;

  const cur = () => rulerGeo;
  const hit = x => {
    const g = cur();
    if (!g) return null;
    for (const t of g.tabs) if (Math.abs(x - t.x) < 5) return { kind: 'tab', t };
    if (Math.abs(x - g.first) < 6) return { kind: 'first' };
    if (Math.abs(x - g.hang) < 6) return { kind: 'hang' };
    if (Math.abs(x - g.right) < 6) return { kind: 'right' };
    if (Math.abs(x - g.origin) < 5) return { kind: 'mleft' };
    if (Math.abs(x - (g.start + g.len - g.mr)) < 5) return { kind: 'mright' };
    return null;
  };

  hr.addEventListener('mousedown', e => {
    if (e.button !== 0 || !cur()) return;
    const r0 = hr.getBoundingClientRect();
    const x0 = e.clientX - r0.left;
    const g = cur();
    const target = hit(x0);
    const b = g.block;
    e.preventDefault();
    if (!target) {
      // clique na área branca: criar tabulação nessa posição
      if (!b) return;
      const cm = (x0 - g.origin) / g.cm;
      if (cm > 0.3 && x0 < g.start + g.len - g.mr) {
        const tabs = (b.dataset.tabs || '').split(',').filter(Boolean);
        tabs.push(`${tabType}:${Math.round(cm * 4) / 4}`);
        b.dataset.tabs = tabs.join(',');
        changed();
      }
      return;
    }
    const startX = e.clientX, moved = { v: false };
    const onMove = ev => {
      const dx = (ev.clientX - startX) / g.cm;
      if (Math.abs(dx) < 0.05 && !moved.v) return;
      moved.v = true;
      const x = ev.clientX - r0.left;
      if (target.kind === 'tab') {
        if (ev.clientY < r0.top - 14 || ev.clientY > r0.bottom + 14) { b.dataset.tabs = (b.dataset.tabs || '').split(',').filter(s => s !== `${target.t.type}:${target.t.v}`).join(','); document.removeEventListener('mousemove', onMove); changed(); return; }
        const cm = Math.max(0.1, (x - g.origin) / g.cm);
        b.dataset.tabs = (b.dataset.tabs || '').split(',').filter(Boolean).map(s => s === `${target.t.type}:${target.t.v}` ? `${target.t.type}:${Math.round(cm * 4) / 4}` : s).join(',');
      } else if (target.kind === 'mleft' || target.kind === 'mright') {
        const side = target.kind === 'mleft' ? 'l' : 'r';
        const edge = target.kind === 'mleft' ? g.start : g.start + g.len;
        const d = Math.abs(x - edge) / g.cm;
        settings.margins[side] = Math.max(0, Math.round(d * 4) / 4);
        applySettings();
      } else if (b) {
        const cs = getComputedStyle(b);
        if (target.kind === 'first' || target.kind === 'hang') {
          const left = parseFloat(cs.marginLeft) || 0, ind = parseFloat(cs.textIndent) || 0;
          const pos = (x - g.origin) / g.cm / MM * 10;
          if (target.kind === 'first') b.style.textIndent = Math.max(-40, pos - left / MM * 10) + 'mm';
          else b.style.marginLeft = Math.max(0, pos - ind / MM * 10) + 'mm';
        } else if (target.kind === 'right') {
          const pos = (g.start + g.len - g.mr - x) / g.cm / MM * 10;
          b.style.marginRight = Math.max(0, pos) + 'mm';
        }
      }
      drawRulers();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved.v) { History.setLabel(target.kind.startsWith('m') ? 'Margens' : 'Avanços e Tabulações'); changed(); scheduleRulers(); }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  hr.addEventListener('mousemove', e => {
    const g = cur();
    if (!g || e.buttons) return;
    const h = hit(e.clientX - hr.getBoundingClientRect().left);
    hr.style.cursor = h ? 'ew-resize' : '';
  });
  hr.addEventListener('dblclick', () => CMD.tabsDialog());
  return {};
})();

/* ---------- Arranque ---------- */
(function boot() {
  loadPrefs();
  DocStyles.apply();
  buildDropdowns();
  buildGallery();
  buildTableGrid();
  applyPrefs();
  applySettings();
  selectTab('base');
  if (!restoreAutosave()) {
    header.innerHTML = footer.innerHTML = '';
    setDocument('<p><br></p>', 'Documento1');
  }
  renderRecent();
  setTitle();
  updateUI();
  updateStatus();
  renderIcons();
  StatusBar.apply();
  ContextTabs.update();
  setView('print');
  Pager.layout();
  Review.onDocument();
  Spell.load();
  setTimeout(() => { Splash.hide(); editor.focus(); placeCaret(editor.firstElementChild || editor, true); }, 250);
})();

/* Expor módulos para depuração e automação de testes */
Object.assign(window, {
  Pager, DocStyles, History, Macros, DocxIO, Review, Spell, AutoCorrect, Views,
  References, MailMerge, WordArt, SmartArt, Charts, Equations, QuickParts,
  TableTools, ImageTools, SuperTip, TaskPane, ContextTabs, MiniBar, Preview,
  KeyTips, StatusBar, Ruler, AI,
});
