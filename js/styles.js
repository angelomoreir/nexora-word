'use strict';
/* =========================================================
   Estilos do documento (parágrafo + carácter), temas e
   geração de CSS. As definições são guardadas no documento.
   ========================================================= */
const DocStyles = (() => {
  const THEMES = {
    office: { name: 'Office', major: 'Cambria', minor: 'Calibri', dk2: '#1F497D', lt2: '#EEECE1', accents: ['#4F81BD', '#C0504D', '#9BBB59', '#8064A2', '#4BACC6', '#F79646'] },
    aspecto: { name: 'Aspecto', major: 'Verdana', minor: 'Verdana', dk2: '#323232', lt2: '#E3DED1', accents: ['#F07F09', '#9F2936', '#1B587C', '#4E8542', '#604878', '#C19859'] },
    civico: { name: 'Cívico', major: 'Georgia', minor: 'Georgia', dk2: '#646B86', lt2: '#C5D1D7', accents: ['#D16349', '#CCB400', '#8CADAE', '#8C7B70', '#8FB08C', '#D19049'] },
    atrio: { name: 'Átrio', major: 'Lucida Sans Unicode', minor: 'Lucida Sans Unicode', dk2: '#464646', lt2: '#DEF5FA', accents: ['#2DA2BF', '#DA1F28', '#EB641B', '#39639D', '#474B78', '#7D3C4A'] },
    equidade: { name: 'Equidade', major: 'Franklin Gothic Book', minor: 'Perpetua', dk2: '#696464', lt2: '#E9E5DC', accents: ['#D34817', '#9B2D1F', '#A28E6A', '#956251', '#918485', '#855D5D'] },
    fluxo: { name: 'Fluxo', major: 'Calibri', minor: 'Constantia', dk2: '#04617B', lt2: '#DBF5F9', accents: ['#0F6FC6', '#009DD9', '#0BD0D9', '#10CF9B', '#7CCA62', '#A5C249'] },
    fundicao: { name: 'Fundição', major: 'Rockwell', minor: 'Rockwell', dk2: '#676A55', lt2: '#EAEBDE', accents: ['#72A376', '#B0CCB0', '#A8CDD7', '#C0BEAF', '#CEC597', '#E8B7B7'] },
    mediana: { name: 'Mediana', major: 'Tw Cen MT', minor: 'Tw Cen MT', dk2: '#775F55', lt2: '#EBDDC3', accents: ['#94B6D2', '#DD8047', '#A5AB81', '#D8B25C', '#7BA79D', '#968C8C'] },
    metro: { name: 'Metro', major: 'Consolas', minor: 'Corbel', dk2: '#4E5B6F', lt2: '#D6ECFF', accents: ['#7FD13B', '#EA157A', '#FEB80A', '#00ADDC', '#738AC8', '#1AB39F'] },
    modulo: { name: 'Módulo', major: 'Corbel', minor: 'Corbel', dk2: '#5A6378', lt2: '#D4D4D6', accents: ['#F0AD00', '#60B5CC', '#E66C7D', '#6BB76D', '#E88651', '#C64847'] },
    opulento: { name: 'Opulento', major: 'Trebuchet MS', minor: 'Trebuchet MS', dk2: '#B13F9A', lt2: '#F4E7ED', accents: ['#B83D68', '#AC66BB', '#DE6C36', '#F9B639', '#CF6DA4', '#FA8D3D'] },
    origem: { name: 'Origem', major: 'Century Schoolbook', minor: 'Century Schoolbook', dk2: '#575F6D', lt2: '#FFF39D', accents: ['#FE8637', '#7598D9', '#B32C16', '#F5CD2D', '#AEBAD5', '#777C84'] },
    papel: { name: 'Papel', major: 'Constantia', minor: 'Constantia', dk2: '#444D26', lt2: '#FEFAC9', accents: ['#A5B592', '#F3A447', '#E7BC29', '#D092A7', '#9C85C0', '#809EC2'] },
    solsticio: { name: 'Solstício', major: 'Gill Sans MT', minor: 'Gill Sans MT', dk2: '#4F271C', lt2: '#E7DEC9', accents: ['#3891A7', '#FEB80A', '#C32D2E', '#84AA33', '#964305', '#475A8D'] },
    tecnico: { name: 'Técnico', major: 'Franklin Gothic Book', minor: 'Arial', dk2: '#3B3B3B', lt2: '#D4D2D0', accents: ['#6EA0B0', '#CCAF0A', '#8D89A4', '#748560', '#9E9273', '#7E848D'] },
    urbano: { name: 'Urbano', major: 'Trebuchet MS', minor: 'Georgia', dk2: '#424456', lt2: '#DEDEDE', accents: ['#53548A', '#438086', '#A04DA3', '#C4652D', '#8B5D3D', '#5C92B5'] },
  };

  const shadeHex = (hex, f) => {
    const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
    return '#' + ch.map(c => Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f)).toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  /* chave -> etiqueta HTML/classe e nomes Word (para .docx) */
  const META = {
    normal: { tag: 'p', id: 'Normal', w: 'Normal' },
    nospacing: { tag: 'p', cls: 'no-spacing', id: 'NoSpacing', w: 'No Spacing' },
    h1: { tag: 'h1', id: 'Heading1', w: 'heading 1' },
    h2: { tag: 'h2', id: 'Heading2', w: 'heading 2' },
    h3: { tag: 'h3', id: 'Heading3', w: 'heading 3' },
    h4: { tag: 'h4', id: 'Heading4', w: 'heading 4' },
    title: { tag: 'p', cls: 'doc-title', id: 'Title', w: 'Title' },
    subtitle: { tag: 'p', cls: 'doc-subtitle', id: 'Subtitle', w: 'Subtitle' },
    quote: { tag: 'p', cls: 'quote', id: 'Quote', w: 'Quote' },
    iquote: { tag: 'p', cls: 'intense-quote', id: 'IntenseQuote', w: 'Intense Quote' },
    listpara: { tag: 'p', cls: 'list-para', id: 'ListParagraph', w: 'List Paragraph' },
    caption: { tag: 'p', cls: 'caption', id: 'Caption', w: 'caption' },
    emphasis: { cls: 'cs-emphasis', id: 'Emphasis', w: 'Emphasis' },
    strong: { cls: 'cs-strong', id: 'Strong', w: 'Strong' },
    subtle: { cls: 'cs-subtle', id: 'SubtleEmphasis', w: 'Subtle Emphasis' },
    intense: { cls: 'cs-intense', id: 'IntenseEmphasis', w: 'Intense Emphasis' },
    subtleref: { cls: 'cs-subtleref', id: 'SubtleReference', w: 'Subtle Reference' },
    intenseref: { cls: 'cs-intenseref', id: 'IntenseReference', w: 'Intense Reference' },
    booktitle: { cls: 'cs-booktitle', id: 'BookTitle', w: 'Book Title' },
  };

  function builtin(t) {
    const a1 = t.accents[0], a2 = t.accents[1];
    return {
      normal: { name: 'Normal', type: 'p', font: t.minor, size: 11, color: '#000000', before: 0, after: 10, line: 1.15 },
      nospacing: { name: 'Sem Espaçamento', type: 'p', before: 0, after: 0, line: 1 },
      h1: { name: 'Cabeçalho 1', type: 'p', font: t.major, size: 14, bold: true, color: shadeHex(a1, -0.25), before: 24, after: 0, keepNext: true, outline: 0 },
      h2: { name: 'Cabeçalho 2', type: 'p', font: t.major, size: 13, bold: true, color: a1, before: 10, after: 0, keepNext: true, outline: 1 },
      h3: { name: 'Cabeçalho 3', type: 'p', font: t.major, size: 11, bold: true, color: a1, before: 10, after: 0, keepNext: true, outline: 2 },
      h4: { name: 'Cabeçalho 4', type: 'p', font: t.major, size: 11, bold: true, italic: true, color: a1, before: 10, after: 0, keepNext: true, outline: 3 },
      title: { name: 'Título', type: 'p', font: t.major, size: 26, color: shadeHex(t.dk2, -0.25), before: 0, after: 15, line: 1, letter: 0.25, borderBottom: a1 },
      subtitle: { name: 'Subtítulo', type: 'p', font: t.major, size: 12, italic: true, color: a1, letter: 0.75 },
      quote: { name: 'Citação', type: 'p', italic: true, color: '#000000' },
      iquote: { name: 'Citação Intensa', type: 'p', bold: true, italic: true, color: a1, before: 10, after: 14, indLeft: 46.8, indRight: 46.8, borderBottom: a1 },
      listpara: { name: 'Parágrafo da Lista', type: 'p', indLeft: 36 },
      caption: { name: 'Legenda', type: 'p', size: 9, bold: true, color: a1, after: 10 },
      emphasis: { name: 'Ênfase', type: 'c', italic: true },
      strong: { name: 'Forte', type: 'c', bold: true },
      subtle: { name: 'Ênfase Subtil', type: 'c', italic: true, color: '#808080' },
      intense: { name: 'Ênfase Intensa', type: 'c', bold: true, italic: true, color: a1 },
      subtleref: { name: 'Referência Subtil', type: 'c', smallCaps: true, color: a2, underline: true },
      intenseref: { name: 'Referência Intensa', type: 'c', bold: true, smallCaps: true, color: a2, underline: true, letter: 0.25 },
      booktitle: { name: 'Título do Livro', type: 'c', bold: true, smallCaps: true, letter: 0.25 },
    };
  }

  const theme = () => {
    const base = THEMES[settings.theme] || THEMES.office;
    const c = THEMES[settings.themeColors], f = THEMES[settings.themeFonts];
    return { ...base, ...(c ? { dk2: c.dk2, lt2: c.lt2, accents: c.accents } : {}), ...(f ? { major: f.major, minor: f.minor } : {}) };
  };

  function defs() {
    const base = builtin(theme());
    for (const [k, o] of Object.entries(settings.styles || {})) if (base[k]) Object.assign(base[k], o);
    for (const [k, c] of Object.entries(settings.customStyles || {})) base[k] = { ...c, custom: true };
    return base;
  }

  const metaOf = (k, d = defs()[k]) => META[k] || { tag: d?.type === 'p' ? 'p' : undefined, cls: 'cs-' + k, id: 'cs' + k, w: d?.name || k };

  function selector(k, d, prefix) {
    const m = metaOf(k, d);
    if (k === 'normal') return `${prefix}`;
    if (m.cls) return `${prefix} .${m.cls}`;
    return `${prefix} ${m.tag}`;
  }

  function props(d, isNormal) {
    const p = [];
    if (d.font) p.push(`font-family:'${d.font}'`);
    if (d.size) p.push(`font-size:${d.size}pt`);
    if (d.color) p.push(`color:${d.color}`);
    if (d.bold !== undefined) p.push(`font-weight:${d.bold ? 'bold' : 'normal'}`);
    if (d.italic !== undefined) p.push(`font-style:${d.italic ? 'italic' : 'normal'}`);
    if (d.smallCaps) p.push('font-variant:small-caps');
    if (d.underline) p.push('text-decoration:underline');
    if (d.letter) p.push(`letter-spacing:${d.letter}pt`);
    if (!isNormal && d.type === 'p') {
      if (d.before !== undefined) p.push(`margin-top:${d.before}pt`);
      if (d.after !== undefined) p.push(`margin-bottom:${d.after}pt`);
      if (d.line !== undefined) p.push(`line-height:${d.line}`);
      if (d.indLeft !== undefined) p.push(`margin-left:${d.indLeft}pt`);
      if (d.indRight !== undefined) p.push(`margin-right:${d.indRight}pt`);
      if (d.align) p.push(`text-align:${d.align}`);
      if (d.borderBottom) p.push(`border-bottom:1pt solid ${d.borderBottom};padding-bottom:4pt`);
      if (d.shading) p.push(`background:${d.shading}`);
    }
    return p.join(';');
  }

  function css(prefix = '#editor') {
    const d = defs();
    let out = '';
    for (const [k, s] of Object.entries(d)) {
      const isNormal = k === 'normal';
      out += `${selector(k, s, prefix)}{${props(s, isNormal)}}\n`;
      if (isNormal) out += `${prefix} p{margin-top:${s.before}pt;margin-bottom:${s.after}pt;line-height:${s.line}}\n${prefix} li{line-height:${s.line}}\n`;
    }
    return out;
  }

  let styleEl = null;
  function apply() {
    styleEl ??= document.head.appendChild(Object.assign(document.createElement('style'), { id: 'doc-styles' }));
    const t = theme();
    styleEl.textContent = css('#editor') + `.hf{font-family:'${t.minor}'}`;
    THEME_COLORS.splice(0, THEME_COLORS.length, '#FFFFFF', '#000000', t.lt2, t.dk2, ...t.accents);
    if (typeof buildDropdowns === 'function' && document.readyState !== 'loading') { buildDropdowns(); renderIcons($('#dropdowns')); }
    if (typeof buildGallery === 'function') buildGallery();
  }

  /* Galeria de Estilos Rápidos */
  const GALLERY = ['normal', 'nospacing', 'h1', 'h2', 'title', 'subtitle', 'subtle', 'emphasis', 'intense', 'strong', 'quote', 'iquote', 'subtleref', 'intenseref', 'booktitle', 'listpara'];
  function galleryList() {
    const d = defs();
    return [...GALLERY, ...Object.keys(settings.customStyles || {})].filter(k => d[k]).map(k => ({ key: k, ...d[k], meta: metaOf(k, d[k]) }));
  }
  function sampleCss(d) {
    const n = defs().normal;
    return [`font-family:'${d.font || n.font}'`, `font-size:${Math.min(22, Math.round((d.size || n.size) * 1.2))}px`, `color:${d.color || n.color}`, d.bold ? 'font-weight:bold' : '', d.italic ? 'font-style:italic' : '', d.smallCaps ? 'font-variant:small-caps' : '', d.underline ? 'text-decoration:underline' : ''].filter(Boolean).join(';');
  }

  function keyOfBlock(b) {
    if (!b) return 'normal';
    const d = defs();
    for (const k of Object.keys(d)) {
      const m = metaOf(k, d[k]);
      if (d[k].type !== 'p' || k === 'normal') continue;
      if (m.cls ? b.classList.contains(m.cls) : b.tagName.toLowerCase() === m.tag) return k;
    }
    return 'normal';
  }
  function keyOfChar(el) {
    const d = defs();
    let n = el;
    while (n && n !== editor && !n.matches?.(BLOCKS)) {
      for (const k of Object.keys(d)) if (d[k].type === 'c' && n.classList?.contains(metaOf(k, d[k]).cls)) return k;
      n = n.parentElement;
    }
    return null;
  }

  return {
    THEMES, META, defs, metaOf, css, apply, galleryList, sampleCss, keyOfBlock, keyOfChar, shadeHex, theme,
    set(k, o) { settings.styles = { ...(settings.styles || {}), [k]: { ...(settings.styles?.[k] || {}), ...o } }; apply(); },
    addCustom(id, d) { settings.customStyles = { ...(settings.customStyles || {}), [id]: d }; apply(); },
    removeCustom(id) { if (settings.customStyles) delete settings.customStyles[id]; apply(); },
    setTheme(k) { settings.theme = k; apply(); },
  };
})();

/* Marca a selecção com spans (técnica do "tipo de letra marcador"), preservando o tipo de letra original */
function markSelection() {
  restore();
  const r = currentRange();
  if (!r || r.collapsed) return [];
  const before = textNodesIn(r).map(t => ({ node: t.node, font: getComputedStyle(t.node.parentElement).fontFamily }));
  const MARK = 'wcmark' + Math.random().toString(36).slice(2, 8);
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('fontName', false, MARK);
  const spans = $$('span, font', page).filter(s => (s.style.fontFamily || s.getAttribute('face') || '').includes(MARK));
  return spans.map(s => {
    let span = s;
    if (s.tagName === 'FONT') {
      span = document.createElement('span');
      while (s.firstChild) span.append(s.firstChild);
      s.replaceWith(span);
    }
    span.style.fontFamily = '';
    const t = before.find(b => span.contains(b.node));
    const blockFont = getComputedStyle(span.parentElement).fontFamily;
    if (t && t.font !== blockFont && !t.font.includes('wcmark')) span.style.fontFamily = t.font;
    if (!span.getAttribute('style')) span.removeAttribute('style');
    return span;
  });
}

function selectSpans(spans) {
  if (!spans.length) return;
  const nr = document.createRange();
  nr.setStartBefore(spans[0]);
  nr.setEndAfter(spans.at(-1));
  setRange(nr);
}
