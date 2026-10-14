'use strict';
/* =========================================================
   Nexora Word — lógica da aplicação
   ========================================================= */

/* ---------- Utilitários ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => String(Math.round(n * 100) / 100).replace('.', ',');
const num = v => parseFloat(String(v).replace(',', '.'));
const nodeEl = n => (n?.nodeType === 1 ? n : n?.parentElement) || null;
const cap = s => s[0].toUpperCase() + s.slice(1);

const app = $('#app'), page = $('#page'), editor = $('#editor'), header = $('#doc-header'), footer = $('#doc-footer');
const scroller = $('#scroller'), pagesEl = $('#pages'), fontInput = $('#font-name'), sizeInput = $('#font-size');
const MM = 96 / 25.4, CM = MM * 10;

const FONTS = ['Arial', 'Arial Black', 'Book Antiqua', 'Bookman Old Style', 'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
const PAGE_SIZES = { A4: [210, 297], Carta: [215.9, 279.4], Legal: [215.9, 355.6], A5: [148, 210], A3: [297, 420] };
const MARGINS = {
  normal: { t: 2.5, b: 2.5, l: 3, r: 3 },
  estreita: { t: 1.27, b: 1.27, l: 1.27, r: 1.27 },
  moderada: { t: 2.54, b: 2.54, l: 1.91, r: 1.91 },
  larga: { t: 2.54, b: 2.54, l: 5.08, r: 5.08 },
};
const THEME_COLORS = ['#FFFFFF', '#000000', '#EEECE1', '#1F497D', '#4F81BD', '#C0504D', '#9BBB59', '#8064A2', '#4BACC6', '#F79646'];
const STANDARD_COLORS = ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'];
const HIGHLIGHTS = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#0000FF', '#FF0000', '#000080', '#008080', '#008000', '#800080', '#800000', '#808000', '#808080', '#C0C0C0', '#000000'];
const SYMBOLS = '€£¥©®™±≠≤≥÷×∞µαβπΩ∑√°•…–—«»§¶←→↑↓↔♥♦♣♠☺✓✗½¼¾¹²³‰′″≈∆∂∫'.split('');
const FORMATS = {
  docx: { label: 'Documento do Nexora Word (*.docx)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  doc: { label: 'Documento do Word 97-2003 (*.doc)', mime: 'application/msword' },
  html: { label: 'Página Web (*.html)', mime: 'text/html' },
  txt: { label: 'Texto Simples (*.txt)', mime: 'text/plain' },
};

/* ---------- Estado ---------- */
const defaultSettings = () => ({ size: 'A4', landscape: false, margins: { ...MARGINS.normal }, columns: 1, pageColor: '', pageBorder: false, watermark: '' });
let settings = defaultSettings();
let prefs = { theme: 'blue', user: 'Utilizador', initials: 'U', ruler: true, spell: false };
let docName = 'Documento1', docCounter = 1, dirty = false, fileHandle = null, fileFormat = 'docx';
let savedRange = null, zoom = 100, openDD = null, ctxTarget = null, selImg = null, painter = null;
let lastFore = '#FF0000', lastHighlight = '#FFFF00', lastShading = '#FFFF00';

/* ---------- Ícones ---------- */
function renderIcons(root = document) {
  $$('[data-icon]', root).forEach(el => {
    if (el.dataset.rendered) return;
    const svg = ICONS[el.dataset.icon];
    if (!svg) return;
    el.innerHTML = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
    el.dataset.rendered = '1';
  });
}

/* =========================================================
   Selecção
   ========================================================= */
const rootOf = n => nodeEl(n)?.closest?.('#editor, #doc-header, #doc-footer') || null;
const inDoc = n => !!n && page.contains(n) && !!rootOf(n);

document.addEventListener('selectionchange', () => {
  const s = getSelection();
  if (s.rangeCount && inDoc(s.anchorNode)) {
    savedRange = s.getRangeAt(0).cloneRange();
    scheduleUI();
  }
});

function currentRange() {
  const s = getSelection();
  if (s.rangeCount && inDoc(s.anchorNode)) return s.getRangeAt(0);
  return savedRange && page.contains(savedRange.startContainer) ? savedRange : null;
}

function setRange(r) {
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
  savedRange = r.cloneRange();
}

function restore() {
  if (!savedRange || !page.contains(savedRange.startContainer) || !rootOf(savedRange.startContainer)) return placeCaret(editor, false);
  rootOf(savedRange.startContainer).focus({ preventScroll: true });
  setRange(savedRange);
}

function placeCaret(el, start = true) {
  el.focus({ preventScroll: true });
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(start);
  setRange(r);
}

function exec(cmd, val = null) {
  restore();
  document.execCommand(cmd, false, val);
  changed();
}

function textNodesIn(r) {
  const root = r.commonAncestorContainer;
  const out = [];
  const push = n => {
    const start = n === r.startContainer ? r.startOffset : 0;
    const end = n === r.endContainer ? r.endOffset : n.nodeValue.length;
    if (end > start) out.push({ node: n, start, end });
  };
  if (root.nodeType === 3) { push(root); return out; }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) if (r.intersectsNode(w.currentNode)) push(w.currentNode);
  return out;
}

const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,pre';
function blockOf(n) {
  const el = nodeEl(n), root = rootOf(el);
  const b = el?.closest(BLOCKS);
  return b && root?.contains(b) && b !== root ? b : null;
}

function selectedBlocks() {
  let r = currentRange();
  if (!r) return [];
  const root = rootOf(r.commonAncestorContainer);
  if (!root) return [];
  let blocks = $$(BLOCKS, root).filter(b => r.intersectsNode(b) && !b.querySelector(BLOCKS));
  if (!blocks.length) {
    restore();
    document.execCommand('formatBlock', false, 'p');
    r = currentRange();
    const b = r && blockOf(r.startContainer);
    blocks = b ? [b] : [];
  }
  return blocks;
}

/* =========================================================
   Comandos
   ========================================================= */
const NATIVE = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList', 'indent', 'outdent', 'selectAll'];

const CMD = {
  /* Ficheiro */
  new: newDoc, open: openFile, save: () => save(), saveAs: f => saveAs(f || 'docx'), print: printDoc, close: newDoc,
  exit: exitWord, options: showOptions, about: showAbout, minimize: () => {}, fullscreen: toggleFullscreen,
  toggleRibbon: () => app.classList.toggle('ribbon-collapsed'), officeMenuClose: closeOfficeMenu,

  /* Área de transferência */
  paste: doPaste, cut: () => exec('cut'), copy: () => exec('copy'), painter: (a, el, e) => togglePainter(e),

  /* Tipo de letra */
  fontName: f => applyFont(f), fontSize: s => applyFontSize(num(s)), grow: () => stepSize(1), shrink: () => stepSize(-1),
  clearFormat, changeCase,
  highlight: () => exec('hiliteColor', lastHighlight),
  highlightColor: c => {
    if (c === 'custom') return pickColor('highlightColor');
    if (c) { lastHighlight = c; $('#bar-highlight').style.background = c; }
    exec('hiliteColor', c || 'transparent');
  },
  foreColorLast: () => exec('foreColor', lastFore),
  foreColor: c => {
    if (c === 'custom') return pickColor('foreColor');
    if (c !== '#000000') { lastFore = c; $('#bar-fore').style.background = c; }
    exec('foreColor', c);
  },

  /* Parágrafo */
  shadingLast: () => applyShading(lastShading),
  shading: c => {
    if (c === 'custom') return pickColor('shading');
    if (c) { lastShading = c; $('#bar-shading').style.background = c; }
    applyShading(c);
  },
  border: applyBorder, listStyle, lineSpacing, paraSpace, showMarks: () => toggleMarks(), sort: sortParagraphs,

  /* Estilos */
  style: applyStyle,
  galleryUp: () => $('#style-gallery').scrollBy({ left: -360, behavior: 'smooth' }),
  galleryDown: () => $('#style-gallery').scrollBy({ left: 360, behavior: 'smooth' }),

  /* Edição */
  find: () => openFind(false), replace: () => openFind(true), findNext, replaceOne, replaceAll, findClose,

  /* Inserir */
  coverPage, blankPage: () => exec('insertHTML', '<hr class="page-break"><p><br></p><hr class="page-break"><p><br></p>'),
  pageBreak: () => exec('insertHTML', '<hr class="page-break"><p><br></p>'),
  insertTable: a => insertTable(...a.split('x').map(Number)), tableDialog, image: () => $('#image-input').click(), shape: insertShape,
  link: () => linkDialog(), bookmark: bookmarkDialog, header: () => showHF(header), footer: () => showHF(footer),
  textbox: () => exec('insertHTML', '<div class="textbox"><p>[Escreva uma citação do documento ou o resumo de um ponto interessante.]</p></div><p><br></p>'),
  dropCap: () => { const b = selectedBlocks()[0]; if (b) { b.classList.toggle('dropcap'); changed(); } },
  hr: () => exec('insertHTML', '<hr><p><br></p>'),
  insertText: t => exec('insertText', t),

  /* Esquema de página */
  margins: k => { settings.margins = { ...MARGINS[k] }; applySettings(); changed(); },
  customMargins, orientation: o => { settings.landscape = o === 'landscape'; applySettings(); changed(); },
  pageSize: s => { settings.size = s; applySettings(); changed(); },
  columns: n => { settings.columns = +n; applySettings(); changed(); },
  watermark: t => { settings.watermark = t; applySettings(); changed(); },
  watermarkCustom,
  pageColor: c => { if (c === 'custom') return pickColor('pageColor'); settings.pageColor = c; applySettings(); changed(); },
  pageBorder: () => { settings.pageBorder = !settings.pageBorder; applySettings(); changed(); },

  /* Referências / Rever */
  toc: insertToc, tocUpdate: updateToc, footnote: insertFootnote,
  spell: () => setSpell(!prefs.spell), wordCount, comment: insertComment,
  deleteComments: () => { $$('.comment', editor).forEach(unwrap); changed(); },

  /* Ver */
  viewPrint: () => setView('print'), viewWeb: () => setView('web'),
  zoomDialog, zoom100: () => setZoom(100), zoomPage, zoomWidth,
  zoomIn: () => setZoom(Math.floor(zoom / 10) * 10 + 10), zoomOut: () => setZoom(Math.ceil(zoom / 10) * 10 - 10),

  /* Menu de contexto */
  tableOp,
  imgDelete: () => { ctxTarget?.remove(); deselectImage(); changed(); },
  imgOriginal: () => { if (ctxTarget) { ctxTarget.style.width = ''; ctxTarget.style.height = ''; positionImgBox(); changed(); } },
  imgWrap: w => {
    if (!ctxTarget) return;
    Object.assign(ctxTarget.style, w === 'inline' ? { float: '', margin: '' } : { float: w, margin: w === 'left' ? '0 9pt 6pt 0' : '0 0 6pt 9pt' });
    positionImgBox(); changed();
  },
  linkOpen: () => openLink(ctxTarget),
  linkEdit: () => linkDialog(ctxTarget),
  linkRemove: () => { if (ctxTarget) { unwrap(ctxTarget); changed(); } },
};

const LABELS = {
  insertText: 'Escrita', bold: 'Negrito', italic: 'Itálico', underline: 'Sublinhado', strikeThrough: 'Rasurado', subscript: 'Inferior à Linha', superscript: 'Superior à Linha',
  justifyLeft: 'Alinhar à Esquerda', justifyCenter: 'Centrar', justifyRight: 'Alinhar à Direita', justifyFull: 'Justificar', insertUnorderedList: 'Marcas', insertOrderedList: 'Numeração',
  indent: 'Aumentar Avanço', outdent: 'Diminuir Avanço', fontName: 'Tipo de Letra', fontSize: 'Tamanho do Tipo de Letra', foreColor: 'Cor do Tipo de Letra', style: 'Estilo', tableOp: 'Tabela',
};

function run(cmd, arg, el, e) {
  if (cmd !== 'undo' && cmd !== 'redo') {
    History.flush();
    History.setLabel(LABELS[cmd] || el?.dataset?.label || (el?.dataset?.tip || el?.title || '').split(' (')[0] || el?.textContent?.trim().slice(0, 40) || cmd);
  }
  Macros.onRun(cmd, arg);
  if (NATIVE.includes(cmd)) return exec(cmd);
  return CMD[cmd]?.(arg, el, e);
}

/* ---------- Tipo de letra ---------- */
function applyFont(name) {
  name = name.trim();
  if (!name) return;
  exec('fontName', name);
  fontInput.value = name;
}

function applyFontSize(pt) {
  if (!(pt >= 1 && pt <= 1638)) return;
  restore();
  const r = currentRange();
  if (!r) return;
  if (r.collapsed) {
    const span = document.createElement('span');
    span.style.fontSize = pt + 'pt';
    span.textContent = '\u200B';
    r.insertNode(span);
    const nr = document.createRange();
    nr.setStart(span.firstChild, 1);
    nr.collapse(true);
    setRange(nr);
  } else {
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    document.execCommand('styleWithCSS', false, true);
    const fonts = $$('font[size="7"]', page);
    let first = null, last = null;
    fonts.forEach(f => {
      const s = document.createElement('span');
      s.style.fontSize = pt + 'pt';
      if (f.getAttribute('face')) s.style.fontFamily = f.getAttribute('face');
      if (f.getAttribute('color')) s.style.color = f.getAttribute('color');
      while (f.firstChild) s.append(f.firstChild);
      f.replaceWith(s);
      $$('span', s).forEach(inner => { inner.style.fontSize = ''; if (!inner.getAttribute('style')) unwrap(inner); });
      first ??= s; last = s;
    });
    if (first) {
      const nr = document.createRange();
      nr.setStartBefore(first);
      nr.setEndAfter(last);
      setRange(nr);
    }
  }
  sizeInput.value = fmt(pt);
  changed();
}

function stepSize(dir) {
  const cur = num(sizeInput.value) || 11;
  let next;
  if (dir > 0) next = SIZES.find(s => s > cur) ?? Math.ceil((cur + 1) / 10) * 10;
  else next = [...SIZES].reverse().find(s => s < cur) ?? Math.max(1, cur - 1);
  applyFontSize(next);
}

function clearFormat() {
  exec('removeFormat');
  selectedBlocks().forEach(b => { b.removeAttribute('style'); });
  applyStyle('normal');
}

function changeCase(mode) {
  restore();
  const r = currentRange();
  if (!r || r.collapsed) return;
  const nodes = textNodesIn(r);
  const full = nodes.map(n => n.node.nodeValue.slice(n.start, n.end)).join('');
  const lower = full.toLocaleLowerCase('pt-PT');
  const out = {
    lower: () => lower,
    upper: () => full.toLocaleUpperCase('pt-PT'),
    title: () => lower.replace(/(^|[\s\-(["'«])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
    toggle: () => [...full].map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
    sentence: () => lower.replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
  }[mode]();
  if (out.length !== full.length) return exec('insertText', out);
  const { startContainer: sc, startOffset: so, endContainer: ec, endOffset: eo } = r;
  let i = 0;
  nodes.forEach(n => {
    const len = n.end - n.start;
    n.node.replaceData(n.start, len, out.slice(i, i + len));
    i += len;
  });
  const nr = document.createRange();
  nr.setStart(sc, so);
  nr.setEnd(ec, eo);
  setRange(nr);
  changed();
}

function pickColor(cmd) {
  const inp = document.createElement('input');
  inp.type = 'color';
  inp.style.cssText = 'position:fixed;left:-100px;top:0';
  document.body.append(inp);
  inp.addEventListener('change', () => { run(cmd, inp.value); inp.remove(); });
  inp.addEventListener('cancel', () => inp.remove());
  inp.click();
}

/* ---------- Parágrafo ---------- */
function applyShading(c) {
  selectedBlocks().forEach(b => { b.style.backgroundColor = c || ''; });
  changed();
}

function applyBorder(side) {
  const blocks = selectedBlocks();
  const line = '0.5pt solid #000';
  blocks.forEach((b, i) => {
    const s = b.style;
    if (side === 'none') { s.border = ''; s.padding = ''; return; }
    if (side === 'all') s.border = line;
    else if (side === 'box') {
      s.borderLeft = s.borderRight = line;
      if (i === 0) s.borderTop = line;
      if (i === blocks.length - 1) s.borderBottom = line;
    } else s['border' + cap(side)] = line;
    s.padding = '1pt 4pt';
  });
  changed();
}

function listStyle(arg) {
  const [type, style] = arg.split(':');
  const findList = () => nodeEl(currentRange()?.startContainer)?.closest('ul,ol');
  let list = findList();
  if (!list || list.tagName.toLowerCase() !== type) exec(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
  list = findList();
  if (list) list.style.listStyleType = style;
  changed();
}

function lineSpacing(v) {
  selectedBlocks().forEach(b => { b.style.lineHeight = v; });
  changed();
}

function paraSpace(which) {
  selectedBlocks().forEach(b => {
    if (which === 'before') b.style.marginTop = parseFloat(getComputedStyle(b).marginTop) > 0 ? '0' : '12pt';
    else b.style.marginBottom = parseFloat(getComputedStyle(b).marginBottom) > 0 ? '0' : '10pt';
  });
  changed();
}

function toggleMarks(on = !page.classList.contains('show-marks')) {
  page.classList.toggle('show-marks', on);
  $('#btn-marks').classList.toggle('active', on);
  $('#chk-marks').checked = on;
}

function sortParagraphs() {
  const blocks = selectedBlocks();
  if (blocks.length < 2) return infoBox('Seleccione dois ou mais parágrafos para ordenar.');
  const slots = blocks.map(b => { const m = document.createComment(''); b.replaceWith(m); return m; });
  [...blocks].sort((a, b) => a.textContent.localeCompare(b.textContent, 'pt')).forEach((b, i) => slots[i].replaceWith(b));
  changed();
}

/* ---------- Estilos ---------- */
const styleKeyOf = b => DocStyles.keyOfBlock(b);

function applyStyle(key) {
  const defs = DocStyles.defs(), s = defs[key];
  if (!s) return;
  const charClasses = Object.keys(defs).filter(k => defs[k].type === 'c').map(k => DocStyles.metaOf(k).cls);
  if (s.type === 'c') {
    const spans = markSelection();
    spans.forEach(sp => {
      [sp, ...$$('span', sp)].forEach(x => x.classList.remove(...charClasses));
      sp.classList.add(DocStyles.metaOf(key).cls);
    });
    selectSpans(spans);
    return changed();
  }
  const m = DocStyles.metaOf(key);
  restore();
  document.execCommand('formatBlock', false, m.tag || 'p');
  const all = Object.keys(defs).filter(k => defs[k].type === 'p').map(k => DocStyles.metaOf(k).cls).filter(Boolean);
  selectedBlocks().forEach(b => {
    b.classList.remove(...all);
    if (m.cls) b.classList.add(m.cls);
    if (!b.className) b.removeAttribute('class');
  });
  changed();
}

function buildGallery() {
  const list = DocStyles.galleryList();
  const sample = s => (s.key === 'title' ? 'AaB' : s.key.startsWith('h') ? 'AaBbCc' : 'AaBbCcDd');
  const item = s => `<button class="style-item" data-cmd="style" data-arg="${s.key}" data-tip="${esc(s.name)}" data-desc="${s.type === 'c' ? 'Estilo de carácter' : 'Estilo de parágrafo'}"><span class="sample" style="${DocStyles.sampleCss(s)}">${sample(s)}</span><span class="name">${s.key === 'normal' || s.key === 'nospacing' ? '¶ ' : ''}${esc(s.name)}</span></button>`;
  $('#style-gallery').innerHTML = list.map(item).join('');
  $('#dd-styles').innerHTML = `<div class="style-grid">${list.map(item).join('')}</div><div class="dd-sep"></div>
    <button class="dd-item" data-cmd="saveStyle"><i class="ic" data-icon="newstyle"></i>Guardar Selecção como Novo Estilo Rápido...</button>
    <button class="dd-item" data-cmd="clearFormat"><i class="ic" data-icon="clear"></i>Limpar Formatação</button>
    <button class="dd-item" data-cmd="stylesPane"><i class="ic" data-icon="stylespane"></i>Aplicar Estilos...</button>`;
  renderIcons($('#dd-styles'));
}

/* =========================================================
   Inserir
   ========================================================= */
function insertTable(rows, cols, cls = '') {
  if (!(rows > 0 && cols > 0)) return;
  const head = cls === 'tbl-light';
  const cell = t => `<${t} style="width:${(100 / cols).toFixed(2)}%"><br></${t}>`;
  const tr = (i) => `<tr>${Array.from({ length: cols }, () => cell(head && i === 0 ? 'th' : 'td')).join('')}</tr>`;
  exec('insertHTML', `<table border="1" cellspacing="0" cellpadding="0" data-new="1"${cls ? ` class="${cls}"` : ''}><tbody>${Array.from({ length: rows }, (_, i) => tr(i)).join('')}</tbody></table><p><br></p>`);
  const t = $('table[data-new]', page);
  if (!t) return;
  t.removeAttribute('data-new');
  const r = document.createRange();
  r.setStart(t.rows[0].cells[0], 0);
  r.collapse(true);
  setRange(r);
}

async function tableDialog() {
  const res = await dialog({
    title: 'Inserir Tabela',
    width: 320,
    body: `<div class="two"><label>Número de colunas:<input type="number" id="t-cols" min="1" max="63" value="5"></label>
           <label>Número de linhas:<input type="number" id="t-rows" min="1" max="500" value="2"></label></div>
           <label>Estilo:<select id="t-style"><option value="">Grelha da Tabela</option><option value="tbl-light">Grelha Clara - Cor 1</option></select></label>`,
    buttons: [{ label: 'OK', primary: true, value: ov => ({ r: +$('#t-rows', ov).value, c: +$('#t-cols', ov).value, s: $('#t-style', ov).value }) }, { label: 'Cancelar', value: null }],
  });
  if (res) insertTable(Math.min(res.r, 500), Math.min(res.c, 63), res.s);
}

function buildTableGrid() {
  const grid = $('#table-grid'), label = $('#table-grid-label');
  grid.innerHTML = Array.from({ length: 80 }, (_, i) => `<span data-cmd="insertTable" data-arg="${Math.floor(i / 10) + 1}x${(i % 10) + 1}"></span>`).join('');
  grid.addEventListener('mouseover', e => {
    const a = e.target.dataset.arg;
    if (!a) return;
    const [r, c] = a.split('x').map(Number);
    $$('span', grid).forEach(s => { const [sr, sc] = s.dataset.arg.split('x').map(Number); s.classList.toggle('on', sr <= r && sc <= c); });
    label.textContent = `Tabela ${c}x${r}`;
  });
  grid.addEventListener('mouseleave', () => { $$('span', grid).forEach(s => s.classList.remove('on')); label.textContent = 'Inserir Tabela'; });
}

function tableOp(op) {
  const cell = ctxTarget?.closest('td,th');
  if (!cell) return;
  const row = cell.parentElement, table = cell.closest('table'), idx = cell.cellIndex;
  if (op === 'rowAbove' || op === 'rowBelow') {
    const nr = row.cloneNode(true);
    $$('td,th', nr).forEach(c => { c.innerHTML = '<br>'; });
    row.parentElement.insertBefore(nr, op === 'rowAbove' ? row : row.nextSibling);
  } else if (op === 'colLeft' || op === 'colRight') {
    $$('tr', table).forEach(tr => {
      const ref = tr.cells[idx];
      const c = document.createElement(ref?.tagName || 'td');
      c.innerHTML = '<br>';
      tr.insertBefore(c, op === 'colLeft' ? ref : ref?.nextSibling || null);
    });
    $$('td,th', table).forEach(c => { c.style.width = ''; });
  } else if (op === 'delRow') {
    row.remove();
    if (!table.rows.length) table.remove();
  } else if (op === 'delCol') {
    $$('tr', table).forEach(tr => tr.cells[idx]?.remove());
    if (!table.rows[0]?.cells.length) table.remove();
  } else if (op === 'delTable') table.remove();
  changed();
}

function moveCell(cell, back) {
  const cells = $$('td,th', cell.closest('table'));
  let target = cells[cells.indexOf(cell) + (back ? -1 : 1)];
  if (!target && !back) {
    ctxTarget = cell;
    const lastRow = cell.parentElement;
    tableOp('rowBelow');
    target = lastRow.nextElementSibling?.cells[0];
  }
  if (!target) return;
  const r = document.createRange();
  r.selectNodeContents(target);
  setRange(r);
}

function insertImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(img.naturalWidth, editor.clientWidth || 600);
      exec('insertHTML', `<img src="${reader.result}" style="width:${w}px" alt="${esc(file.name || 'Imagem')}">`);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

const SHAPES = (() => {
  const st = 'fill="#4f81bd" stroke="#385d8a" stroke-width="2"';
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = (-90 + i * 36) * Math.PI / 180, r = i % 2 ? 21 : 52;
    return `${(80 + r * Math.cos(a)).toFixed(1)},${(58 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return {
    rect: `<rect x="2" y="2" width="156" height="106" ${st}/>`,
    round: `<rect x="2" y="2" width="156" height="106" rx="16" ${st}/>`,
    ellipse: `<ellipse cx="80" cy="55" rx="77" ry="52" ${st}/>`,
    triangle: `<path d="M80 3L157 107H3z" ${st}/>`,
    arrow: `<path d="M3 35h100V5l54 50-54 50V75H3z" ${st}/>`,
    star: `<polygon points="${star}" ${st}/>`,
    heart: `<path d="M80 104S6 66 6 34A28 28 0 0180 22a28 28 0 0174 12c0 32-74 70-74 70z" ${st}/>`,
    line: '<path d="M4 106L156 4" stroke="#4f81bd" stroke-width="3"/>',
  };
})();

function insertShape(kind) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="110" viewBox="0 0 160 110">${SHAPES[kind]}</svg>`;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 220;
    const x = c.getContext('2d');
    x.scale(2, 2);
    x.drawImage(img, 0, 0, 160, 110);
    exec('insertHTML', `<img src="${c.toDataURL('image/png')}" style="width:160px" alt="Forma">`);
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function coverPage() {
  const old = $('.cover', editor);
  if (old) { if (old.nextElementSibling?.matches('hr.page-break')) old.nextElementSibling.remove(); old.remove(); }
  const date = new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
  editor.insertAdjacentHTML('afterbegin', `<div class="cover"><p class="cover-title">[Escreva o título do documento]</p><p class="cover-sub">[Escreva o subtítulo do documento]</p><p class="cover-meta">${esc(prefs.user)} &nbsp;·&nbsp; ${esc(date)}</p></div><hr class="page-break">`);
  const r = document.createRange();
  r.selectNodeContents($('.cover-title', editor));
  editor.focus();
  setRange(r);
  changed();
}

async function linkDialog(existing) {
  const r = currentRange();
  existing ??= nodeEl(r?.startContainer)?.closest('a[href]');
  const text = existing ? existing.textContent : r?.toString() || '';
  const res = await dialog({
    title: existing ? 'Editar Hiperligação' : 'Inserir Hiperligação',
    width: 440,
    body: `<label>Texto a apresentar:<input id="ln-text" value="${esc(text)}"></label>
           <label>Endereço:<input id="ln-url" value="${esc(existing?.getAttribute('href') || 'http://')}"></label>`,
    buttons: [{ label: 'OK', primary: true, value: ov => ({ text: $('#ln-text', ov).value, url: $('#ln-url', ov).value.trim() }) }, { label: 'Cancelar', value: null }],
    onOpen: ov => { const u = $('#ln-url', ov); setTimeout(() => { u.focus(); u.select(); }); },
  });
  if (!res || !res.url || res.url === 'http://') return;
  let url = res.url;
  if (/^\s*(javascript|data|vbscript):/i.test(url)) return;
  if (!/^(https?:|mailto:|ftp:|#)/i.test(url)) url = (url.includes('@') && !url.includes('/') ? 'mailto:' : 'http://') + url;
  if (existing) {
    existing.setAttribute('href', url);
    existing.textContent = res.text || url;
    return changed();
  }
  if (text && res.text === text) exec('createLink', url);
  else exec('insertHTML', `<a href="${esc(url)}">${esc(res.text || url)}</a>`);
}

function openLink(a) {
  const href = a?.getAttribute('href');
  if (!href) return;
  if (href.startsWith('#')) {
    const t = editor.querySelector(`[id="${CSS.escape(href.slice(1))}"], a[name="${CSS.escape(href.slice(1))}"]`);
    t?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } else window.open(href, '_blank', 'noopener');
}

async function bookmarkDialog() {
  const res = await dialog({
    title: 'Marcador',
    width: 320,
    body: '<label>Nome do marcador:<input id="bm-name"></label><div style="color:#555">Para criar uma ligação, use a Hiperligação com o endereço <b>#nome</b>.</div>',
    buttons: [{ label: 'Adicionar', primary: true, value: ov => $('#bm-name', ov).value.trim().replace(/\s+/g, '_') }, { label: 'Cancelar', value: null }],
  });
  if (res) exec('insertHTML', `<a id="${esc(res)}" name="${esc(res)}"></a>`);
}

function showHF(el) {
  el.classList.add('visible');
  placeCaret(el, false);
}

function buildTocHtml() {
  const hs = $$('h1,h2,h3', editor).filter(h => !h.closest('.toc') && h.textContent.trim());
  const contentH = pageContentHeight();
  const items = hs.map(h => {
    if (!h.id) h.id = '_Toc' + Math.random().toString(36).slice(2, 9);
    const pg = pageAt(h.offsetTop, contentH);
    return `<p class="toc-${h.tagName[1]}"><a href="#${h.id}">${esc(h.textContent)}</a><span>${pg}</span></p>`;
  }).join('');
  return `<p class="toc-title">Índice</p>${items || '<p>Não foram encontradas entradas de índice. Aplique os estilos Cabeçalho 1, 2 ou 3 ao texto.</p>'}`;
}

function insertToc() {
  if ($('.toc', editor)) return updateToc();
  exec('insertHTML', `<div class="toc" contenteditable="false">${buildTocHtml()}</div><p><br></p>`);
  $$('.toc', editor).forEach(t => t.setAttribute('contenteditable', 'false'));
}

function updateToc() {
  const t = $('.toc', editor);
  if (!t) return insertToc();
  t.innerHTML = buildTocHtml();
  changed();
}

function insertFootnote() {
  const n = $$('sup.fn-ref', editor).length + 1;
  exec('insertHTML', `<sup class="fn-ref">${n}</sup>`);
  let fn = $('.footnotes', editor);
  if (!fn) {
    fn = document.createElement('div');
    fn.className = 'footnotes';
    editor.append(fn);
  }
  const p = document.createElement('p');
  p.innerHTML = `<sup>${n}</sup>&nbsp;`;
  fn.append(p);
  placeCaret(p, false);
  p.scrollIntoView({ block: 'center' });
  changed();
}

async function insertComment() {
  const r = currentRange();
  if (!r || r.collapsed) return infoBox('Seleccione o texto que pretende comentar.');
  const kept = r.cloneRange();
  const text = await dialog({
    title: 'Novo Comentário',
    width: 340,
    body: `<label>Comentário de ${esc(prefs.user)}:<textarea id="cm-text" style="height:70px;padding:4px"></textarea></label>`,
    buttons: [{ label: 'OK', primary: true, value: ov => $('#cm-text', ov).value.trim() }, { label: 'Cancelar', value: null }],
  });
  if (!text) return;
  const span = document.createElement('span');
  span.className = 'comment';
  span.dataset.initials = prefs.initials;
  span.dataset.n = $$('.comment', editor).length + 1;
  span.title = `${prefs.user}: ${text}`;
  span.append(kept.extractContents());
  kept.insertNode(span);
  changed();
}

function unwrap(el) {
  const p = el.parentNode;
  while (el.firstChild) p.insertBefore(el.firstChild, el);
  el.remove();
}

/* ---------- Imagens: selecção e redimensionamento ---------- */
function selectImage(img) {
  deselectImage();
  selImg = img;
  img.classList.add('selected');
  positionImgBox();
  ContextTabs.update();
}

function deselectImage() {
  const had = !!selImg;
  selImg?.classList.remove('selected');
  selImg = null;
  $('#img-box').classList.remove('visible');
  if (had) ContextTabs.update();
}

function positionImgBox() {
  const box = $('#img-box');
  if (!selImg || !editor.contains(selImg)) { if (selImg) deselectImage(); return; }
  const z = zoom / 100, pr = page.getBoundingClientRect(), ir = selImg.getBoundingClientRect();
  Object.assign(box.style, { left: (ir.left - pr.left) / z + 'px', top: (ir.top - pr.top) / z + 'px', width: ir.width / z + 'px', height: ir.height / z + 'px' });
  box.classList.add('visible');
}

$('#img-box').addEventListener('mousedown', e => {
  const h = e.target.dataset.h;
  if (!h || !selImg) return;
  e.preventDefault();
  const img = selImg, z = zoom / 100, startX = e.clientX, startW = img.offsetWidth, dir = h.includes('w') ? -1 : 1;
  const move = ev => {
    img.style.width = Math.max(16, Math.min(editor.clientWidth, startW + dir * (ev.clientX - startX) / z)) + 'px';
    img.style.height = 'auto';
    positionImgBox();
  };
  const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); changed(); };
  addEventListener('mousemove', move);
  addEventListener('mouseup', up);
});

/* ---------- Pincel de formatação ---------- */
function togglePainter(e) {
  if (painter) {
    if (e?.detail === 2) { painter.sticky = true; return; }
    return endPainter();
  }
  const r = currentRange();
  if (!r) return;
  const el = nodeEl(r.startContainer);
  const cs = getComputedStyle(el);
  let bg = '', n = el;
  while (n && n !== editor && !bg) { const c = getComputedStyle(n).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && !n.matches(BLOCKS)) bg = c; n = n.parentElement; }
  const q = c => { try { return document.queryCommandState(c); } catch { return false; } };
  painter = {
    sticky: e?.detail === 2, bold: q('bold'), italic: q('italic'), underline: q('underline'), strikeThrough: q('strikeThrough'),
    font: cs.fontFamily, size: Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2, color: cs.color, bg,
  };
  $('#btn-painter').classList.add('active');
  editor.classList.add('painter-cursor');
}

function endPainter() {
  painter = null;
  $('#btn-painter').classList.remove('active');
  editor.classList.remove('painter-cursor');
}

function applyPainter() {
  const r = currentRange();
  if (!painter || !r || r.collapsed) return;
  const p = painter;
  ['bold', 'italic', 'underline', 'strikeThrough'].forEach(c => { if (document.queryCommandState(c) !== p[c]) document.execCommand(c); });
  document.execCommand('fontName', false, p.font);
  document.execCommand('foreColor', false, p.color);
  document.execCommand('hiliteColor', false, p.bg || 'transparent');
  applyFontSize(p.size);
  if (!p.sticky) endPainter();
}

/* =========================================================
   Esquema de página, zoom, réguas e barra de estado
   ========================================================= */
function pageDims() {
  if (settings.size === 'Personalizado' && settings.customSize) PAGE_SIZES.Personalizado = settings.customSize;
  let [w, h] = PAGE_SIZES[settings.size] || PAGE_SIZES.A4;
  return settings.landscape ? [h, w] : [w, h];
}
const pageContentHeight = () => (pageDims()[1] - (settings.margins.t + settings.margins.b) * 10) * MM;

function applySettings() {
  const [w, h] = pageDims(), m = settings.margins, s = page.style;
  s.setProperty('--pw', w + 'mm');
  s.setProperty('--ph', h + 'mm');
  s.setProperty('--mt', m.t + 'cm');
  s.setProperty('--mb', m.b + 'cm');
  s.setProperty('--ml', m.l + 'cm');
  s.setProperty('--mr', m.r + 'cm');
  editor.style.columnCount = settings.columns > 1 ? settings.columns : '';
  editor.style.columnRule = settings.columns > 1 && settings.colLine ? '1px solid #000' : '';
  editor.classList.toggle('hyphenate', !!settings.hyphenate);
  page.style.backgroundColor = settings.pageColor || '';
  page.classList.toggle('bordered', !!settings.pageBorder);
  $('#btn-pageborder').classList.toggle('active', !!settings.pageBorder);
  $('#watermark').textContent = settings.watermark;
  $('#print-style').textContent = `@page { size: ${w}mm ${h}mm; margin: ${m.t}cm ${m.r}cm ${m.b}cm ${m.l}cm; } @media print { #page, .sheet { background: ${settings.pageColor || '#fff'} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`;
  DocStyles.apply();
  Pager.layout();
  scheduleRulers();
  updateStatus();
}

async function customMargins() {
  const m = settings.margins;
  const field = (id, label, v) => `<label>${label}<input type="number" step="0.1" min="0" id="${id}" value="${v}"></label>`;
  const res = await dialog({
    title: 'Configurar Página',
    width: 340,
    body: `<div style="font-weight:bold;color:#15428b;margin-bottom:6px">Margens (cm)</div><div class="two">${field('mg-t', 'Superior:', m.t)}${field('mg-b', 'Inferior:', m.b)}${field('mg-l', 'Esquerda:', m.l)}${field('mg-r', 'Direita:', m.r)}</div>`,
    buttons: [{ label: 'OK', primary: true, value: ov => ({ t: num($('#mg-t', ov).value), b: num($('#mg-b', ov).value), l: num($('#mg-l', ov).value), r: num($('#mg-r', ov).value) }) }, { label: 'Cancelar', value: null }],
  });
  if (!res || Object.values(res).some(v => !(v >= 0 && v < 20))) return;
  settings.margins = res;
  applySettings();
  changed();
}

async function watermarkCustom() {
  const t = await dialog({
    title: "Marca d'Água Impressa",
    width: 320,
    body: `<label>Texto:<input id="wm-text" value="${esc(settings.watermark || 'CONFIDENCIAL')}"></label>`,
    buttons: [{ label: 'OK', primary: true, value: ov => $('#wm-text', ov).value }, { label: 'Cancelar', value: null }],
  });
  if (t !== null) CMD.watermark(t);
}

function setView(v) {
  if (v !== 'reading' && app.classList.contains('reading')) Views.exitReading();
  pagesEl.classList.toggle('web-layout', v === 'web');
  pagesEl.classList.toggle('draft-layout', v === 'draft');
  pagesEl.classList.toggle('outline-layout', v === 'outline');
  editor.classList.toggle('outline-mode', v === 'outline');
  const map = { print: 'viewPrint', web: 'viewWeb', draft: 'viewDraft', outline: 'viewOutline', reading: 'viewReading' };
  Object.entries(map).forEach(([k, c]) => $$(`[data-cmd="${c}"]`).forEach(b => b.classList.toggle('active', k === v)));
  ContextTabs?.update();
  Pager.layout();
  scheduleRulers();
}

function setZoom(z) {
  zoom = Math.round(Math.max(10, Math.min(500, z)));
  pagesEl.style.zoom = zoom / 100;
  $('#zoom-label').textContent = zoom + '%';
  $('#zoom-slider').value = zoom <= 100 ? (zoom - 10) / 90 * 50 : 50 + (zoom - 100) / 400 * 50;
  positionImgBox();
  scheduleRulers();
}

$('#zoom-slider').addEventListener('input', e => {
  const v = +e.target.value;
  setZoom(v <= 50 ? 10 + v / 50 * 90 : 100 + (v - 50) / 50 * 400);
});

function zoomWidth() { setZoom((scroller.clientWidth - 70) / (pageDims()[0] * MM) * 100); }
function zoomPage() { setZoom((scroller.clientHeight - 40) / (pageDims()[1] * MM) * 100); }

async function zoomDialog() {
  const res = await dialog({
    title: 'Zoom',
    width: 300,
    body: `<div class="two">${[200, 100, 75, 50].map(z => `<label class="fcheck"><input type="radio" name="zr" value="${z}" ${z === zoom ? 'checked' : ''}> ${z}%</label>`).join('')}
           <label class="fcheck"><input type="radio" name="zr" value="width"> Largura da página</label><label class="fcheck"><input type="radio" name="zr" value="page"> Página inteira</label></div>
           <label>Percentagem:<input type="number" id="z-pct" min="10" max="500" value="${zoom}"></label>`,
    onOpen: ov => $$('input[name=zr]', ov).forEach(r => r.addEventListener('change', () => { if (!isNaN(+r.value)) $('#z-pct', ov).value = r.value; })),
    buttons: [{ label: 'OK', primary: true, value: ov => { const r = $('input[name=zr]:checked', ov); return r && isNaN(+r.value) ? r.value : +$('#z-pct', ov).value; } }, { label: 'Cancelar', value: null }],
  });
  if (res === 'width') zoomWidth();
  else if (res === 'page') zoomPage();
  else if (res) setZoom(res);
}

scroller.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  setZoom(zoom + (e.deltaY < 0 ? 10 : -10));
}, { passive: false });

let rulerFrame = 0;
function scheduleRulers() {
  cancelAnimationFrame(rulerFrame);
  rulerFrame = requestAnimationFrame(drawRulers);
}

let rulerGeo = null;
function drawRulers() {
  if (app.classList.contains('no-ruler')) return;
  const dpr = devicePixelRatio || 1, z = zoom / 100, cm = CM * z, m = settings.margins, web = !page.classList.contains('paged');
  const full = page.getBoundingClientRect(), sr = typeof Pager !== 'undefined' ? Pager.sheetRect() : full;
  const pr = web ? full : { left: full.left, width: full.width, top: sr.top, height: sr.height };
  const css = getComputedStyle(document.body);
  const colors = { margin: css.getPropertyValue('--ruler-bg').trim(), border: css.getPropertyValue('--ruler-border').trim() };
  const prep = (wrap) => {
    const c = $('canvas', wrap), r = wrap.getBoundingClientRect();
    c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
    c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    return { ctx, r };
  };
  const h = prep($('#hruler'));
  const start = pr.left - h.r.left, ml = web ? 0 : m.l * cm, mr = web ? 0 : m.r * cm;
  drawRuler(h.ctx, start, pr.width, ml, mr, cm, h.r.height, colors);
  // marcadores do parágrafo actual: avanço da 1.ª linha, avanço pendente/esquerdo, avanço direito e tabulações
  const r = currentRange(), b = r && blockOf(r.startContainer), cs = b && getComputedStyle(b);
  const left = cs ? parseFloat(cs.marginLeft) * z + (b.closest('li') ? parseFloat(getComputedStyle(b.closest('ul,ol')).paddingLeft) * z : 0) : 0;
  const first = cs ? parseFloat(cs.textIndent) * z : 0, right = cs ? parseFloat(cs.marginRight) * z : 0;
  const origin = start + ml;
  rulerGeo = { origin, z, cm, start, len: pr.width, ml, mr, block: b, first: origin + left + first, hang: origin + left, right: start + pr.width - mr - right, tabs: [] };
  const ctx = h.ctx, H = h.r.height, top = 3, bot = H - 3;
  const tri = (x, up) => { ctx.beginPath(); if (up) { ctx.moveTo(x - 4.5, bot - 0.5); ctx.lineTo(x + 4.5, bot - 0.5); ctx.lineTo(x, bot - 6); } else { ctx.moveTo(x - 4.5, top + 0.5); ctx.lineTo(x + 4.5, top + 0.5); ctx.lineTo(x, top + 6); } ctx.closePath(); ctx.fill(); ctx.stroke(); };
  ctx.fillStyle = '#f7f7f7'; ctx.strokeStyle = '#4c4c4c';
  tri(rulerGeo.first, false);
  tri(rulerGeo.hang, true);
  ctx.fillRect(rulerGeo.hang - 4.5, bot - 0.5, 9, 3); ctx.strokeRect(rulerGeo.hang - 4.5, bot - 0.5, 9, 3);
  tri(rulerGeo.right, true);
  (b?.dataset.tabs || '').split(',').filter(Boolean).forEach(t => {
    const [type, v] = t.includes(':') ? t.split(':') : ['L', t];
    const x = origin + num(v) * cm;
    rulerGeo.tabs.push({ x, type, v: num(v) });
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath();
    if (type === 'L') { ctx.moveTo(x, top + 5); ctx.lineTo(x, bot - 3); ctx.lineTo(x + 5, bot - 3); }
    else if (type === 'R') { ctx.moveTo(x, top + 5); ctx.lineTo(x, bot - 3); ctx.lineTo(x - 5, bot - 3); }
    else { ctx.moveTo(x, top + 5); ctx.lineTo(x, bot - 3); ctx.moveTo(x - 4, bot - 3); ctx.lineTo(x + 4, bot - 3); }
    ctx.stroke(); ctx.lineWidth = 1;
  });
  const v = prep($('#vruler'));
  v.ctx.translate(v.r.width, 0);
  v.ctx.rotate(Math.PI / 2);
  drawRuler(v.ctx, pr.top - v.r.top, pr.height, web ? 0 : m.t * cm, web ? 0 : m.b * cm, cm, v.r.width, colors);
  rulerGeo.vTop = pr.top - v.r.top;
}

function drawRuler(ctx, start, len, m1, m2, cm, thick, colors) {
  const top = 3, h = thick - 6, mid = top + h / 2;
  ctx.fillStyle = colors.margin;
  ctx.fillRect(start, top, len, h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(start + m1, top, Math.max(0, len - m1 - m2), h);
  ctx.strokeStyle = colors.border;
  ctx.strokeRect(start + 0.5, top + 0.5, len - 1, h - 1);
  ctx.fillStyle = '#404040';
  ctx.font = '9px "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const origin = start + m1, q = cm / 4, every = cm < 16 ? 2 : 1;
  for (let i = -Math.floor(m1 / q); origin + i * q <= start + len; i++) {
    const x = Math.round(origin + i * q) + 0.5;
    if (i === 0 || x < start) continue;
    if (i % 4 === 0) { if ((i / 4) % every === 0) ctx.fillText(String(Math.abs(i / 4)), x, mid + 0.5); }
    else if (q >= 4) ctx.fillRect(x - 0.5, mid - (i % 2 === 0 ? 2.5 : 1), 1, i % 2 === 0 ? 5 : 2);
  }
}

const pageAt = y => Pager.pageOfY(y);
const pageCount = () => Pager.count;

function docStats() {
  const t = editor.innerText;
  return {
    pages: pageCount(),
    words: (t.match(/\S+/g) || []).length,
    chars: t.replace(/\n/g, '').length,
    charsNoSpace: t.replace(/\s/g, '').length,
    paras: $$(BLOCKS, editor).filter(p => p.textContent.trim()).length,
    lines: $$(BLOCKS, editor).reduce((s, b) => s + Math.max(1, Math.round(b.offsetHeight / (parseFloat(getComputedStyle(b).lineHeight) || 18))), 0),
  };
}

function updateStatus() {
  const total = pageCount();
  let cur = 1;
  const r = currentRange();
  if (r && editor.contains(r.startContainer)) {
    let rect = r.getBoundingClientRect();
    if (!rect.height) rect = nodeEl(r.startContainer).getBoundingClientRect();
    cur = Math.min(total, pageAt((rect.top - editor.getBoundingClientRect().top) / (zoom / 100)));
  }
  $('#sb-page').textContent = `Página: ${cur} de ${total}`;
  $('#sb-words').textContent = `Palavras: ${(editor.innerText.match(/\S+/g) || []).length.toLocaleString('pt-PT')}`;
}

async function wordCount() {
  const s = docStats();
  const row = (l, v) => `<tr><td>${l}</td><td>${v.toLocaleString('pt-PT')}</td></tr>`;
  await dialog({
    title: 'Contar Palavras',
    width: 320,
    body: `<div style="font-weight:bold;margin-bottom:6px">Estatísticas:</div><table class="stats">${row('Páginas', s.pages)}${row('Palavras', s.words)}${row('Caracteres (sem espaços)', s.charsNoSpace)}${row('Caracteres (com espaços)', s.chars)}${row('Parágrafos', s.paras)}${row('Linhas', s.lines)}</table>`,
    buttons: [{ label: 'Fechar', primary: true, value: true }],
  });
}

function setSpell(on) {
  prefs.spell = on;
  savePrefs();
  $('#btn-spell')?.classList.toggle('active', on);
  const cs = $('#chk-spell');
  if (cs) cs.checked = on;
  window.Spell?.schedule?.(0);
}

/* ---------- Actualização da interface ---------- */
let uiFrame = 0;
function scheduleUI() {
  cancelAnimationFrame(uiFrame);
  uiFrame = requestAnimationFrame(updateUI);
}

function updateUI() {
  const r = currentRange();
  if (!r) return;
  ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].forEach(c => {
    let on = false;
    try { on = document.queryCommandState(c); } catch { /* ignorar */ }
    $$(`#ribbon [data-cmd="${c}"]`).forEach(b => b.classList.toggle('active', on));
  });
  let el = nodeEl(r.startContainer);
  if (r.startContainer.nodeType === 1 && r.startContainer.childNodes[r.startOffset]?.nodeType === 1) el = r.startContainer.childNodes[r.startOffset];
  const cs = getComputedStyle(el);
  const active = document.activeElement;
  if (active !== fontInput) fontInput.value = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
  if (active !== sizeInput) sizeInput.value = fmt(Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2);
  const b = blockOf(el);
  const key = DocStyles.keyOfChar(el) || styleKeyOf(b);
  $$('.style-item').forEach(i => i.classList.toggle('active', i.dataset.arg === key));
  ContextTabs.update();
  window.TableTools?.sync?.();
  if (b) {
    const bs = getComputedStyle(b);
    const set = (id, v) => { if (active.id !== id) $('#' + id).value = v; };
    set('ind-left', fmt(parseFloat(bs.marginLeft) / CM));
    set('ind-right', fmt(parseFloat(bs.marginRight) / CM));
    set('sp-before', fmt(parseFloat(bs.marginTop) * 0.75));
    set('sp-after', fmt(parseFloat(bs.marginBottom) * 0.75));
  }
  updateStatus();
}

/* =========================================================
   Caixas de diálogo
   ========================================================= */
function makeDraggable(dlg) {
  const bar = $('.dlg-title', dlg);
  bar.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(dlg.style.transform) || [0, 0, 0];
    const ox = +m[1], oy = +m[2], sx = e.clientX, sy = e.clientY;
    const move = ev => { dlg.style.transform = `translate(${ox + ev.clientX - sx}px, ${oy + ev.clientY - sy}px)`; };
    const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
    addEventListener('mousemove', move);
    addEventListener('mouseup', up);
  });
}

function dialog({ title, body, buttons = [{ label: 'OK', value: true, primary: true }], width = 360, onOpen }) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="dialog" style="width:${width}px"><div class="dlg-title"><span>${esc(title)}</span><button class="dlg-x" title="Fechar">✕</button></div><div class="dlg-body">${body}</div><div class="dlg-buttons"></div></div>`;
    const val = b => (typeof b.value === 'function' ? b.value(ov) : b.value);
    const close = v => { ov.remove(); resolve(v); };
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'std' + (b.primary ? ' primary' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', () => close(val(b)));
      $('.dlg-buttons', ov).append(btn);
    });
    $('.dlg-x', ov).addEventListener('click', () => close(null));
    ov.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter' && !['TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
        const p = buttons.find(b => b.primary);
        if (p) { e.preventDefault(); close(val(p)); }
      }
    });
    document.body.append(ov);
    renderIcons(ov);
    makeDraggable($('.dialog', ov));
    const first = $('input:not([type=radio]):not([type=checkbox]), select, textarea', ov) || $('.std.primary', ov);
    first?.focus();
    if (first?.select) first.select();
    onOpen?.(ov);
  });
}

const infoBox = (msg, icon = 'info') => dialog({
  title: 'Nexora Word',
  body: `<div class="msg"><i class="ic" data-icon="${icon}"></i><div>${msg}</div></div>`,
  buttons: [{ label: 'OK', primary: true, value: true }],
});

async function showOptions() {
  const res = await dialog({
    title: 'Opções do Nexora Word',
    width: 420,
    body: `<div style="font-weight:bold;color:#15428b;margin-bottom:8px">Opções mais utilizadas ao trabalhar com o Nexora Word</div>
      <label>Combinação de cores:<select id="op-theme"><option value="blue">Azul</option><option value="silver">Prateado</option><option value="black">Preto</option></select></label>
      <div class="two"><label>Nome de utilizador:<input id="op-user" value="${esc(prefs.user)}"></label><label>Iniciais:<input id="op-init" value="${esc(prefs.initials)}"></label></div>
      <label class="fcheck"><input type="checkbox" id="op-ruler" ${prefs.ruler ? 'checked' : ''}> Mostrar a régua</label>
      <label class="fcheck"><input type="checkbox" id="op-spell" ${prefs.spell ? 'checked' : ''}> Verificar a ortografia ao escrever</label>`,
    onOpen: ov => { $('#op-theme', ov).value = prefs.theme; },
    buttons: [{ label: 'OK', primary: true, value: ov => ({ theme: $('#op-theme', ov).value, user: $('#op-user', ov).value.trim() || 'Utilizador', initials: $('#op-init', ov).value.trim() || 'U', ruler: $('#op-ruler', ov).checked, spell: $('#op-spell', ov).checked }) }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  Object.assign(prefs, res);
  applyPrefs();
  savePrefs();
}

function showAbout() {
  infoBox('<b>Nexora® Word</b> — processador de texto em HTML/CSS/JavaScript.<br><br>Atalhos: Ctrl+S Guardar · Ctrl+O Abrir · Ctrl+P Imprimir · Ctrl+F Localizar · Ctrl+H Substituir · Ctrl+K Hiperligação · Ctrl+Enter Quebra de página · F7 Ortografia · F12 Guardar Como', 'question');
}

/* =========================================================
   Localizar e Substituir
   ========================================================= */
const findDlg = $('#find-dialog');
makeDraggable(findDlg);
const hasHighlightAPI = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';
if (hasHighlightAPI) document.head.insertAdjacentHTML('beforeend', '<style>::highlight(wc-find){background:#316ac5;color:#fff}</style>');

function openFind(replace) {
  findDlg.classList.add('open');
  findDlg.classList.toggle('replace-mode', replace);
  $$('.dlg-tab', findDlg).forEach(t => t.classList.toggle('active', (t.dataset.ftab === 'replace') === replace));
  const sel = currentRange()?.toString();
  if (sel && sel.length < 100 && !sel.includes('\n')) $('#find-text').value = sel;
  $('#find-msg').textContent = '';
  $('#find-text').focus();
  $('#find-text').select();
}
$$('.dlg-tab', findDlg).forEach(t => t.addEventListener('click', () => openFind(t.dataset.ftab === 'replace')));
findDlg.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); findNext(); }
  if (e.key === 'Escape') findClose();
});

function findClose() {
  findDlg.classList.remove('open');
  if (hasHighlightAPI) CSS.highlights.delete('wc-find');
  if (savedRange) restore();
}

function textIndex() {
  const nodes = [], starts = [];
  let text = '';
  const w = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { nodes.push(w.currentNode); starts.push(text.length); text += w.currentNode.nodeValue; }
  return { nodes, starts, text };
}

function locate(idx, pos) {
  let i = idx.starts.findIndex((s, k) => pos < s + idx.nodes[k].nodeValue.length);
  if (i < 0) i = idx.nodes.length - 1;
  return { node: idx.nodes[i], offset: pos - idx.starts[i] };
}

function caretOffset() {
  const r = savedRange;
  if (!r || !editor.contains(r.endContainer)) return 0;
  const pre = document.createRange();
  pre.setStart(editor, 0);
  pre.setEnd(r.endContainer, r.endOffset);
  return pre.toString().length;
}

function findMatch(term, from, wrap = true) {
  const idx = textIndex();
  const matchCase = $('#find-case').checked, whole = $('#find-word').checked;
  const hay = matchCase ? idx.text : idx.text.toLowerCase();
  const needle = matchCase ? term : term.toLowerCase();
  const isW = c => !!c && /[\p{L}\p{N}_]/u.test(c);
  const search = start => {
    let i = hay.indexOf(needle, start);
    while (i >= 0 && whole && (isW(hay[i - 1]) || isW(hay[i + needle.length]))) i = hay.indexOf(needle, i + 1);
    return i;
  };
  let i = search(from), wrapped = false;
  if (i < 0 && wrap && from > 0) { i = search(0); wrapped = true; }
  if (i < 0) return null;
  const a = locate(idx, i), b = locate(idx, i + needle.length - 1);
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset + 1);
  return { range, index: i, wrapped };
}

function showMatch(range) {
  savedRange = range.cloneRange();
  if (hasHighlightAPI) CSS.highlights.set('wc-find', new Highlight(range));
  else setRange(range);
  const rect = range.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
  if (rect.top < sr.top + 40 || rect.bottom > sr.bottom - 40) scroller.scrollTop += rect.top - sr.top - sr.height / 2;
}

function findNext() {
  const term = $('#find-text').value;
  if (!term) return;
  const m = findMatch(term, caretOffset());
  if (!m) { $('#find-msg').textContent = 'O Nexora Word concluiu a pesquisa do documento. O item de pesquisa não foi encontrado.'; return; }
  $('#find-msg').textContent = m.wrapped ? 'O Nexora Word chegou ao fim do documento e continuou a partir do início.' : '';
  showMatch(m.range);
}

function rangeMatches(term) {
  const t = savedRange?.toString() || '';
  return $('#find-case').checked ? t === term : t.toLowerCase() === term.toLowerCase();
}

function replaceOne() {
  const term = $('#find-text').value;
  if (!term) return;
  if (rangeMatches(term)) exec('insertText', $('#replace-text').value);
  findNext();
}

function replaceAll() {
  const term = $('#find-text').value, rep = $('#replace-text').value;
  if (!term) return;
  let from = 0, count = 0, m;
  while (count < 5000 && (m = findMatch(term, from, false))) {
    editor.focus({ preventScroll: true });
    setRange(m.range);
    document.execCommand('insertText', false, rep);
    from = m.index + rep.length;
    count++;
  }
  if (count) changed();
  if (hasHighlightAPI) CSS.highlights.delete('wc-find');
  $('#find-msg').textContent = count ? `O Nexora Word concluiu a pesquisa do documento e efectuou ${count} ${count === 1 ? 'substituição' : 'substituições'}.` : 'O item de pesquisa não foi encontrado.';
}

/* =========================================================
   Ficheiros
   ========================================================= */
function sanitize(html) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  $$('script, iframe, object, embed, link, meta, style, title, base, form, input, button, textarea, select', d).forEach(n => n.remove());
  const w = d.createTreeWalker(d.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (w.nextNode()) {
    const n = w.currentNode;
    if (n.nodeType === 8) { comments.push(n); continue; }
    [...n.attributes].forEach(a => {
      const name = a.name.toLowerCase();
      if (name.startsWith('on') || (['href', 'src', 'xlink:href', 'action'].includes(name) && /^\s*(javascript|vbscript):/i.test(a.value)) || (name === 'src' && /^\s*data:(?!image\/)/i.test(a.value))) n.removeAttribute(a.name);
    });
  }
  comments.forEach(c => c.remove());
  return d.body.innerHTML;
}

const textToHtml = t => t.split(/\r?\n/).map(l => `<p>${esc(l) || '<br>'}</p>`).join('');

function cleanEditorClone() {
  const c = editor.cloneNode(true);
  Pager.clearPushes(c);
  $$('.wc-preview', c).forEach(unwrap);
  $$('.selected', c).forEach(n => n.classList.remove('selected'));
  $$('.wc-tab', c).forEach(t => { t.style.width = ''; });
  $$('[style=""]', c).forEach(n => n.removeAttribute('style'));
  $$('[class=""]', c).forEach(n => n.removeAttribute('class'));
  return c;
}
const cleanEditorHtml = () => cleanEditorClone().innerHTML;

function docCss() {
  return `${DocStyles.css('body')}
body{line-height:115%}
table{border-collapse:collapse;width:100%}
td,th{border:solid windowtext 1pt;padding:0 5.4pt;vertical-align:top}
td p,th p{margin:0}
table.tbl-light th{background:#4F81BD;color:white}
table.tbl-light tr:nth-child(even) td{background:#DBE5F1}
a{color:blue;text-decoration:underline}
.toc-title{font-family:Cambria,serif;font-size:14pt;font-weight:bold;color:#365F91}
.toc-2{padding-left:11pt}.toc-3{padding-left:22pt}
.textbox{border:solid black 1pt;padding:4pt 7pt}
.comment{background:#FBD5D5}
.footnotes{border-top:solid black 1pt;font-size:10pt;margin-top:18pt}
.cover-title{font-family:Cambria,serif;font-size:40pt;color:#17365D}
.cover-sub{font-family:Cambria,serif;font-size:18pt;color:#4F81BD}
.cover-meta{color:#4F81BD;border-top:solid #4F81BD 2pt}`;
}

function buildHtml(forWord = false) {
  const c = cleanEditorClone();
  if (forWord) $$('hr.page-break', c).forEach(h => { h.outerHTML = '<br clear="all" style="page-break-before:always">'; });
  const [w, h] = pageDims(), m = settings.margins;
  const hdr = header.innerHTML.trim() ? `<div class="wc-header">${header.innerHTML}</div>` : '';
  const ftr = footer.innerHTML.trim() ? `<div class="wc-footer">${footer.innerHTML}</div>` : '';
  const wordXml = forWord ? '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->' : '';
  return `<!DOCTYPE html>
<html${forWord ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"' : ' lang="pt"'}>
<head>
<meta charset="utf-8">
${forWord ? '<meta name="ProgId" content="Word.Document"><meta name="Generator" content="Microsoft Word 12">' : ''}
<meta name="wc-settings" content="${esc(JSON.stringify(settings))}">
<title>${esc(docName)}</title>
${wordXml}
<style>
@page WordSection1{size:${w}mm ${h}mm;margin:${m.t}cm ${m.r}cm ${m.b}cm ${m.l}cm;${settings.landscape ? 'mso-page-orientation:landscape;' : ''}}
div.WordSection1{page:WordSection1}
${forWord ? '' : `body{max-width:${w}mm;margin:2cm auto;padding:0 1cm}`}
${docCss()}
</style>
</head>
<body${settings.pageColor ? ` style="background:${settings.pageColor}"` : ''}>
<div class="WordSection1">${hdr}${c.innerHTML}${ftr}</div>
</body>
</html>`;
}

async function buildBlob(f) {
  if (f === 'docx') return DocxIO.write();
  if (f === 'doc') return new Blob(['\ufeff', buildHtml(true)], { type: FORMATS.doc.mime });
  if (f === 'txt') return new Blob([editor.innerText.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });
  return new Blob([buildHtml(false)], { type: 'text/html;charset=utf-8' });
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function writeTo(handle, f) {
  const w = await handle.createWritable();
  const blob = await buildBlob(f);
  await w.write(blob);
  await w.close();
}

async function save() {
  if (fileHandle && FORMATS[fileFormat]) {
    try { await writeTo(fileHandle, fileFormat); afterSave(); return true; } catch { /* sem permissão: pedir novo destino */ }
  }
  return saveAs(fileFormat in FORMATS ? fileFormat : 'docx');
}

async function saveAs(f = 'docx') {
  closeOfficeMenu();
  if (window.showSaveFilePicker) {
    try {
      const types = Object.entries(FORMATS).sort((a, b) => (b[0] === f) - (a[0] === f)).map(([ext, x]) => ({ description: x.label, accept: { [x.mime]: ['.' + ext] } }));
      const h = await showSaveFilePicker({ suggestedName: `${docName}.${f}`, types });
      const ext = h.name.split('.').pop().toLowerCase();
      const target = FORMATS[ext] ? ext : f;
      docName = h.name.replace(/\.[^.]+$/, '');
      await writeTo(h, target);
      fileHandle = h;
      fileFormat = target;
      afterSave();
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const res = await dialog({
    title: 'Guardar Como',
    width: 420,
    body: `<label>Nome do ficheiro:<input id="sa-name" value="${esc(docName)}"></label>
           <label>Guardar com o tipo:<select id="sa-type">${Object.entries(FORMATS).map(([k, x]) => `<option value="${k}" ${k === f ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>`,
    buttons: [{ label: 'Guardar', primary: true, value: ov => ({ name: $('#sa-name', ov).value.trim().replace(/[\\/:*?"<>|]/g, '') || docName, f: $('#sa-type', ov).value }) }, { label: 'Cancelar', value: null }],
  });
  if (!res) return false;
  docName = res.name.replace(/\.(docx?|html?|txt)$/i, '');
  fileFormat = res.f;
  fileHandle = null;
  download(await buildBlob(res.f), `${docName}.${res.f}`);
  afterSave();
  return true;
}

function afterSave() {
  dirty = false;
  setTitle();
  addRecent();
  autosave();
}

function pickFileInput(accept) {
  return new Promise(resolve => {
    const inp = $('#file-input');
    inp.accept = accept;
    inp.value = '';
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.oncancel = () => resolve(null);
    inp.click();
  });
}

async function openFile() {
  closeOfficeMenu();
  if (!(await confirmDiscard())) return;
  let file = null, handle = null;
  if (window.showOpenFilePicker) {
    try {
      [handle] = await showOpenFilePicker({ types: [{ description: 'Todos os Documentos do Nexora Word', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/msword': ['.doc'], 'text/html': ['.html', '.htm'], 'text/plain': ['.txt'] } }] });
      file = await handle.getFile();
    } catch (e) {
      if (e.name === 'AbortError') return;
      handle = null;
    }
  }
  file ??= await pickFileInput('.docx,.doc,.html,.htm,.txt');
  if (!file) return;
  try {
    await loadFile(file);
    fileHandle = handle;
  } catch (e) {
    console.error(e);
    infoBox(`O Nexora Word não conseguiu abrir o ficheiro <b>${esc(file.name)}</b>.<br>${esc(e.message || '')}`, 'warning');
  }
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('Não foi possível carregar o conversor de .docx (é necessária ligação à Internet).'));
    document.head.append(s);
  });
}

async function loadFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf.slice(0, 4));
  let html;
  if (ext === 'docx' || ext === 'docm' || ext === 'dotx') {
    const res = await DocxIO.read(buf);
    if (res.html !== undefined) {
      setDocument(res.html, file.name.replace(/\.[^.]+$/, ''), 'docx', res);
      return;
    }
    html = res.altChunk;
  } else if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
    throw new Error('Os ficheiros binários do Word 97-2003 não são suportados. Guarde-o como .docx e tente novamente.');
  } else {
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(buf);
    html = ext === 'txt' || !/<(html|body|p|div|h\d|table)[\s>]/i.test(text) ? textToHtml(text) : text;
  }
  setDocument(html, file.name.replace(/\.[^.]+$/, ''), ext === 'htm' ? 'html' : ext);
}

function setDocument(html, name, format = 'docx', parts = null) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  const meta = d.querySelector('meta[name="wc-settings"]');
  settings = defaultSettings();
  if (meta) try { Object.assign(settings, JSON.parse(meta.content)); } catch { /* definições inválidas */ }
  if (parts?.settings) Object.assign(settings, parts.settings);
  const take = sel => { const el = d.querySelector(sel); const h = el ? el.innerHTML : ''; el?.remove(); return h; };
  header.innerHTML = sanitize(parts ? parts.header || '' : take('.wc-header'));
  footer.innerHTML = sanitize(parts ? parts.footer || '' : take('.wc-footer'));
  if (settings.firstHeader) settings.firstHeader = sanitize(settings.firstHeader);
  if (settings.firstFooter) settings.firstFooter = sanitize(settings.firstFooter);
  page.classList.remove('hf-mode', 'read-only');
  const root = d.querySelector('div.WordSection1') || d.body;
  editor.innerHTML = sanitize(root.innerHTML).trim() || '<p><br></p>';
  $$('br[style*="page-break"]', editor).forEach(br => {
    const hr = document.createElement('hr');
    hr.className = 'page-break';
    const p = br.closest('p, div:not(#editor)');
    if (p && editor.contains(p) && p !== editor) { p.before(hr); br.remove(); if (!p.textContent.trim() && !p.querySelector('img')) p.remove(); }
    else br.replaceWith(hr);
  });
  $$('.toc', editor).forEach(t => t.setAttribute('contenteditable', 'false'));
  if (!editor.firstElementChild) editor.innerHTML = '<p><br></p>';
  docName = name;
  fileFormat = format;
  fileHandle = null;
  dirty = false;
  savedRange = null;
  deselectImage();
  applySettings();
  setTitle();
  scroller.scrollTop = 0;
  placeCaret(editor.firstElementChild || editor, true);
  History.reset();
  window.Review?.onDocument?.();
  window.Spell?.schedule?.();
  autosave();
}

async function confirmDiscard() {
  if (!dirty) return true;
  const r = await dialog({
    title: 'Nexora Word',
    width: 400,
    body: `<div class="msg"><i class="ic" data-icon="warning"></i><div>Pretende guardar as alterações efectuadas a <b>${esc(docName)}</b>?</div></div>`,
    buttons: [{ label: 'Sim', value: 'yes', primary: true }, { label: 'Não', value: 'no' }, { label: 'Cancelar', value: null }],
  });
  if (r === 'yes') return save();
  return r === 'no';
}

const TEMPLATES = {
  blank: ['Documento em Branco', 'Página vazia', 'docx', '<p><br></p>'],
  carta: ['Carta Formal', 'Correspondência comercial', 'docx', `<p style="text-align:right">[Localidade], [data]</p><p><br></p><p>[Nome do Destinatário]<br>[Morada]<br>[Código Postal e Localidade]</p><p><br></p><p><strong>Exmos. Senhores,</strong></p><p><br></p><p>[Corpo da carta]</p><p><br></p><p>Com os melhores cumprimentos,</p><p><br><br></p><p>[Nome]</p>`],
  relatorio: ['Relatório', 'Com secções e índice', 'docx', `<p class="doc-title">Título do Relatório</p><p class="doc-subtitle">Autor · Data</p><h1>1. Introdução</h1><p>[Objectivo e contexto]</p><h1>2. Desenvolvimento</h1><p>[Análise e resultados]</p><h1>3. Conclusão</h1><p>[Síntese e recomendações]</p>`],
  cv: ['Curriculum Vitae', 'Estrutura Europass simplificada', 'docx', `<p class="doc-title">Nome Apelido</p><p style="text-align:center">morada · telefone · email@exemplo.pt</p><h2>Experiência Profissional</h2><p><strong>Função — Empresa</strong> <em>(datas)</em></p><ul><li>Responsabilidade / conquista</li></ul><h2>Formação</h2><p><strong>Curso — Instituição</strong> <em>(datas)</em></p><h2>Competências</h2><ul><li>Competência</li></ul>`],
  acta: ['Acta de Reunião', 'Com ordem do dia e decisões', 'docx', `<p class="doc-title">Acta de Reunião</p><p><strong>Data:</strong> ___ <strong>Hora:</strong> ___ <strong>Local:</strong> ___</p><p><strong>Presentes:</strong> ___</p><p><strong>Ausentes:</strong> ___</p><h2>Ordem do Dia</h2><ol><li>Ponto 1</li><li>Ponto 2</li></ol><h2>Deliberações</h2><ol><li>Ficou deliberado que…</li></ol><p><br></p><p>O Presidente, ______________  ·  O Secretário, ______________</p>`],
  fax: ['Fax / Capa', 'Capa de fax clássica', 'docx', `<p class="doc-title" style="text-align:center">TRANSMISSÃO DE FAX</p><table border="1" cellspacing="0" cellpadding="6" style="width:100%"><tr><td><b>Para:</b></td><td>&nbsp;</td><td><b>Fax:</b></td><td>&nbsp;</td></tr><tr><td><b>De:</b></td><td>&nbsp;</td><td><b>Data:</b></td><td>&nbsp;</td></tr><tr><td><b>Re:</b></td><td>&nbsp;</td><td><b>Páginas:</b></td><td>&nbsp;</td></tr></table><p><br></p><p>Mensagem:</p><p><br><br></p>`],
};

async function newDoc() {
  closeOfficeMenu();
  if (!(await confirmDiscard())) return;
  const res = await dialog({
    title: 'Novo Documento', width: 560,
    body: `<div class="cb-hint">Escolhe um modelo ou começa com um documento em branco. (Rever → Mais IA → "Documento a partir de Descrição" gera um com IA.)</div><div class="tpl-grid">${Object.entries(TEMPLATES).map(([k, [n, d, ic]]) => `<label class="tpl"><input type="radio" name="tpl" value="${k}"${k === 'blank' ? ' checked' : ''}><i class="ic" data-icon="${ic}"></i><span><b>${n}</b><small>${d}</small></span></label>`).join('')}</div>`,
    buttons: [{ label: 'Criar', primary: true, value: ov => $('input[name=tpl]:checked', ov)?.value }, { label: 'Cancelar', value: null }],
  });
  if (!res) return;
  docCounter++;
  header.innerHTML = footer.innerHTML = '';
  setDocument(TEMPLATES[res][3], res === 'blank' ? `Documento${docCounter}` : TEMPLATES[res][0]);
}

function printDoc() {
  closeOfficeMenu();
  deselectImage();
  window.print();
}

async function exitWord() {
  closeOfficeMenu();
  if (!(await confirmDiscard())) return;
  localStorage.removeItem('wc-autosave');
  document.body.innerHTML = '<div id="closed-screen"><div>O Nexora Word foi encerrado.</div><button class="std" onclick="location.reload()">Iniciar o Nexora Word</button></div>';
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

function setTitle() {
  document.title = `${docName}${fileFormat === 'doc' ? ' [Modo de Compatibilidade]' : ''} - Nexora Word`;
  $('#doc-title').textContent = document.title;
}

/* ---------- Documentos recentes, autosave e preferências ---------- */
const readRecent = () => { try { return JSON.parse(localStorage.getItem('wc-recent') || '[]'); } catch { return []; } };

function addRecent() {
  const list = readRecent().filter(r => r.name !== docName);
  list.unshift({ name: docName, fmt: fileFormat, html: buildHtml(), time: Date.now() });
  for (let n = Math.min(list.length, 9); n > 0; n--) {
    try { localStorage.setItem('wc-recent', JSON.stringify(list.slice(0, n))); return; } catch { /* quota excedida: guardar menos */ }
  }
}

function renderRecent() {
  const list = readRecent();
  $('#recent-list').innerHTML = list.length
    ? list.map((r, i) => `<button class="om-recent" data-recent="${i}" title="${esc(new Date(r.time).toLocaleString('pt-PT'))}"><span class="n">${i + 1}</span><span class="t">${esc(r.name)}.${esc(r.fmt)}</span></button>`).join('')
    : '<div class="om-empty">Não existem documentos recentes.</div>';
}

$('#recent-list').addEventListener('click', async e => {
  const b = e.target.closest('[data-recent]');
  if (!b) return;
  const r = readRecent()[+b.dataset.recent];
  closeOfficeMenu();
  if (r && (await confirmDiscard())) setDocument(r.html, r.name, r.fmt);
});

let autosaveTimer = 0;
function autosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try { localStorage.setItem('wc-autosave', JSON.stringify({ name: docName, fmt: fileFormat, html: buildHtml(), dirty, counter: docCounter })); } catch { /* quota */ }
  }, 700);
}

function restoreAutosave() {
  try {
    const a = JSON.parse(localStorage.getItem('wc-autosave') || 'null');
    if (!a) return false;
    docCounter = a.counter || 1;
    setDocument(a.html, a.name, a.fmt);
    dirty = !!a.dirty;
    return true;
  } catch { return false; }
}

function savePrefs() { try { localStorage.setItem('wc-prefs', JSON.stringify(prefs)); } catch { /* ignorar */ } }
function loadPrefs() { try { Object.assign(prefs, JSON.parse(localStorage.getItem('wc-prefs') || '{}')); } catch { /* ignorar */ } }

function applyPrefs() {
  document.body.dataset.theme = prefs.theme;
  app.classList.toggle('no-ruler', !prefs.ruler);
  $('#chk-ruler').checked = prefs.ruler;
  setSpell(prefs.spell);
  scheduleRulers();
}

function afterDocChange() {
  scheduleUI();
  scheduleRulers();
  positionImgBox();
  Pager.schedule();
  window.Spell?.schedule?.();
  window.Review?.layoutBalloons?.();
  autosave();
}

function changed(kind) {
  if (History.applying) return;
  dirty = true;
  if (kind === 'typing') History.typing();
  else History.record();
  afterDocChange();
}

/* =========================================================
   Paste e clipboard
   ========================================================= */
async function doPaste() {
  restore();
  try {
    if (navigator.clipboard?.read) {
      for (const it of await navigator.clipboard.read()) {
        if (it.types.includes('text/html')) return exec('insertHTML', sanitize(await (await it.getType('text/html')).text()));
        const imgType = it.types.find(t => t.startsWith('image/'));
        if (imgType) return insertImageFile(new File([await it.getType(imgType)], 'imagem', { type: imgType }));
        if (it.types.includes('text/plain')) return exec('insertText', await (await it.getType('text/plain')).text());
      }
    } else exec('insertText', await navigator.clipboard.readText());
  } catch {
    infoBox('As definições de segurança do browser não permitem colar a partir do botão.<br>Utilize o atalho <b>Ctrl+V</b>.');
  }
}

/* =========================================================
   Menus pendentes, menu Office, separadores e menu de contexto
   ========================================================= */
function buildDropdowns() {
  const themed = `<div class="dd-title">Tipos de Letra do Tema</div>
    <button class="dd-item font-item" data-cmd="fontName" data-arg="Cambria" style="font-family:Cambria">Cambria <small style="font:10px Segoe UI;color:#666;margin-left:auto">(Títulos)</small></button>
    <button class="dd-item font-item" data-cmd="fontName" data-arg="Calibri" style="font-family:Calibri">Calibri <small style="font:10px Segoe UI;color:#666;margin-left:auto">(Corpo)</small></button>
    <div class="dd-title" style="margin-top:2px">Todos os Tipos de Letra</div>`;
  $('#dd-fonts').innerHTML = themed + FONTS.map(f => `<button class="dd-item font-item" data-cmd="fontName" data-arg="${f}" style="font-family:'${f}'">${f}</button>`).join('');
  $('#dd-fonts').style.width = '230px';
  $('#dd-sizes').innerHTML = SIZES.map(s => `<button class="dd-item size-item" data-cmd="fontSize" data-arg="${s}">${s}</button>`).join('');
  $('#dd-sizes').style.minWidth = '50px';

  const sw = (cmd, c) => `<button class="sw" data-cmd="${cmd}" data-arg="${c}" style="background:${c}" title="${c}"></button>`;
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
    return '#' + ch.map(c => Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f)).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const variants = hex => {
    const n = parseInt(hex.slice(1), 16), l = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
    if (l > 245) return [-0.05, -0.15, -0.25, -0.35, -0.5];
    if (l < 15) return [0.5, 0.35, 0.25, 0.15, 0.05];
    if (l > 200) return [-0.1, -0.25, -0.5, -0.75, -0.9];
    return [0.8, 0.6, 0.4, -0.25, -0.5];
  };
  const palette = (cmd, extra = '') => `${extra}<div class="dd-title">Cores do Tema</div>
    <div class="pal-grid">${THEME_COLORS.map(c => `<div class="pal-col">${sw(cmd, c)}${variants(c).map(f => sw(cmd, shade(c, f))).join('')}</div>`).join('')}</div>
    <div class="dd-title">Cores Padrão</div><div class="pal-grid std-row">${STANDARD_COLORS.map(c => sw(cmd, c)).join('')}</div>
    <div class="dd-sep"></div><button class="dd-item" data-cmd="${cmd}" data-arg="custom">Mais Cores...</button>`;
  $('#dd-forecolor').innerHTML = palette('foreColor', '<button class="dd-item" data-cmd="foreColor" data-arg="#000000"><span class="sw" style="background:#000;display:inline-block"></span>Automático</button>');
  $('#dd-shading').innerHTML = palette('shading', '<button class="dd-item" data-cmd="shading" data-arg="">Sem Cor</button>');
  $('#dd-pagecolor').innerHTML = palette('pageColor', '<button class="dd-item" data-cmd="pageColor" data-arg="">Sem Cor</button>');
  $('#dd-highlight').innerHTML = `<div class="pal-hl">${HIGHLIGHTS.map(c => sw('highlightColor', c).replace('class="sw"', 'class="sw"')).join('')}</div><div class="dd-sep"></div><button class="dd-item" data-cmd="highlightColor" data-arg="">Sem Cor</button>`;
  $('#symbol-grid').innerHTML = SYMBOLS.map(s => `<button class="dd-tile" data-cmd="insertText" data-arg="${esc(s)}" title="${esc(s)}">${esc(s)}</button>`).join('');
}

function prepareDropdown(id) {
  const check = (sel, pred) => $$(sel, $('#' + id)).forEach(b => b.classList.toggle('checked', pred(b.dataset.arg)));
  if (id === 'dd-date') {
    const d = new Date();
    const f = o => d.toLocaleDateString('pt-PT', o);
    const t = o => d.toLocaleTimeString('pt-PT', o);
    const opts = [f(), f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), f({ day: 'numeric', month: 'long', year: 'numeric' }), f().replace(/\//g, '-'),
      d.toISOString().slice(0, 10), f({ month: 'long', year: 'numeric' }), t({ hour: '2-digit', minute: '2-digit' }), t(), `${f()} ${t({ hour: '2-digit', minute: '2-digit' })}`];
    $('#dd-date').innerHTML = '<div class="dd-title">Formatos disponíveis</div>' + opts.map(o => `<button class="dd-item" data-cmd="insertText" data-arg="${esc(o)}">${esc(o)}</button>`).join('');
  }
  if (id === 'dd-margins') check('.dd-big', k => JSON.stringify(MARGINS[k]) === JSON.stringify(settings.margins));
  if (id === 'dd-orientation') check('.dd-big', o => (o === 'landscape') === settings.landscape);
  if (id === 'dd-size') check('.dd-big', s => s === settings.size);
  if (id === 'dd-columns') check('.dd-big', n => +n === settings.columns);
  if (id === 'dd-linespacing') {
    const b = selectedBlocks()[0];
    const lh = b ? parseFloat(getComputedStyle(b).lineHeight) / parseFloat(getComputedStyle(b).fontSize) : 1.15;
    check('.ls', v => Math.abs(+v - lh) < 0.04);
  }
  if (id === 'dd-fonts') {
    const cur = fontInput.value.toLowerCase();
    check('.font-item', f => f.toLowerCase() === cur);
  }
  if (id === 'dd-sizes') check('.size-item', s => num(s) === num(sizeInput.value));
}

function toggleDropdown(id, anchor, trigger) {
  const dd = $('#' + id);
  if (!dd) return;
  if (openDD?.dd === dd) return closeDropdowns();
  closeDropdowns();
  closeOfficeMenu();
  lastDDAnchor = anchor;
  prepareDropdown(id);
  RIBBON.refreshChecks(id);
  DD_HOOKS[id]?.(dd);
  renderIcons(dd);
  dd.classList.add('open');
  const r = anchor.getBoundingClientRect();
  dd.style.left = Math.max(0, Math.min(r.left, innerWidth - dd.offsetWidth - 4)) + 'px';
  let top = r.bottom + 1;
  if (top + dd.offsetHeight > innerHeight - 4) top = Math.max(0, innerHeight - dd.offsetHeight - 4);
  dd.style.top = top + 'px';
  trigger.classList.add('open');
  openDD = { dd, trigger };
}

function closeDropdowns() {
  if (!openDD) return;
  openDD.dd.classList.remove('open');
  openDD.trigger.classList.remove('open');
  openDD = null;
}

function showOmPanel(name) {
  $$('.om-panel').forEach(p => p.classList.toggle('active', p.dataset.ompanel === name));
}

function toggleOfficeMenu() {
  const m = $('#office-menu');
  if (m.classList.contains('open')) return closeOfficeMenu();
  closeDropdowns();
  renderRecent();
  showOmPanel('recent');
  $$('.om-item').forEach(x => x.classList.remove('hover'));
  m.classList.add('open');
  $('#office-btn').classList.add('open');
}

function closeOfficeMenu() {
  $('#office-menu').classList.remove('open');
  $('#office-btn').classList.remove('open');
}

$('#office-btn').addEventListener('click', toggleOfficeMenu);
$$('.om-item').forEach(i => i.addEventListener('mouseenter', () => {
  $$('.om-item').forEach(x => x.classList.toggle('hover', x === i));
  showOmPanel(i.dataset.om);
}));

function selectTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  app.classList.remove('ribbon-collapsed');
}
$$('.tab').forEach(t => {
  t.addEventListener('click', () => selectTab(t.dataset.tab));
  t.addEventListener('dblclick', () => app.classList.toggle('ribbon-collapsed'));
});

function showCtx(e) {
  const t = e.target;
  ctxTarget = t;
  const cell = t.closest('td,th'), img = t.tagName === 'IMG' ? t : null, link = t.closest('a[href]');
  const html = [];
  const add = (cmd, label, icon = '', arg = '') => html.push(`<button class="dd-item" data-cmd="${cmd}"${arg ? ` data-arg="${arg}"` : ''}>${icon ? `<i class="ic" data-icon="${icon}"></i>` : ''}${label}</button>`);
  const sep = () => html.push('<div class="dd-sep"></div>');
  add('cut', 'Cortar', 'cut'); add('copy', 'Copiar', 'copy'); add('paste', 'Colar', 'paste');
  if (cell) {
    ctxTarget = cell;
    sep();
    add('tableOp', 'Inserir Linha Acima', 'table', 'rowAbove'); add('tableOp', 'Inserir Linha Abaixo', '', 'rowBelow');
    add('tableOp', 'Inserir Coluna à Esquerda', '', 'colLeft'); add('tableOp', 'Inserir Coluna à Direita', '', 'colRight');
    sep();
    add('tableOp', 'Eliminar Linha', '', 'delRow'); add('tableOp', 'Eliminar Coluna', '', 'delCol'); add('tableOp', 'Eliminar Tabela', 'close', 'delTable');
  }
  if (img) {
    ctxTarget = img;
    selectImage(img);
    sep();
    add('imgWrap', 'Em Linha com o Texto', 'image', 'inline'); add('imgWrap', 'Moldar à Esquerda', '', 'left'); add('imgWrap', 'Moldar à Direita', '', 'right');
    add('imgOriginal', 'Repor Tamanho Original'); add('imgDelete', 'Eliminar Imagem', 'close');
  }
  if (link && !img) {
    ctxTarget = link;
    sep();
    add('linkOpen', 'Abrir Hiperligação', 'link'); add('linkEdit', 'Editar Hiperligação...'); add('linkRemove', 'Remover Hiperligação');
  } else if (!img) { sep(); add('link', 'Hiperligação...', 'link'); }
  sep();
  add('aiRewrite', 'Reescrever com IA', 'ai'); add('aiFix', 'Corrigir com IA', 'spell'); add('aiTranslate', 'Traduzir com IA', 'translate');
  sep();
  add('insertUnorderedList', 'Marcas', 'bullets'); add('insertOrderedList', 'Numeração', 'numbering');
  add('selectAll', 'Seleccionar Tudo');
  const m = $('#ctx-menu');
  m.innerHTML = html.join('');
  renderIcons(m);
  m.classList.add('open');
  m.style.left = Math.min(e.clientX, innerWidth - m.offsetWidth - 4) + 'px';
  m.style.top = Math.min(e.clientY, innerHeight - m.offsetHeight - 4) + 'px';
}
const hideCtx = () => $('#ctx-menu').classList.remove('open');

/* =========================================================
   Eventos globais
   ========================================================= */
document.addEventListener('mousedown', e => {
  const t = e.target;
  if (t.closest('#ribbon button, #tabs button, #titlebar button, .dropdown, #office-menu, #statusbar button, .gallery, .sw') && !t.closest('input, select, label')) e.preventDefault();
  if (openDD && !t.closest('.dropdown') && !t.closest('[data-dropdown]')) closeDropdowns();
  if (!t.closest('#office-menu') && !t.closest('#office-btn')) closeOfficeMenu();
  if (!t.closest('#ctx-menu')) hideCtx();
});

document.addEventListener('click', e => {
  const dd = e.target.closest('[data-dropdown]');
  if (dd) return toggleDropdown(dd.dataset.dropdown, dd.closest('.combo, .split') || dd, dd);
  const b = e.target.closest('[data-cmd]');
  if (!b || b.disabled) return;
  if (b.closest('.dropdown, #office-menu')) { closeDropdowns(); closeOfficeMenu(); hideCtx(); }
  run(b.dataset.cmd, b.dataset.arg, b, e);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDropdowns(); closeOfficeMenu(); hideCtx(); if (painter) endPainter(); }
  if (e.key === 'F7') { e.preventDefault(); return run('spell'); }
  if (e.key === 'F12') { e.preventDefault(); return run('saveAs'); }
  if (e.key === 'F1') { e.preventDefault(); return run('about'); }
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  let cmd = null;
  if (e.key === 'Enter') cmd = 'pageBreak';
  else if (e.key === '>' || e.code === 'BracketRight') cmd = 'grow';
  else if (e.key === '<' || e.code === 'BracketLeft') cmd = 'shrink';
  else if (e.key === '*') cmd = 'showMarks';
  else cmd = { s: 'save', o: 'open', n: 'new', p: 'print', f: 'find', h: 'replace', k: 'link', e: 'justifyCenter', l: 'justifyLeft', r: 'justifyRight', j: 'justifyFull' }[k] || null;
  if (cmd) { e.preventDefault(); run(cmd); }
});

/* Editor */
editor.addEventListener('input', () => {
  if (!editor.firstElementChild || editor.innerHTML === '<br>') {
    editor.innerHTML = '<p><br></p>';
    placeCaret(editor.firstElementChild, true);
  }
  changed('typing');
});

editor.addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selImg) {
    e.preventDefault();
    selImg.remove();
    deselectImage();
    return changed();
  }
  if (selImg && e.key.length === 1) deselectImage();
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const el = nodeEl(currentRange()?.startContainer);
  const cell = el?.closest('td,th');
  if (cell) return moveCell(cell, e.shiftKey);
  if (el?.closest('li')) return exec(e.shiftKey ? 'outdent' : 'indent');
  if (!e.shiftKey) exec('insertHTML', '<span class="wc-tab" contenteditable="false">\t</span>&#8203;');
});

editor.addEventListener('click', e => {
  const t = e.target;
  if (t.tagName === 'IMG') selectImage(t);
  else deselectImage();
  const a = t.closest('a[href]');
  if (a && (e.ctrlKey || a.closest('.toc'))) { e.preventDefault(); openLink(a); }
});
editor.addEventListener('mouseover', e => {
  const a = e.target.closest('a[href]');
  if (a && !a.title && !a.closest('.toc')) a.title = `${a.getAttribute('href')}\nCtrl+Clique para seguir a ligação`;
});
editor.addEventListener('mouseup', () => { if (painter) setTimeout(applyPainter, 0); });
editor.addEventListener('mousedown', () => { if (hasHighlightAPI) CSS.highlights.delete('wc-find'); });

editor.addEventListener('paste', e => {
  const cd = e.clipboardData;
  const html = cd.getData('text/html');
  const img = [...cd.items].find(i => i.kind === 'file' && i.type.startsWith('image/'));
  if (img && !html) { e.preventDefault(); return insertImageFile(img.getAsFile()); }
  if (html) { e.preventDefault(); exec('insertHTML', sanitize(html)); }
});

editor.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
editor.addEventListener('drop', e => {
  const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  const r = document.caretRangeFromPoint?.(e.clientX, e.clientY);
  if (r) { editor.focus(); setRange(r); }
  files.forEach(insertImageFile);
});

page.addEventListener('contextmenu', e => {
  if (!rootOf(e.target)) return;
  e.preventDefault();
  showCtx(e);
});

page.addEventListener('mousedown', e => {
  if (e.target !== page && !e.target.matches('#watermark, #sheets, .sheet, .sheet .wm, .line-nums, .line-nums *')) return;
  if (e.detail > 1) return;
  e.preventDefault();
  if (page.classList.contains('hf-mode')) Pager.exitHF();
  const er = editor.getBoundingClientRect();
  const x = Math.max(er.left + 2, Math.min(er.right - 2, e.clientX)), y = Math.max(er.top + 2, Math.min(er.bottom - 2, e.clientY));
  const r = document.caretRangeFromPoint?.(x, y);
  editor.focus();
  if (r && editor.contains(r.startContainer)) setRange(r);
  else placeCaret(editor, false);
});

/* Campos do friso */
fontInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyFont(fontInput.value); } if (e.key === 'Escape') restore(); });
sizeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyFontSize(num(sizeInput.value)); } if (e.key === 'Escape') restore(); });
[fontInput, sizeInput].forEach(i => i.addEventListener('focus', () => i.select()));

[['ind-left', 'marginLeft', 'cm'], ['ind-right', 'marginRight', 'cm'], ['sp-before', 'marginTop', 'pt'], ['sp-after', 'marginBottom', 'pt']].forEach(([id, prop, unit]) => {
  $('#' + id).addEventListener('change', e => {
    const v = num(e.target.value);
    if (isNaN(v)) return;
    selectedBlocks().forEach(b => { b.style[prop] = v + unit; });
    changed();
  });
});

$('#chk-ruler').addEventListener('change', e => { prefs.ruler = e.target.checked; applyPrefs(); savePrefs(); });
$('#chk-marks').addEventListener('change', e => toggleMarks(e.target.checked));
$('#chk-spell')?.addEventListener('change', e => setSpell(e.target.checked));

$('#image-input').addEventListener('change', e => { [...e.target.files].forEach(insertImageFile); e.target.value = ''; });

scroller.addEventListener('scroll', () => { scheduleRulers(); hideCtx(); });
new ResizeObserver(() => { scheduleRulers(); positionImgBox(); }).observe(scroller);
new ResizeObserver(() => { scheduleRulers(); }).observe(page);

window.addEventListener('beforeunload', e => { if (dirty) { autosave(); } });

/* O arranque está em js/boot.js (carregado depois de todos os módulos) */
window.CMD = CMD;
