'use strict';
/* =========================================================
   Referências: índice, notas de rodapé/fim, citações e
   bibliografia, legendas, índice de ilustrações, índice
   remissivo e índice de autoridades.
   ========================================================= */
const References = (() => {
  const S = () => Pager.S;
  const pageOf = el => Pager.pageOfY(el.offsetTop + (el.offsetParent && el.offsetParent !== editor ? el.offsetParent.offsetTop : 0)) + (settings.pageStart || 1) - 1;
  const uid = p => p + Math.random().toString(36).slice(2, 9);

  /* ---------- Renumeração (chamada antes de cada paginação) ---------- */
  function renumber() {
    // notas de rodapé e de fim
    [['fn-ref', 'footnotes', n => n], ['en-ref', 'endnotes', toRoman]].forEach(([refCls, boxCls, label]) => {
      const refs = $$('sup.' + refCls, editor);
      const box = $('.' + boxCls, editor);
      if (!box) return;
      const notes = [...box.children];
      refs.forEach((r, i) => {
        if (!r.dataset.fid) { const byNum = notes.find(p => !p.dataset.fid && p.querySelector('sup')?.textContent.trim() === r.textContent.trim()); r.dataset.fid = uid('n'); if (byNum) byNum.dataset.fid = r.dataset.fid; }
        const l = String(label(i + 1));
        if (r.textContent !== l) r.textContent = l;
        const p = notes.find(x => x.dataset.fid === r.dataset.fid);
        if (p) { const s = p.querySelector('sup'); if (s && s.textContent !== l) s.textContent = l; box.append(p); }
      });
      notes.forEach(p => { if (p.dataset.fid && !refs.some(r => r.dataset.fid === p.dataset.fid)) p.remove(); });
      if (!box.children.length) box.remove();
    });
    // legendas (Figura 1, Tabela 1...)
    const counters = {};
    $$('.wc-seq', editor).forEach(s => { const k = s.dataset.seq; counters[k] = (counters[k] || 0) + 1; const v = String(counters[k]); if (s.textContent !== v) s.textContent = v; });
    // citações
    $$('.citation', editor).forEach(c => { const t = citeText(c.dataset.src, c.dataset.page); if (c.textContent !== t) c.textContent = t; });
  }

  /* ---------- Índice ---------- */
  function tocHtml(variant) {
    const hs = $$('h1,h2,h3', editor).filter(h => !h.closest('.toc') && h.textContent.trim());
    const items = hs.map(h => {
      if (!h.id) h.id = '_Toc' + Math.random().toString(36).slice(2, 9);
      return `<p class="toc-${h.tagName[1]}"><a href="#${h.id}">${esc(h.textContent)}</a><span>${pageOf(h)}</span></p>`;
    }).join('');
    const title = variant === '2' ? 'Conteúdo' : 'Índice';
    return `<p class="toc-title">${title}</p>${items || '<p>Não foram encontradas entradas de índice.</p>'}`;
  }
  function insertToc(variant = '1') {
    const old = $('.toc', editor);
    if (variant === 'manual') {
      const rows = ['Escreva o título do capítulo (nível 1)', 'Escreva o título do capítulo (nível 2)', 'Escreva o título do capítulo (nível 3)'].map((t, i) => `<p class="toc-${i + 1}"><a>${t}</a><span>${i + 1}</span></p>`).join('');
      const h = `<div class="toc toc-manual" data-variant="manual"><p class="toc-title">Índice</p>${rows}</div>`;
      if (old) { old.outerHTML = h; changed(); } else exec('insertHTML', h + '<p><br></p>');
      return;
    }
    Pager.layout();
    const h = `<div class="toc" contenteditable="false" data-variant="${variant}">${tocHtml(variant)}</div>`;
    if (old) { old.outerHTML = h; changed(); } else exec('insertHTML', h + '<p><br></p>');
    $$('.toc:not(.toc-manual)', editor).forEach(t => t.setAttribute('contenteditable', 'false'));
  }
  async function updateToc() {
    const t = $('.toc:not(.toc-manual)', editor);
    if (!t) return infoBox('Não existe nenhum índice automático no documento.');
    const mode = await dialog({ title: 'Actualizar Índice', width: 320, body: '<p>O Nexora Word está a actualizar o índice. Seleccione uma das seguintes opções:</p><label class="fcheck"><input type="radio" name="ut" value="pages"> Actualizar apenas os números de página</label><label class="fcheck"><input type="radio" name="ut" value="all" checked> Actualizar o índice inteiro</label>', buttons: [{ label: 'OK', primary: true, value: ov => $('input[name=ut]:checked', ov).value }, { label: 'Cancelar', value: null }] });
    if (!mode) return;
    Pager.layout();
    if (mode === 'pages') $$('a[href]', t).forEach(a => { const h = editor.querySelector(`[id="${CSS.escape(a.getAttribute('href').slice(1))}"]`); if (h) a.nextElementSibling.textContent = pageOf(h); });
    else t.innerHTML = tocHtml(t.dataset.variant);
    History.setLabel('Actualizar Índice');
    changed();
  }

  /* ---------- Notas ---------- */
  function insertNote(kind) {
    const fn = kind === 'footnote';
    const fid = uid('n');
    const cls = fn ? 'fn-ref' : 'en-ref', boxCls = fn ? 'footnotes' : 'endnotes';
    exec('insertHTML', `<sup class="${cls}" data-fid="${fid}">0</sup>`);
    let box = $('.' + boxCls, editor);
    if (!box) {
      box = document.createElement('div');
      box.className = boxCls;
      if (fn && $('.endnotes', editor)) $('.endnotes', editor).before(box); else editor.append(box);
    }
    const p = document.createElement('p');
    p.dataset.fid = fid;
    p.innerHTML = '<sup>0</sup>&nbsp;';
    box.append(p);
    renumber();
    placeCaret(p, false);
    p.scrollIntoView({ block: 'center' });
    History.setLabel(fn ? 'Nota de Rodapé' : 'Nota de Fim');
    changed();
  }
  function nextNote() {
    const refs = $$('sup.fn-ref, sup.en-ref', editor);
    if (!refs.length) return;
    const r = currentRange();
    const next = refs.find(s => r && (s.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_PRECEDING)) || refs[0];
    next.scrollIntoView({ block: 'center' });
    const rr = document.createRange(); rr.setStartAfter(next); rr.collapse(true); editor.focus(); setRange(rr);
  }
  function showNotes() {
    const r = currentRange(), el = nodeEl(r?.startContainer);
    const inNote = el?.closest('.footnotes p, .endnotes p');
    if (inNote) { const ref = editor.querySelector(`sup[data-fid="${inNote.dataset.fid}"]`); ref?.scrollIntoView({ block: 'center' }); if (ref) { const rr = document.createRange(); rr.setStartAfter(ref); rr.collapse(true); setRange(rr); } return; }
    const box = $('.footnotes, .endnotes', editor);
    if (!box) return infoBox('O documento não contém notas de rodapé nem notas de fim.');
    box.scrollIntoView({ block: 'center' });
    placeCaret(box.lastElementChild || box, false);
  }
  async function notesDialog() {
    const res = await dialog({ title: 'Nota de Rodapé e Nota de Fim', width: 340, body: `${fieldset('Localização', `<label class="fcheck"><input type="radio" name="nd-k" value="footnote" checked> Notas de rodapé</label><label class="fcheck"><input type="radio" name="nd-k" value="endnote"> Notas de fim</label>`)}${fieldset('Formato', `<label>Formato numérico:${sel('nd-f', [['1', '1, 2, 3, ...'], ['i', 'i, ii, iii, ...']], '1')}</label>`)}`, buttons: [{ label: 'Inserir', primary: true, value: ov => $('input[name=nd-k]:checked', ov).value }, { label: 'Cancelar', value: null }] });
    if (res) insertNote(res);
  }

  /* ---------- Citações e bibliografia ---------- */
  const sources = () => settings.sources || (settings.sources = []);
  const TYPES = [['book', 'Livro'], ['article', 'Artigo de Revista'], ['web', 'Sítio Web'], ['report', 'Relatório'], ['other', 'Outro']];
  const style = () => settings.citeStyle || 'APA';
  const firstAuthor = a => (a || 'Anónimo').split(';')[0].trim().split(/\s+/).pop();
  function citeText(tag, pageRef) {
    const s = sources().find(x => x.tag === tag);
    if (!s) return '(Fonte inexistente)';
    const a = firstAuthor(s.author), y = s.year || 's.d.';
    const pg = pageRef ? `, p. ${pageRef}` : '';
    if (style() === 'MLA') return `(${a}${pageRef ? ' ' + pageRef : ''})`;
    if (style() === 'ISO') return `[${sources().indexOf(s) + 1}]`;
    if (style() === 'Chicago') return `(${a} ${y}${pg})`;
    return `(${a}, ${y}${pg})`;
  }
  function bibEntry(s) {
    const a = s.author || 'Anónimo', t = esc(s.title || ''), y = esc(s.year || 's.d.');
    const pub = [s.city, s.publisher].filter(Boolean).map(esc).join(': ');
    switch (style()) {
      case 'MLA': return `${esc(a)}. <i>${t}</i>. ${pub}${pub ? ', ' : ''}${y}.${s.url ? ' ' + esc(s.url) : ''}`;
      case 'ISO': return `[${sources().indexOf(s) + 1}] ${esc(a.toUpperCase())}. <i>${t}</i>. ${pub}${pub ? ', ' : ''}${y}.${s.url ? ' Disponível em: ' + esc(s.url) : ''}`;
      case 'Chicago': return `${esc(a)}. ${y}. <i>${t}</i>. ${pub}.${s.url ? ' ' + esc(s.url) : ''}`;
      default: return `${esc(a)} (${y}). <i>${t}</i>. ${pub}${pub ? '.' : ''}${s.url ? ' Obtido de ' + esc(s.url) : ''}`;
    }
  }
  function bibHtml(title) {
    const cited = new Set($$('.citation', editor).map(c => c.dataset.src));
    const list = sources().filter(s => cited.has(s.tag) || title !== 'Obras Citadas').sort((x, y) => style() === 'ISO' ? 0 : firstAuthor(x.author).localeCompare(firstAuthor(y.author), 'pt'));
    return `${title ? `<h1>${esc(title)}</h1>` : ''}${list.map(s => `<p class="bib-entry">${bibEntry(s)}</p>`).join('') || '<p>Não existem fontes no documento actual.</p>'}`;
  }
  function refreshBibs() {
    renumber();
    $$('.bibliography', editor).forEach(b => { b.innerHTML = bibHtml(b.dataset.title); });
  }
  async function sourceDialog(src) {
    const s = src || { tag: '', type: 'book', author: '', title: '', year: '', city: '', publisher: '', url: '' };
    const f = (k, l) => `<label>${l}<input id="sr-${k}" value="${esc(s[k] || '')}"></label>`;
    const res = await dialog({
      title: src ? 'Editar Fonte' : 'Criar Fonte',
      width: 460,
      body: `<label>Tipo de Fonte:${sel('sr-type', TYPES, s.type)}</label><div class="two">${f('author', 'Autor (separe vários com ;):')}${f('title', 'Título:')}${f('year', 'Ano:')}${f('city', 'Cidade:')}${f('publisher', 'Editora:')}${f('url', 'URL:')}</div>${f('tag', 'Nome da Etiqueta:')}`,
      buttons: [{ label: 'OK', primary: true, value: ov => Object.fromEntries(['type', 'author', 'title', 'year', 'city', 'publisher', 'url', 'tag'].map(k => [k, $('#sr-' + k, ov).value.trim()])) }, { label: 'Cancelar', value: null }],
    });
    if (!res) return null;
    res.tag ||= (firstAuthor(res.author) + (res.year || '')).replace(/\W/g, '') || uid('Fonte');
    if (src) Object.assign(src, res); else sources().push(res);
    refreshBibs();
    changed();
    return res;
  }
  async function manageSources() {
    const render = () => sources().map((s, i) => `<option value="${i}">${esc(firstAuthor(s.author))}; ${esc(s.title)} (${esc(s.year)})</option>`).join('');
    await dialog({
      title: 'Gestor de Fontes',
      width: 520,
      body: `<label>Lista Actual:<select id="ms-list" size="9" style="height:160px">${render()}</select></label><div class="dlg-inline"><button class="std" id="ms-new">Novo...</button><button class="std" id="ms-edit">Editar...</button><button class="std" id="ms-del">Eliminar</button></div><div class="ms-prev" id="ms-prev"></div>`,
      onOpen: ov => {
        const list = $('#ms-list', ov);
        const prev = () => { const s = sources()[+list.value]; $('#ms-prev', ov).innerHTML = s ? `<b>Pré-visualizar (${style()}):</b><br>Citação: ${esc(citeText(s.tag))}<br>Entrada: ${bibEntry(s)}` : ''; };
        list.onchange = prev;
        $('#ms-new', ov).onclick = async () => { await sourceDialog(); list.innerHTML = render(); };
        $('#ms-edit', ov).onclick = async () => { const s = sources()[+list.value]; if (s) { await sourceDialog(s); list.innerHTML = render(); } };
        $('#ms-del', ov).onclick = () => { const i = +list.value; if (i >= 0) { sources().splice(i, 1); list.innerHTML = render(); refreshBibs(); changed(); } };
      },
      buttons: [{ label: 'Fechar', primary: true, value: true }],
    });
  }
  DD_HOOKS['dd-citation'] = dd => {
    dd.innerHTML = `${sources().map(s => `<button class="dd-item dd-desc" data-cmd="insertCitation" data-arg="${esc(s.tag)}"><span class="dd-two"><b>${esc(firstAuthor(s.author))}</b><small>${esc(s.title)}, (${esc(s.year)})</small></span></button>`).join('')}${sources().length ? '<div class="dd-sep"></div>' : ''}<button class="dd-item" data-cmd="newSource"><i class="ic" data-icon="citation"></i>Adicionar Nova Fonte...</button><button class="dd-item" data-cmd="placeholderCitation">Adicionar Novo Marcador de Posição...</button>`;
  };
  $('#cite-style').addEventListener('change', e => { settings.citeStyle = e.target.value; refreshBibs(); changed(); });
  const insertCitation = tag => exec('insertHTML', `<span class="citation" data-src="${esc(tag)}" contenteditable="false">${esc(citeText(tag))}</span>&#8203;`);

  /* ---------- Legendas ---------- */
  async function caption() {
    const target = selImg || nodeEl(currentRange()?.startContainer)?.closest('#editor table');
    const def = target?.tagName === 'TABLE' ? 'Tabela' : target ? 'Figura' : 'Figura';
    const n = $$(`.wc-seq[data-seq="${def}"]`, editor).length + 1;
    const res = await dialog({
      title: 'Legenda',
      width: 380,
      body: `<label>Legenda:<input id="cp-t" value="${def} ${n}"></label><div class="two"><label>Etiqueta:${sel('cp-l', ['Figura', 'Tabela', 'Equação', ...(settings.captionLabels || [])], def)}</label><label>Posição:${sel('cp-p', [['below', 'Abaixo do item seleccionado'], ['above', 'Acima do item seleccionado']], def === 'Tabela' ? 'above' : 'below')}</label></div>${chk('cp-x', 'Excluir etiqueta da legenda', false)}<div class="dlg-inline"><button class="std" id="cp-new">Nova Etiqueta...</button></div>`,
      onOpen: ov => {
        const upd = () => { const l = $('#cp-l', ov).value; const c = $$(`.wc-seq[data-seq="${l}"]`, editor).length + 1; const rest = $('#cp-t', ov).value.replace(/^\S+\s+\d+:?\s*/, ''); $('#cp-t', ov).value = `${$('#cp-x', ov).checked ? '' : l + ' '}${c}${rest ? ': ' + rest : ''}`; };
        $('#cp-l', ov).onchange = upd; $('#cp-x', ov).onchange = upd;
        $('#cp-new', ov).onclick = async () => { const l = await dialog({ title: 'Nova Etiqueta', width: 280, body: '<label>Etiqueta:<input id="nl"></label>', buttons: [{ label: 'OK', primary: true, value: o => $('#nl', o).value.trim() }, { label: 'Cancelar', value: null }] }); if (l) { settings.captionLabels = [...(settings.captionLabels || []), l]; $('#cp-l', ov).insertAdjacentHTML('beforeend', `<option>${esc(l)}</option>`); $('#cp-l', ov).value = l; upd(); } };
      },
      buttons: [{ label: 'OK', primary: true, value: ov => ({ text: $('#cp-t', ov).value, label: $('#cp-l', ov).value, pos: $('#cp-p', ov).value, excl: $('#cp-x', ov).checked }) }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    const desc = res.text.replace(/^\S+\s+\d+:?\s*/, '').replace(/^\d+:?\s*/, '');
    const html = `<p class="caption" data-label="${esc(res.label)}">${res.excl ? '' : esc(res.label) + ' '}<span class="wc-seq" data-seq="${esc(res.label)}" contenteditable="false">1</span>${desc ? ': ' + esc(desc) : ''}</p>`;
    if (target) {
      const anchor = target.tagName === 'TABLE' ? target : blockOf(target) || target;
      anchor.insertAdjacentHTML(res.pos === 'above' ? 'beforebegin' : 'afterend', html);
    } else exec('insertHTML', html);
    renumber();
    History.setLabel('Inserir Legenda');
    changed();
  }
  function figuresHtml(label) {
    const caps = $$(`p.caption[data-label="${label}"]`, editor);
    return `<p class="toc-title">Índice de ${label === 'Tabela' ? 'Tabelas' : label === 'Figura' ? 'Figuras' : label + 's'}</p>${caps.map(c => { if (!c.id) c.id = uid('_Fig'); return `<p class="toc-1"><a href="#${c.id}">${esc(c.textContent)}</a><span>${pageOf(c)}</span></p>`; }).join('') || '<p>Não foram encontradas entradas do índice de ilustrações.</p>'}`;
  }
  async function tableOfFigures() {
    const label = await dialog({ title: 'Índice de Ilustrações', width: 300, body: `<label>Etiqueta da legenda:${sel('tf-l', ['Figura', 'Tabela', 'Equação', ...(settings.captionLabels || [])], 'Figura')}</label>${chk('tf-p', 'Mostrar números de página', true)}`, buttons: [{ label: 'OK', primary: true, value: ov => $('#tf-l', ov).value }, { label: 'Cancelar', value: null }] });
    if (!label) return;
    Pager.layout();
    exec('insertHTML', `<div class="toc tof" contenteditable="false" data-label="${esc(label)}">${figuresHtml(label)}</div><p><br></p>`);
  }
  function figuresUpdate() { Pager.layout(); $$('.tof', editor).forEach(t => { t.innerHTML = figuresHtml(t.dataset.label); }); changed(); }

  /* ---------- Índice remissivo ---------- */
  async function markEntry() {
    const r = currentRange();
    const text = r?.toString().trim() || '';
    const res = await dialog({ title: 'Marcar Entrada de Índice Remissivo', width: 380, body: `<label>Entrada principal:<input id="xe-m" value="${esc(text)}"></label><label>Subentrada:<input id="xe-s"></label>${fieldset('Opções', '<label class="fcheck"><input type="radio" name="xe-o" value="page" checked> Página actual</label><label class="fcheck"><input type="radio" name="xe-o" value="see"> Referência cruzada: Ver <input id="xe-see" style="width:150px"></label>')}${fieldset('Formato do número de página', `${chk('xe-b', 'Negrito', false)}${chk('xe-i', 'Itálico', false)}`)}`, buttons: [{ label: 'Marcar Tudo', value: ov => ({ ...collect(ov), all: true }) }, { label: 'Marcar', primary: true, value: collect }, { label: 'Cancelar', value: null }] });
    function collect(ov) { return { main: $('#xe-m', ov).value.trim(), sub: $('#xe-s', ov).value.trim(), see: $('input[name=xe-o]:checked', ov).value === 'see' ? $('#xe-see', ov).value.trim() : '', b: $('#xe-b', ov).checked, i: $('#xe-i', ov).checked }; }
    if (!res || !res.main) return;
    const mark = `<span class="xe" contenteditable="false" data-entry="${esc(res.main)}" data-sub="${esc(res.sub)}" data-see="${esc(res.see)}" data-fmt="${res.b ? 'b' : ''}${res.i ? 'i' : ''}"></span>`;
    if (res.all) {
      const idx = textIndex();
      const lower = idx.text.toLowerCase(), term = res.main.toLowerCase();
      const positions = [];
      for (let p = lower.indexOf(term); p >= 0; p = lower.indexOf(term, p + term.length)) positions.push(p);
      positions.reverse().forEach(p => { const at = locate(idx, p + term.length - 1); const rr = document.createRange(); rr.setStart(at.node, at.offset + 1); rr.collapse(true); const t = document.createElement('div'); t.innerHTML = mark; rr.insertNode(t.firstChild); });
      changed();
    } else {
      if (r && !r.collapsed) { const rr = r.cloneRange(); rr.collapse(false); setRange(rr); }
      exec('insertHTML', mark);
    }
    toggleMarks(true);
  }
  function indexHtml() {
    Pager.layout();
    const map = new Map();
    $$('.xe', editor).forEach(x => {
      const key = x.dataset.entry, sub = x.dataset.sub || '';
      if (!map.has(key)) map.set(key, { pages: new Set(), subs: new Map(), see: x.dataset.see, fmt: x.dataset.fmt });
      const e = map.get(key);
      const pg = Pager.pageOfY(x.offsetTop) + (settings.pageStart || 1) - 1;
      if (sub) { if (!e.subs.has(sub)) e.subs.set(sub, new Set()); e.subs.get(sub).add(pg); } else e.pages.add(pg);
      if (x.dataset.see) e.see = x.dataset.see;
    });
    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b, 'pt'));
    let letter = '', out = '';
    const pf = (set, fmt) => [...set].sort((a, b) => a - b).map(p => fmt?.includes('b') ? `<b>${p}</b>` : fmt?.includes('i') ? `<i>${p}</i>` : p).join(', ');
    for (const k of keys) {
      const L = k[0].toUpperCase();
      if (L !== letter) { letter = L; out += `<p class="idx-letter">${esc(L)}</p>`; }
      const e = map.get(k);
      out += `<p class="idx-1">${esc(k)}${e.see ? `. <i>Ver</i> ${esc(e.see)}` : e.pages.size ? ', ' + pf(e.pages, e.fmt) : ''}</p>`;
      [...e.subs.keys()].sort((a, b) => a.localeCompare(b, 'pt')).forEach(s => { out += `<p class="idx-2">${esc(s)}, ${pf(e.subs.get(s), e.fmt)}</p>`; });
    }
    return out || '<p>Não foram encontradas entradas de índice remissivo.</p>';
  }
  async function insertIndex() {
    const cols = await dialog({ title: 'Índice Remissivo', width: 320, body: `<div class="two"><label>Colunas:<input type="number" id="ix-c" value="2" min="1" max="4"></label><label>Tipo:${sel('ix-t', [['indent', 'Avançado'], ['run', 'Contínuo']], 'indent')}</label></div>${chk('ix-r', 'Alinhar números de página à direita', false)}`, buttons: [{ label: 'OK', primary: true, value: ov => +$('#ix-c', ov).value || 2 }, { label: 'Cancelar', value: null }] });
    if (!cols) return;
    exec('insertHTML', `<div class="index-remissivo" contenteditable="false" style="column-count:${cols}">${indexHtml()}</div><p><br></p>`);
  }
  function indexUpdate() { $$('.index-remissivo', editor).forEach(i => { i.innerHTML = indexHtml(); }); changed(); }

  /* ---------- Índice de autoridades ---------- */
  const TA_CATS = ['Casos', 'Estatutos', 'Outras Autoridades', 'Regras', 'Tratados', 'Regulamentos', 'Disposições Constitucionais'];
  async function markCitation() {
    const t = currentRange()?.toString().trim() || '';
    if (!t) return infoBox('Seleccione o texto da citação a marcar.');
    const res = await dialog({ title: 'Marcar Citação', width: 400, body: `<label>Texto seleccionado:<textarea id="ta-t" style="height:50px">${esc(t)}</textarea></label><label>Categoria:${sel('ta-c', TA_CATS, TA_CATS[0])}</label><label>Citação abreviada:<input id="ta-s" value="${esc(t)}"></label>`, buttons: [{ label: 'Marcar', primary: true, value: ov => ({ long: $('#ta-t', ov).value.trim(), cat: $('#ta-c', ov).value, short: $('#ta-s', ov).value.trim() }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    const rr = currentRange().cloneRange(); rr.collapse(false); setRange(rr);
    exec('insertHTML', `<span class="ta" contenteditable="false" data-long="${esc(res.long)}" data-cat="${esc(res.cat)}" data-short="${esc(res.short)}"></span>`);
    toggleMarks(true);
  }
  function authoritiesHtml() {
    Pager.layout();
    const groups = {};
    $$('.ta', editor).forEach(t => { const g = (groups[t.dataset.cat] ??= new Map()); if (!g.has(t.dataset.long)) g.set(t.dataset.long, new Set()); g.get(t.dataset.long).add(Pager.pageOfY(t.offsetTop) + (settings.pageStart || 1) - 1); });
    return TA_CATS.filter(c => groups[c]).map(c => `<p class="toc-title">${esc(c)}</p>${[...groups[c].entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt')).map(([l, pg]) => `<p class="toc-1"><a>${esc(l)}</a><span>${[...pg].sort((a, b) => a - b).join(', ')}</span></p>`).join('')}`).join('') || '<p>Não foram encontradas entradas do índice de autoridades.</p>';
  }

  Object.assign(CMD, {
    toc: v => insertToc(v || '1'), tocUpdate: updateToc, tocRemove: () => { $$('.toc:not(.tof)', editor).forEach(t => t.remove()); changed(); },
    footnote: () => insertNote('footnote'), endnote: () => insertNote('endnote'), nextNote, showNotes, notesDialog,
    insertCitation, newSource: async () => { const s = await sourceDialog(); if (s) insertCitation(s.tag); },
    placeholderCitation: async () => { const n = await dialog({ title: 'Nome do Marcador de Posição', width: 300, body: '<label>Nome:<input id="ph" value="MarcadorDePosição1"></label>', buttons: [{ label: 'OK', primary: true, value: ov => $('#ph', ov).value.trim() }, { label: 'Cancelar', value: null }] }); if (!n) return; sources().push({ tag: n, type: 'other', author: n, title: '', year: '' }); insertCitation(n); },
    manageSources, bibliography: t => { exec('insertHTML', `<div class="bibliography" contenteditable="false" data-title="${esc(t)}">${bibHtml(t)}</div><p><br></p>`); },
    caption, tableOfFigures, figuresUpdate, markEntry, insertIndex, indexUpdate, markCitation,
    insertAuthorities: () => exec('insertHTML', `<div class="authorities toc" contenteditable="false">${authoritiesHtml()}</div><p><br></p>`),
    authoritiesUpdate: () => { $$('.authorities', editor).forEach(a => { a.innerHTML = authoritiesHtml(); }); changed(); },
  });
  return { renumber, refreshBibs, citeText };
})();
window.References = References;
