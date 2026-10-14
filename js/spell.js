'use strict';
/* =========================================================
   Verificação ortográfica (dicionário Hunspell pt-PT, com
   remoção de afixos em tempo de verificação — sem expansão),
   gramática básica, caixa Ortografia e Gramática, menu de
   contexto com sugestões e Correcção Automática.
   ========================================================= */
const Spell = (() => {
  const DICT_URL = 'https://unpkg.com/dictionary-pt-pt@2.0.0/';
  let dict = null, lower = null, sfx = new Map(), pfx = [], maxSfx = 0, rep = [], tryChars = '', loading = null, failed = false;
  const cache = new Map();
  let issues = [], ctxIssue = null, lastInput = 0, timer = 0;
  const ignoreAll = new Set();
  const custom = () => { try { return new Set(JSON.parse(localStorage.getItem('wc-dict') || '[]')); } catch { return new Set(); } };
  const saveCustom = s => localStorage.setItem('wc-dict', JSON.stringify([...s]));
  const hasHL = typeof Highlight !== 'undefined' && CSS.highlights;

  async function fetchCached(url) {
    try {
      const c = await caches.open('wc-dict-v1');
      let r = await c.match(url);
      if (!r) { r = await fetch(url); if (!r.ok) throw new Error(r.status); await c.put(url, r.clone()); }
      return await r.text();
    } catch {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }
  }

  function parseAff(text) {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const p = lines[i].trim().split(/\s+/);
      if (p[0] === 'TRY') tryChars = p[1] || '';
      else if (p[0] === 'REP' && p.length >= 3) rep.push([p[1], p[2]]);
      else if ((p[0] === 'SFX' || p[0] === 'PFX') && p.length === 4 && /^\d+$/.test(p[3])) {
        const [kind, flag, cross, n] = p;
        for (let k = 1; k <= +n; k++) {
          const q = (lines[i + k] || '').trim().split(/\s+/);
          const strip = q[2] === '0' ? '' : q[2], add = (q[3] === '0' ? '' : q[3]).split('/')[0], cond = q[4] || '.';
          const rule = { flag, cross: cross === 'Y', strip, add };
          if (kind === 'SFX') {
            rule.cond = new RegExp(cond === '.' ? '' : `${cond}$`, 'u');
            if (!sfx.has(add)) sfx.set(add, []);
            sfx.get(add).push(rule);
            maxSfx = Math.max(maxSfx, add.length);
          } else {
            rule.cond = new RegExp(cond === '.' ? '' : `^${cond}`, 'u');
            pfx.push(rule);
          }
        }
        i += +n;
      }
    }
  }

  function parseDic(text) {
    dict = new Map();
    lower = new Map();
    const lines = text.split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l) continue;
      const tab = l.indexOf('\t');
      const entry = tab >= 0 ? l.slice(0, tab) : l;
      const slash = entry.indexOf('/');
      const word = slash >= 0 ? entry.slice(0, slash) : entry;
      const flags = slash >= 0 ? entry.slice(slash + 1) : '';
      dict.set(word, (dict.get(word) || '') + flags + ' ');
      const lw = word.toLowerCase();
      if (lw !== word) lower.set(lw, (lower.get(lw) || '') + flags + ' ');
    }
  }

  function load() {
    if (dict || loading) return loading;
    $('#sb-spell').classList.add('loading');
    $('#sb-spell').dataset.tip = 'A carregar o dicionário de Português (Portugal)…';
    loading = Promise.all([fetchCached(DICT_URL + 'index.aff'), fetchCached(DICT_URL + 'index.dic')]).then(([aff, dic]) => {
      parseAff(aff);
      parseDic(dic);
      $('#sb-spell').classList.remove('loading');
      $('#sb-spell').dataset.tip = 'O Nexora Word está a verificar o documento. Faça duplo clique para ir para o erro seguinte.';
    }).catch(() => {
      failed = true;
      $('#sb-spell').classList.remove('loading');
      $('#sb-spell').dataset.tip = 'Dicionário indisponível (sem ligação à Internet). A usar o corrector do browser.';
      [editor].forEach(el => { el.spellcheck = true; });
    });
    return loading;
  }

  const inDict = (w, map = dict) => map.has(w);
  const flagsOf = (w, map) => map.get(w);
  function checkForm(w, map) {
    if (map.has(w)) return true;
    for (let len = 0; len <= Math.min(maxSfx, w.length - 1); len++) {
      const rules = sfx.get(len ? w.slice(-len) : '');
      if (!rules) continue;
      const base = w.slice(0, w.length - len);
      for (const r of rules) {
        const stem = base + r.strip;
        if (!stem || !r.cond.test(stem)) continue;
        const f = flagsOf(stem, map);
        if (f && f.includes(r.flag)) return true;
        if (r.cross) for (const p of pfx) {
          if (!p.cross || !stem.startsWith(p.add)) continue;
          const s2 = p.strip + stem.slice(p.add.length);
          if (!p.cond.test(s2)) continue;
          const f2 = flagsOf(s2, map);
          if (f2 && f2.includes(r.flag) && f2.includes(p.flag)) return true;
        }
      }
    }
    for (const p of pfx) {
      if (!w.startsWith(p.add)) continue;
      const stem = p.strip + w.slice(p.add.length);
      if (!stem || !p.cond.test(stem)) continue;
      const f = flagsOf(stem, map);
      if (f && f.includes(p.flag)) return true;
    }
    return false;
  }
  function correct(word) {
    if (cache.has(word)) return cache.get(word);
    let ok = checkForm(word, dict);
    if (!ok) {
      const lw = word.toLowerCase();
      if (lw !== word) ok = checkForm(lw, dict) || checkForm(lw, lower);
      if (!ok && /^\p{Lu}\p{Ll}*$/u.test(word)) ok = checkForm(lw, dict);
      if (!ok && word.includes('-')) ok = word.split('-').every(p => !p || correct(p));
    }
    cache.set(word, ok);
    return ok;
  }

  const ACCENTS = { a: 'áàâã', e: 'éê', i: 'í', o: 'óôõ', u: 'úü', c: 'ç' };
  function suggest(word) {
    if (!dict) return [];
    const lw = word.toLowerCase(), out = new Map();
    const add = (c, score) => { if (c && c !== lw && !out.has(c) && correct(c)) out.set(c, score); };
    for (const [a, b] of rep) { let i = lw.indexOf(a); while (i >= 0) { add(lw.slice(0, i) + b + lw.slice(i + a.length), 0); i = lw.indexOf(a, i + 1); } }
    // acentos (erro muito comum ao escrever sem acentos)
    for (let i = 0; i < lw.length; i++) for (const ch of ACCENTS[lw[i]] || '') add(lw.slice(0, i) + ch + lw.slice(i + 1), 1);
    const chars = (tryChars.toLowerCase() || 'aeiosrnmtcdlupvgbfzhqjxç') + 'áéíóúâêôãõç';
    const letters = [...new Set(chars)].filter(c => /\p{L}/u.test(c));
    for (let i = 0; i <= lw.length; i++) {
      if (i < lw.length) add(lw.slice(0, i) + lw.slice(i + 1), 3);
      if (i < lw.length - 1) add(lw.slice(0, i) + lw[i + 1] + lw[i] + lw.slice(i + 2), 2);
      for (const c of letters) {
        if (i < lw.length) add(lw.slice(0, i) + c + lw.slice(i + 1), 2);
        add(lw.slice(0, i) + c + lw.slice(i), 3);
      }
      if (out.size > 40) break;
    }
    // separar palavras coladas
    for (let i = 2; i < lw.length - 1; i++) { const a = lw.slice(0, i), b = lw.slice(i); if (correct(a) && correct(b) && a.length > 1 && b.length > 1) out.set(a + ' ' + b, 4); }
    const caseLike = s => (/^\p{Lu}\p{Ll}/u.test(word) ? s[0].toUpperCase() + s.slice(1) : word === word.toUpperCase() ? s.toUpperCase() : s);
    return [...out.entries()].sort((a, b) => a[1] - b[1] || Math.abs(a[0].length - lw.length) - Math.abs(b[0].length - lw.length)).slice(0, 6).map(([s]) => caseLike(s));
  }

  /* ---------- Varrimento do documento ---------- */
  const SKIP = '.no-proof, .equation, .wc-field, .mm-field, .toc, .citation, .xe, .ta, code, pre, sup.fn-ref, sup.en-ref, a[href^="http"], .tc-del';
  function blocksText() {
    const out = [];
    for (const b of $$(BLOCKS + ', td, th', editor)) {
      if (b.querySelector(BLOCKS) && !b.matches('td,th')) continue;
      if (b.closest(SKIP) || (b.closest('[lang]')?.lang || 'pt-PT').slice(0, 2) !== 'pt') continue;
      const nodes = [], starts = [];
      let text = '';
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement.closest(SKIP) || (n.parentElement.closest(BLOCKS + ', td, th') !== b) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
      while (w.nextNode()) { nodes.push(w.currentNode); starts.push(text.length); text += w.currentNode.nodeValue; }
      if (text.trim()) out.push({ b, nodes, starts, text });
    }
    return out;
  }
  function rangeOf(bt, s, e) {
    const loc = p => { let i = bt.starts.findIndex((st, k) => p < st + bt.nodes[k].nodeValue.length); if (i < 0) i = bt.nodes.length - 1; return { n: bt.nodes[i], o: Math.min(p - bt.starts[i], bt.nodes[i].nodeValue.length) }; };
    const a = loc(s), z = loc(e - 1);
    const r = document.createRange();
    r.setStart(a.n, a.o);
    r.setEnd(z.n, z.o + 1);
    return r;
  }
  const GRAMMAR = [
    [/(?<![\p{L}])(\p{L}+)\s+\1(?![\p{L}])/giu, m => m[1].toLowerCase() !== 'que' && m[1].length > 1, 'Palavra repetida', m => m[1]],
    [/(?<=\S) {2,}(?=\S)/gu, () => true, 'Espaços a mais entre palavras', () => ' '],
    [/(?<=\p{L})\s+([,.;:!?])/gu, () => true, 'Espaço antes da pontuação', m => m[1]],
    [/(?<=\p{Ll})([,;:])(?=\p{L})/gu, () => true, 'Falta um espaço depois da pontuação', m => m[1] + ' '],
    [/\b[Hh]ouveram\b/gu, () => true, 'Concordância: o verbo "haver" no sentido de "existir" é impessoal', () => 'houve'],
    [/\b[Ff]azem(\s+(?:\d+|muitos|vários|dois|três|quatro|cinco)\s+(?:anos|meses|dias|semanas))/gu, () => true, 'Concordância: o verbo "fazer" (tempo decorrido) é impessoal', m => 'faz' + m[1]],
    [/\b[Hh]á\s+(?:\S+\s+){1,3}atrás\b/gu, () => true, 'Redundância: "há ... atrás"', m => m[0].replace(/\s+atrás$/, '')],
    [/\b[Pp]ara mim (fazer|ver|dizer|ir|ler|escrever|saber|ter|ser)\b/gu, () => true, 'Pronome: use "para eu" antes de um verbo no infinitivo', m => m[0].replace(/mim/, 'eu')],
    [/\b[Aa] nível de\b/gu, () => true, 'Expressão desaconselhada: "a nível de"', () => 'em termos de'],
    [/\bmais (melhor|pior)\b/giu, () => true, 'Comparativo duplo', m => m[1]],
  ];
  function run() {
    if (!prefs.spell || failed) { if (hasHL) { CSS.highlights.delete('wc-spell'); CSS.highlights.delete('wc-grammar'); } issues = []; status(); return; }
    if (!dict) { load()?.then(() => schedule(0)); return; }
    const cust = custom(), sel = currentRange(), typingRecent = Date.now() - lastInput < 1500;
    const spellR = [], gramR = [];
    issues = [];
    for (const bt of blocksText()) {
      const re = /[\p{L}][\p{L}\p{M}'’-]*[\p{L}]|[\p{L}]/gu;
      let m;
      while ((m = re.exec(bt.text))) {
        let w = m[0].replace(/[-'’]+$/, '');
        if (w.length < 2 || ignoreAll.has(w) || cust.has(w) || cust.has(w.toLowerCase())) continue;
        if (prefs.ignoreUpper !== false && w === w.toUpperCase() && w.length > 1) continue;
        const after = bt.text[m.index + m[0].length] || '';
        if (prefs.ignoreNums !== false && /\d/.test(after + (bt.text[m.index - 1] || ''))) continue;
        if (/[@/.:]/.test(after) && /^(www|http)/i.test(w)) continue;
        if (correct(w)) continue;
        const r = rangeOf(bt, m.index, m.index + w.length);
        if (typingRecent && sel && sel.collapsed && r.comparePoint(sel.endContainer, sel.endOffset) === 0) continue;
        spellR.push(r);
        issues.push({ type: 'spell', range: r, word: w });
      }
      if (prefs.grammar !== false) for (const [rx, ok, msg, fix] of GRAMMAR) {
        rx.lastIndex = 0;
        let g;
        while ((g = rx.exec(bt.text))) {
          if (!ok(g) || ignoreAll.has('G:' + g[0])) continue;
          const r = rangeOf(bt, g.index, g.index + g[0].length);
          gramR.push(r);
          issues.push({ type: 'grammar', range: r, word: g[0], msg, sugg: [fix(g)] });
        }
      }
      // inicial minúscula no início do parágrafo
      if (prefs.grammar !== false) { const f = /^\s*(\p{Ll})/u.exec(bt.text); if (f && !bt.b.matches('li, td, th') && !/^\s*\p{Ll}+\./u.test(bt.text)) { const r = rangeOf(bt, f.index + f[0].length - 1, f.index + f[0].length); gramR.push(r); issues.push({ type: 'grammar', range: r, word: f[1], msg: 'Maiúsculas: a frase deve começar com letra maiúscula', sugg: [f[1].toUpperCase()] }); } }
    }
    issues.sort((a, b) => a.range.compareBoundaryPoints(Range.START_TO_START, b.range));
    if (hasHL) { CSS.highlights.set('wc-spell', new Highlight(...spellR)); CSS.highlights.set('wc-grammar', new Highlight(...gramR)); }
    status();
  }
  function status() {
    const el = $('#sb-spell');
    el.classList.toggle('has-errors', issues.length > 0);
    el.classList.toggle('ok', !!prefs.spell && issues.length === 0 && !!dict);
  }
  function schedule(delay = 500) { clearTimeout(timer); timer = setTimeout(run, delay); }

  editor.addEventListener('input', () => { lastInput = Date.now(); schedule(900); });

  /* ---------- Menu de contexto ---------- */
  function issueAt(x, y) {
    const r = document.caretRangeFromPoint?.(x, y);
    if (!r) return null;
    return issues.find(i => { try { return i.range.comparePoint(r.startContainer, r.startOffset) === 0; } catch { return false; } }) || null;
  }
  function ctxItems(e) {
    ctxIssue = issueAt(e.clientX, e.clientY);
    if (!ctxIssue) return '';
    const i = ctxIssue;
    const sugg = i.type === 'spell' ? suggest(i.word) : i.sugg;
    i.sugg = sugg;
    const items = sugg.length ? sugg.map((s, k) => `<button class="dd-item sp-sugg" data-cmd="spReplace" data-arg="${k}"><b>${esc(s)}</b></button>`).join('') : '<button class="dd-item" disabled>(Sem Sugestões de Ortografia)</button>';
    if (i.type === 'grammar') return `<div class="dd-title">${esc(i.msg)}</div>${items}<button class="dd-item" data-cmd="spIgnoreOnce">Ignorar uma Vez</button><button class="dd-item" data-cmd="spellDialog">Gramática...</button>`;
    return `${items}<div class="dd-sep"></div><button class="dd-item" data-cmd="spIgnoreAll">Ignorar Tudo</button><button class="dd-item" data-cmd="spAdd">Adicionar ao Dicionário</button>${sugg[0] ? `<button class="dd-item" data-cmd="spAutoCorrect"><i class="ic" data-icon="spell"></i>Correcção Automática: «${esc(sugg[0])}»</button>` : ''}<button class="dd-item" data-cmd="spellDialog">Ortografia...</button>`;
  }
  function replaceIssue(i, text) {
    const r = i.range;
    editor.focus();
    setRange(r);
    document.execCommand('insertText', false, text);
    History.setLabel('Correcção Ortográfica');
    changed();
    schedule(0);
  }

  /* ---------- Caixa Ortografia e Gramática ---------- */
  async function spellDialog() {
    if (!prefs.spell) { prefs.spell = true; savePrefs(); setSpell(true); }
    await load();
    if (failed) return infoBox('Não foi possível carregar o dicionário de Português (é necessária ligação à Internet na primeira utilização).', 'warning');
    run();
    const startR = currentRange();
    let list = issues.filter(i => !startR || i.range.compareBoundaryPoints(Range.START_TO_START, startR) >= 0);
    if (!list.length) list = issues;
    let idx = 0;
    while (idx < list.length) {
      const i = list[idx];
      if (!i.range.startContainer.isConnected) { idx++; continue; }
      i.sugg = i.type === 'spell' ? suggest(i.word) : i.sugg;
      const blk = blockOf(i.range.startContainer);
      const full = blk?.textContent || i.word;
      const pre = document.createRange(); pre.setStart(blk || editor, 0); pre.setEnd(i.range.startContainer, i.range.startOffset);
      const pos = pre.toString().length;
      const ctx = `${esc(full.slice(Math.max(0, pos - 80), pos))}<span class="sp-err">${esc(full.slice(pos, pos + i.word.length))}</span>${esc(full.slice(pos + i.word.length, pos + i.word.length + 80))}`;
      editor.focus(); setRange(i.range.cloneRange());
      i.range.startContainer.parentElement?.scrollIntoView({ block: 'center' });
      const res = await dialog({
        title: 'Ortografia e Gramática: Português (Portugal)',
        width: 520,
        body: `<div class="sp-layout"><div><label>${i.type === 'spell' ? 'Não existe no dicionário:' : esc(i.msg) + ':'}</label><div class="sp-ctx">${ctx}</div><label>Sugestões:</label><select id="sp-s" size="6" style="height:100px">${i.sugg.length ? i.sugg.map((s, k) => `<option value="${k}"${k ? '' : ' selected'}>${esc(s)}</option>`).join('') : '<option disabled>(Sem Sugestões)</option>'}</select>
          <label>Idioma do dicionário:<select><option>Português (Portugal)</option></select></label>${chk('sp-g', 'Verificar gramática', prefs.grammar !== false)}</div>
          <div class="sp-btns"><button class="std" data-a="once">Ignorar uma Vez</button><button class="std" data-a="all">${i.type === 'spell' ? 'Ignorar Tudo' : 'Ignorar Regra'}</button>${i.type === 'spell' ? '<button class="std" data-a="add">Adicionar ao Dicionário</button>' : ''}<hr><button class="std primary" data-a="change">Alterar</button>${i.type === 'spell' ? '<button class="std" data-a="changeall">Alterar Tudo</button><button class="std" data-a="auto">Correcção Automática</button>' : ''}<hr><button class="std" data-a="opts">Opções...</button><button class="std" data-a="undo">Anular</button></div></div>`,
        onOpen: ov => { $$('[data-a]', ov).forEach(b => b.addEventListener('click', () => { ov.dataset.result = b.dataset.a; $('.dlg-buttons .std', ov).click(); })); $('#sp-g', ov).onchange = e => { prefs.grammar = e.target.checked; savePrefs(); }; },
        buttons: [{ label: 'Cancelar', value: ov => ({ a: ov.dataset.result || 'cancel', s: i.sugg[+$('#sp-s', ov).value] }) }],
      });
      const a = res?.a || 'cancel';
      if (a === 'cancel') return;
      if (a === 'opts') { await CMD.options(); continue; }
      if (a === 'undo') { History.undo(); idx = Math.max(0, idx - 1); run(); list = issues; continue; }
      if (a === 'all') ignoreAll.add(i.type === 'spell' ? i.word : 'G:' + i.word);
      if (a === 'add') { const s = custom(); s.add(i.word); saveCustom(s); cache.clear(); }
      if ((a === 'change' || a === 'changeall' || a === 'auto') && res.s) {
        if (a === 'changeall') list.filter(x => x.word === i.word && x.range.startContainer.isConnected).reverse().forEach(x => { setRange(x.range); document.execCommand('insertText', false, res.s); });
        else replaceIssue(i, res.s);
        if (a === 'auto') { AutoCorrect.add(i.word, res.s); }
        changed();
      }
      run();
      list = issues.filter(x => x !== i && x.range.startContainer.isConnected && x.range.compareBoundaryPoints(Range.START_TO_START, i.range) >= 0 && !(a === 'all' && x.word === i.word));
      idx = 0;
    }
    infoBox('A verificação ortográfica e gramatical está concluída.');
  }

  async function dictionaryDialog() {
    const s = custom();
    const res = await dialog({ title: 'Dicionários Personalizados — CUSTOM.DIC', width: 360, body: `<label>Palavra(s):<input id="cd-w"></label><select id="cd-l" size="9" style="height:160px">${[...s].sort().map(w => `<option>${esc(w)}</option>`).join('')}</select><div class="dlg-inline"><button class="std" id="cd-add">Adicionar</button><button class="std" id="cd-del">Eliminar</button><button class="std" id="cd-clr">Eliminar Tudo</button></div>`, onOpen: ov => { const l = $('#cd-l', ov); $('#cd-add', ov).onclick = () => { const w = $('#cd-w', ov).value.trim(); if (w) { s.add(w); l.insertAdjacentHTML('beforeend', `<option>${esc(w)}</option>`); $('#cd-w', ov).value = ''; } }; $('#cd-del', ov).onclick = () => { const o = l.selectedOptions[0]; if (o) { s.delete(o.value); o.remove(); } }; $('#cd-clr', ov).onclick = () => { s.clear(); l.innerHTML = ''; }; }, buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancelar', value: null }] });
    if (res) { saveCustom(s); cache.clear(); schedule(0); }
  }

  Object.assign(CMD, {
    spellDialog, spell: () => setSpell(!prefs.spell),
    spReplace: k => { if (ctxIssue?.sugg[+k] !== undefined) replaceIssue(ctxIssue, ctxIssue.sugg[+k]); },
    spIgnoreAll: () => { if (ctxIssue) { ignoreAll.add(ctxIssue.word); run(); } },
    spIgnoreOnce: () => { if (ctxIssue) { ignoreAll.add('G:' + ctxIssue.word); run(); } },
    spAdd: () => { if (ctxIssue) { const s = custom(); s.add(ctxIssue.word); saveCustom(s); cache.clear(); run(); } },
    spAutoCorrect: () => { if (ctxIssue?.sugg[0]) { AutoCorrect.add(ctxIssue.word, ctxIssue.sugg[0]); replaceIssue(ctxIssue, ctxIssue.sugg[0]); } },
  });
  return { schedule, load, correct: w => (dict ? correct(w) : true), suggest, ctxItems, dictionaryDialog, autocorrectDialog: () => AutoCorrect.dialog(), run, get ready() { return !!dict; } };
})();
window.Spell = Spell;

/* =========================================================
   Correcção Automática
   ========================================================= */
const AutoCorrect = (() => {
  const BUILTIN = {
    '(c)': '©', '(r)': '®', '(tm)': '™', '(e)': '€', '...': '…', '--': '—', '->': '→', '<-': '←', '=>': '⇒', '<=>': '⇔', ':)': '☺', ':(': '☹', '1/2': '½', '1/4': '¼', '3/4': '¾',
    nao: 'não', tambem: 'também', entao: 'então', voce: 'você', ate: 'até', so: 'só', apos: 'após', alem: 'além', atraves: 'através', porem: 'porém', ninguem: 'ninguém', alguem: 'alguém',
    tb: 'também', pq: 'porque', qd: 'quando', vc: 'você', acçao: 'acção', informaçao: 'informação', soluçao: 'solução', situaçao: 'situação', funçao: 'função', opçao: 'opção', relaçao: 'relação',
    tmabém: 'também', poruqe: 'porque', qeu: 'que', ecom: 'e com', paar: 'para', praa: 'para', cmo: 'como', ocm: 'com', mto: 'muito', msm: 'mesmo', obg: 'obrigado',
  };
  const load = () => { try { return JSON.parse(localStorage.getItem('wc-autocorrect') || '{}'); } catch { return {}; } };
  const table = () => ({ ...BUILTIN, ...load() });
  const opts = () => ({ caps: prefs.acCaps !== false, two: prefs.acTwo !== false, replace: prefs.acReplace !== false, days: prefs.acDays !== false });
  const ABBR = /\b(sr|sra|dr|dra|eng|prof|etc|p\.ex|ex|n\.º|nº|pág|cap|art|av|tel)\.$/i;

  editor.addEventListener('input', e => {
    if (e.inputType !== 'insertText' || !e.data || !/^[\s.,;:!?)\]"'»]$/.test(e.data)) return;
    const s = getSelection();
    if (!s.isCollapsed) return;
    const node = s.anchorNode, off = s.anchorOffset;
    if (node?.nodeType !== 3 || nodeEl(node).closest('.equation, .wc-field, code, pre, .no-proof, a')) return;
    const before = node.nodeValue.slice(0, off - 1);
    const m = /(\S+)$/.exec(before);
    if (!m) return;
    const tok = m[1], start = before.length - tok.length;
    const o = opts(), t = table();
    let rep = null;
    const key = tok.toLowerCase();
    if (o.replace && t[tok] !== undefined) rep = t[tok];
    else if (o.replace && t[key] !== undefined) rep = /^\p{Lu}/u.test(tok) ? t[key][0].toUpperCase() + t[key].slice(1) : t[key];
    else if (o.two && /^\p{Lu}{2}\p{Ll}{2,}$/u.test(tok)) rep = tok[0] + tok.slice(1).toLowerCase();
    // maiúscula no início da frase
    if (o.caps) {
      const word = rep ?? tok;
      const prev = node.nodeValue.slice(0, start);
      const blk = blockOf(node);
      const pre = document.createRange();
      if (blk) { pre.setStart(blk, 0); pre.setEnd(node, start); }
      const textBefore = blk ? pre.toString() : prev;
      const sentenceStart = /^\s*$/.test(textBefore) || (/[.!?]\s+$/.test(textBefore) && !ABBR.test(textBefore.trimEnd()));
      if (sentenceStart && /^\p{Ll}/u.test(word) && /\p{L}/u.test(word) && !/^(www|http|e-?mail)/i.test(word)) rep = word[0].toUpperCase() + word.slice(1);
    }
    if (rep === null || rep === tok) return;
    node.replaceData(start, tok.length, rep);
    const nr = document.createRange();
    nr.setStart(node, start + rep.length + 1);
    nr.collapse(true);
    setRange(nr);
  });

  function add(from, to) { const l = load(); l[from.toLowerCase()] = to; localStorage.setItem('wc-autocorrect', JSON.stringify(l)); }

  async function dialog_() {
    const o = opts(), t = table();
    const res = await dialog({
      title: 'Correcção Automática: Português (Portugal)',
      width: 460,
      body: `${chk('ac-two', 'Corrigir DUas MAiúsculas INiciais', o.two)}${chk('ac-caps', 'Colocar em maiúscula a primeira letra das frases', o.caps)}${chk('ac-days', 'Corrigir o uso acidental da tecla cAPS lOCK', o.days)}${chk('ac-rep', 'Substituir texto ao escrever', o.replace)}
        <div class="two"><label>Substituir:<input id="ac-f"></label><label>Por:<input id="ac-t"></label></div>
        <select id="ac-l" size="8" style="height:150px;font-family:Consolas,monospace">${Object.entries(t).sort().map(([k, v]) => `<option value="${esc(k)}">${esc(k.padEnd(14, ' '))} → ${esc(v)}</option>`).join('')}</select>
        <div class="dlg-inline"><button class="std" id="ac-add">Adicionar</button><button class="std" id="ac-del">Eliminar</button></div>`,
      onOpen: ov => {
        const l = $('#ac-l', ov);
        l.onchange = () => { $('#ac-f', ov).value = l.value; $('#ac-t', ov).value = table()[l.value] || ''; };
        $('#ac-add', ov).onclick = () => { const f = $('#ac-f', ov).value.trim(), to = $('#ac-t', ov).value; if (f) { add(f, to); l.insertAdjacentHTML('afterbegin', `<option value="${esc(f)}">${esc(f.padEnd(14, ' '))} → ${esc(to)}</option>`); } };
        $('#ac-del', ov).onclick = () => { const v = l.value; const c = load(); delete c[v]; localStorage.setItem('wc-autocorrect', JSON.stringify(c)); l.selectedOptions[0]?.remove(); };
      },
      buttons: [{ label: 'OK', primary: true, value: ov => ({ two: $('#ac-two', ov).checked, caps: $('#ac-caps', ov).checked, days: $('#ac-days', ov).checked, rep: $('#ac-rep', ov).checked }) }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    Object.assign(prefs, { acTwo: res.two, acCaps: res.caps, acDays: res.days, acReplace: res.rep });
    savePrefs();
  }
  return { add, dialog: dialog_ };
})();
