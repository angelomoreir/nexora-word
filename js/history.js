'use strict';
/* =========================================================
   Histórico de Anular/Refazer baseado em instantâneos
   (todas as operações — incluindo tabelas, esquema de página,
   controlo de alterações — passam a ser anuláveis) + Macros
   ========================================================= */
const History = (() => {
  const undo = [], redo = [], MAX = 150;
  let current = null, typingTimer = 0, typingPending = false, applying = false;
  let label = 'Acção';

  const textOffset = (node, offset) => {
    const pre = document.createRange();
    pre.setStart(editor, 0);
    pre.setEnd(node, offset);
    return pre.toString().length;
  };

  function selOffsets() {
    const r = currentRange();
    if (!r || !editor.contains(r.startContainer) || !editor.contains(r.endContainer)) return null;
    return { s: textOffset(r.startContainer, r.startOffset), e: textOffset(r.endContainer, r.endOffset) };
  }

  function restoreSel(sel) {
    if (!sel) return placeCaret(editor, true);
    const idx = textIndex();
    if (!idx.nodes.length) return placeCaret(editor, true);
    const at = pos => {
      const p = Math.min(pos, idx.text.length);
      const i = idx.starts.findIndex((st, k) => p <= st + idx.nodes[k].nodeValue.length);
      const k = i < 0 ? idx.nodes.length - 1 : i;
      return { node: idx.nodes[k], offset: Math.min(p - idx.starts[k], idx.nodes[k].nodeValue.length) };
    };
    const a = at(sel.s), b = at(sel.e);
    const r = document.createRange();
    r.setStart(a.node, a.offset);
    r.setEnd(b.node, b.offset);
    editor.focus({ preventScroll: true });
    setRange(r);
    nodeEl(a.node)?.scrollIntoView?.({ block: 'nearest' });
  }

  function snap() {
    return { html: cleanEditorHtml(), header: header.innerHTML, footer: footer.innerHTML, settings: JSON.stringify(settings), sel: selOffsets() };
  }
  const same = (a, b) => a.html === b.html && a.header === b.header && a.footer === b.footer && a.settings === b.settings;

  function record(l = label) {
    if (applying) return;
    clearTimeout(typingTimer);
    typingPending = false;
    const s = snap();
    if (current && same(s, current)) { current.sel = s.sel; return; }
    if (current) {
      undo.push({ state: current, label: l });
      if (undo.length > MAX) undo.shift();
      redo.length = 0;
    }
    current = s;
    updateButtons();
  }

  function typing() {
    if (applying) return;
    typingPending = true;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => record('Escrita'), 700);
  }

  function flush() { if (typingPending) record('Escrita'); }

  function apply(s) {
    applying = true;
    editor.innerHTML = s.html;
    header.innerHTML = s.header;
    footer.innerHTML = s.footer;
    settings = JSON.parse(s.settings);
    deselectImage();
    applySettings();
    restoreSel(s.sel);
    applying = false;
    dirty = true;
    afterDocChange();
    updateButtons();
  }

  function doUndo(n = 1) {
    flush();
    if (!undo.length) return;
    while (n-- > 0 && undo.length) {
      const e = undo.pop();
      redo.push({ state: current, label: e.label });
      current = e.state;
    }
    apply(current);
  }

  function doRedo(n = 1) {
    flush();
    if (!redo.length) return;
    while (n-- > 0 && redo.length) {
      const e = redo.pop();
      undo.push({ state: current, label: e.label });
      current = e.state;
    }
    apply(current);
  }

  function reset() {
    undo.length = redo.length = 0;
    typingPending = false;
    clearTimeout(typingTimer);
    current = snap();
    updateButtons();
  }

  function updateButtons() {
    const u = $('[data-cmd="undo"].qat-btn'), r = $('[data-cmd="redo"].qat-btn');
    if (u) { u.classList.toggle('disabled', !undo.length && !typingPending); u.dataset.tip = undo.length ? `Anular ${undo.at(-1).label} (Ctrl+Z)` : 'Anular (Ctrl+Z)'; }
    if (r) { r.classList.toggle('disabled', !redo.length); r.dataset.tip = redo.length ? `Refazer ${redo.at(-1).label} (Ctrl+Y)` : 'Refazer (Ctrl+Y)'; }
  }

  function renderList() {
    flush();
    const dd = $('#dd-undo');
    const items = undo.slice(-25).reverse();
    dd.innerHTML = items.length
      ? `${items.map((e, i) => `<button class="dd-item undo-item" data-n="${i + 1}">${esc(e.label)}</button>`).join('')}<div class="dd-foot" id="undo-count">Anular 1 Acção</div>`
      : '<div class="dd-foot">Não é possível anular</div>';
    $$('.undo-item', dd).forEach(b => {
      b.addEventListener('mouseenter', () => {
        const n = +b.dataset.n;
        $$('.undo-item', dd).forEach(x => x.classList.toggle('kb', +x.dataset.n <= n));
        $('#undo-count').textContent = `Anular ${n} ${n === 1 ? 'Acção' : 'Acções'}`;
      });
      b.addEventListener('click', () => { closeDropdowns(); doUndo(+b.dataset.n); });
    });
  }

  return {
    record, typing, flush, reset, renderList,
    undo: doUndo, redo: doRedo,
    setLabel: l => { label = l || 'Acção'; },
    get applying() { return applying; },
  };
})();

/* Intercepta o Anular/Refazer nativo do browser */
document.addEventListener('beforeinput', e => {
  if (e.inputType === 'historyUndo') { e.preventDefault(); History.undo(); }
  if (e.inputType === 'historyRedo') { e.preventDefault(); History.redo(); }
}, true);
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  if (e.target.closest?.('input, textarea, .modal-overlay')) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); History.undo(); }
  else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); e.stopImmediatePropagation(); History.redo(); }
}, true);

/* =========================================================
   Macros: grava os comandos do friso e o texto escrito
   ========================================================= */
const Macros = (() => {
  let recording = null;
  const load = () => { try { return JSON.parse(localStorage.getItem('wc-macros') || '{}'); } catch { return {}; } };
  const store = m => localStorage.setItem('wc-macros', JSON.stringify(m));
  const SKIP = new Set(['macroRecord', 'macroStop', 'macroList', 'macroRun', 'undo', 'redo']);

  function onRun(cmd, arg) {
    if (recording && !SKIP.has(cmd)) recording.steps.push({ cmd, arg: arg ?? null });
  }

  editor.addEventListener('beforeinput', e => {
    if (!recording) return;
    if (e.inputType === 'insertText' && e.data) {
      const last = recording.steps.at(-1);
      if (last?.cmd === 'insertText' && last.typed) last.arg += e.data;
      else recording.steps.push({ cmd: 'insertText', arg: e.data, typed: true });
    } else if (e.inputType === 'insertParagraph') recording.steps.push({ cmd: 'insertParagraph' });
    else if (e.inputType === 'deleteContentBackward') recording.steps.push({ cmd: 'deleteBack' });
  });

  async function startRecording() {
    const name = await dialog({
      title: 'Gravar Macro',
      width: 340,
      body: '<label>Nome da macro:<input id="mc-name" value="Macro1"></label><label>Descrição:<input id="mc-desc" value=""></label>',
      buttons: [{ label: 'OK', primary: true, value: ov => ({ name: $('#mc-name', ov).value.trim().replace(/\s+/g, '_') || 'Macro1', desc: $('#mc-desc', ov).value }) }, { label: 'Cancelar', value: null }],
    });
    if (!name) return;
    recording = { ...name, steps: [] };
    $('#sb-macro').classList.add('recording');
    $('#sb-macro').dataset.tip = 'A gravar macro… clique para parar';
    restore();
  }

  function stopRecording() {
    if (!recording) return;
    const all = load();
    all[recording.name] = { desc: recording.desc, steps: recording.steps, date: Date.now() };
    store(all);
    infoBox(`A macro <b>${esc(recording.name)}</b> foi gravada com ${recording.steps.length} passos.`);
    recording = null;
    $('#sb-macro').classList.remove('recording');
    $('#sb-macro').dataset.tip = 'Gravar macro';
  }

  async function play(name) {
    const m = load()[name];
    if (!m) return;
    restore();
    for (const s of m.steps) {
      if (s.cmd === 'insertParagraph') exec('insertParagraph');
      else if (s.cmd === 'deleteBack') exec('delete');
      else await run(s.cmd, s.arg);
    }
    History.setLabel(`Macro ${name}`);
    changed();
  }

  async function list() {
    const all = load();
    const names = Object.keys(all);
    const res = await dialog({
      title: 'Macros',
      width: 380,
      body: names.length
        ? `<label>Nome da macro:<select id="mc-list" size="8" style="height:140px">${names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></label><div id="mc-desc" style="min-height:16px;color:#444"></div>`
        : '<p>Ainda não existem macros. Utilize <b>Gravar Macro</b> no separador Ver.</p>',
      onOpen: ov => {
        const sel = $('#mc-list', ov);
        if (!sel) return;
        sel.selectedIndex = 0;
        const show = () => { $('#mc-desc', ov).textContent = `${all[sel.value]?.desc || ''} (${all[sel.value]?.steps.length || 0} passos)`; };
        sel.addEventListener('change', show);
        show();
      },
      buttons: names.length
        ? [{ label: 'Executar', primary: true, value: ov => ({ a: 'run', n: $('#mc-list', ov).value }) }, { label: 'Eliminar', value: ov => ({ a: 'del', n: $('#mc-list', ov).value }) }, { label: 'Fechar', value: null }]
        : [{ label: 'Fechar', primary: true, value: null }],
    });
    if (!res) return;
    if (res.a === 'run') play(res.n);
    else { delete all[res.n]; store(all); list(); }
  }

  return { onRun, startRecording, stopRecording, play, list, get recording() { return !!recording; } };
})();
