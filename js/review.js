'use strict';
/* =========================================================
   Rever: Controlar Alterações (inserções/eliminações), aceitar
   e rejeitar, comentários em balões, painel de revisão,
   comparar/combinar documentos, sinónimos, pesquisa, tradução
   e idioma.
   ========================================================= */
const Review = (() => {
  const PALETTE = ['#c0504d', '#1f6fc5', '#2f8f3b', '#8064a2', '#d0721a', '#0d8f8f', '#b23c82', '#7a6a1a'];
  const colorOf = a => { let h = 0; for (const c of a || '') h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
  const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const tracking = () => !!settings.trackChanges;
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; e.dataset.author = prefs.user; e.dataset.date = now(); e.style.setProperty('--tc', colorOf(prefs.user)); return e; };

  function colorize(root = page) { $$('.tc-ins, .tc-del, .comment', root).forEach(e => { e.style.setProperty('--tc', colorOf(e.dataset.author)); }); }

  function syncTrack() {
    $('#btn-track')?.classList.toggle('active', tracking());
    $('#sb-track').textContent = `Controlar Alterações: ${tracking() ? 'Activado' : 'Desactivado'}`;
    $('#sb-track').classList.toggle('on', tracking());
  }

  /* ---------- Inserção e eliminação controladas ---------- */
  function markDeleted(r) {
    const nodes = textNodesIn(r).reverse();
    let first = null, last = null;
    for (const t of nodes) {
      let node = t.node;
      if (t.end < node.nodeValue.length) node.splitText(t.end);
      if (t.start > 0) node = node.splitText(t.start);
      const ins = node.parentElement.closest('.tc-ins');
      if (ins && ins.dataset.author === prefs.user) {
        const marker = document.createTextNode('');
        node.replaceWith(marker);
        if (!ins.textContent) { ins.replaceWith(marker); }
        first = first || marker; last = marker;
        continue;
      }
      let del = node.parentElement.closest('.tc-del');
      if (!del) { del = mk('del', 'tc-del'); node.replaceWith(del); del.append(node); }
      first = first || del; last = del;
    }
    // imagens incluídas na selecção
    const root = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    $$('img', root).filter(i => r.intersectsNode(i) && !i.closest('.tc-del')).forEach(i => { const d = mk('del', 'tc-del'); i.replaceWith(d); d.append(i); last = d; });
    return { first: last, last: first };
  }

  function caretAt(node, after) {
    const r = document.createRange();
    if (after) r.setStartAfter(node); else r.setStartBefore(node);
    r.collapse(true);
    setRange(r);
  }

  function insertTracked(text) {
    let r = getSelection().getRangeAt(0);
    if (!r.collapsed) {
      const m = markDeleted(r);
      if (m.first) caretAt(m.first, true);
      r = getSelection().getRangeAt(0);
    }
    // não escrever dentro de texto eliminado
    const delEl = nodeEl(r.startContainer)?.closest('.tc-del');
    if (delEl) { caretAt(delEl, true); r = getSelection().getRangeAt(0); }
    const sc = r.startContainer, so = r.startOffset;
    const ownIns = el => el?.classList?.contains('tc-ins') && el.dataset.author === prefs.user;
    if (sc.nodeType === 3 && ownIns(sc.parentElement)) {
      sc.insertData(so, text);
      const nr = document.createRange(); nr.setStart(sc, so + text.length); nr.collapse(true); setRange(nr);
      return;
    }
    const prev = sc.nodeType === 3 ? (so === 0 ? sc.previousSibling : null) : sc.childNodes[so - 1];
    if (ownIns(prev)) {
      const t = prev.lastChild?.nodeType === 3 ? prev.lastChild : prev.appendChild(document.createTextNode(''));
      t.appendData(text);
      const nr = document.createRange(); nr.setStart(t, t.length); nr.collapse(true); setRange(nr);
      return;
    }
    const ins = mk('ins', 'tc-ins');
    ins.textContent = text;
    r.insertNode(ins);
    const nr = document.createRange(); nr.setStart(ins.firstChild, text.length); nr.collapse(true); setRange(nr);
  }

  function deleteTracked(dir) {
    const s = getSelection();
    if (s.isCollapsed) s.modify('extend', dir === 'back' ? 'backward' : 'forward', 'character');
    if (s.isCollapsed) return;
    const r = s.getRangeAt(0);
    const m = markDeleted(r);
    if (m.first) caretAt(dir === 'back' ? m.last : m.first, dir !== 'back');
  }

  editor.addEventListener('beforeinput', e => {
    if (!tracking() || History.applying || !e.cancelable) return;
    const t = e.inputType;
    if (t === 'insertText' || t === 'insertReplacementText') {
      e.preventDefault();
      insertTracked(e.data ?? e.dataTransfer?.getData('text/plain') ?? '');
      changed('typing');
    } else if (t === 'deleteContentBackward' || t === 'deleteWordBackward') {
      e.preventDefault(); deleteTracked('back'); changed('typing');
    } else if (t === 'deleteContentForward' || t === 'deleteWordForward' || t === 'deleteByCut') {
      e.preventDefault(); deleteTracked('fwd'); changed();
    }
  });
  editor.addEventListener('paste', e => {
    if (!tracking()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    insertTracked(e.clipboardData.getData('text/plain'));
    changed();
  }, true);

  /* ---------- Aceitar / rejeitar ---------- */
  const changesList = () => $$('.tc-ins, .tc-del', editor);
  function accept(el) { if (el.classList.contains('tc-ins')) unwrap(el); else el.remove(); }
  function reject(el) { if (el.classList.contains('tc-del')) unwrap(el); else el.remove(); }
  function currentChange() {
    const r = currentRange();
    const el = nodeEl(r?.startContainer)?.closest('.tc-ins, .tc-del');
    if (el) return el;
    return changesList().find(c => r && (c.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_PRECEDING)) || null;
  }
  function nav(dir, list = changesList()) {
    if (!list.length) { infoBox('O documento não contém alterações controladas.'); return null; }
    const r = currentRange();
    const after = list.filter(c => r && (c.compareDocumentPosition(r.endContainer) & Node.DOCUMENT_POSITION_PRECEDING) && !c.contains(r.endContainer));
    const before = list.filter(c => r && (c.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) && !c.contains(r.startContainer));
    const el = dir === 'next' ? after[0] || list[0] : before.at(-1) || list.at(-1);
    const rr = document.createRange();
    rr.selectNodeContents(el);
    editor.focus();
    setRange(rr);
    el.scrollIntoView({ block: 'center' });
    return el;
  }
  function acceptAll(all = false) { changesList().forEach(accept); if (!all) changed(); }

  /* ---------- Comentários e balões ---------- */
  const balloonsEl = $('#balloons');
  function layoutBalloons() {
    const comments = $$('.comment', editor);
    const showDel = settings.balloons === 'all';
    const dels = showDel ? $$('.tc-del', editor) : [];
    const items = [...comments, ...dels];
    const on = items.length && settings.balloons !== 'inline' && !page.classList.contains('hide-comments') && page.classList.contains('paged');
    pagesEl.classList.toggle('has-balloons', !!on);
    if (!on) { balloonsEl.innerHTML = ''; return; }
    const z = zoom / 100, pr = page.getBoundingClientRect();
    const focused = document.activeElement?.closest?.('.balloon')?.dataset.cid;
    const data = items.map((el, i) => {
      if (el.classList.contains('comment') && !el.dataset.cid) el.dataset.cid = 'c' + Math.random().toString(36).slice(2, 8);
      const r = el.getBoundingClientRect();
      return { el, y: (r.top - pr.top) / z, i };
    }).sort((a, b) => a.y - b.y);
    if (focused) return;
    let lastBottom = 0;
    balloonsEl.innerHTML = '';
    let n = 0;
    data.forEach(d => {
      const b = document.createElement('div');
      const isC = d.el.classList.contains('comment');
      b.className = 'balloon' + (isC ? '' : ' del');
      b.style.setProperty('--tc', colorOf(d.el.dataset.author));
      if (isC) {
        n++;
        d.el.dataset.n = n;
        b.dataset.cid = d.el.dataset.cid;
        b.innerHTML = `<div class="bl-head"><b>Comentário [${esc(d.el.dataset.initials || '')}${n}]:</b><button class="bl-x" title="Eliminar comentário">✕</button></div><div class="bl-text" contenteditable="true" spellcheck="false">${esc(d.el.dataset.text || '')}</div>`;
        const tx = $('.bl-text', b);
        tx.addEventListener('input', () => { d.el.dataset.text = tx.textContent; d.el.title = `${d.el.dataset.author}: ${tx.textContent}`; changed('typing'); });
        tx.addEventListener('focus', () => b.classList.add('active'));
        tx.addEventListener('blur', () => { b.classList.remove('active'); setTimeout(layoutBalloons, 50); });
        $('.bl-x', b).addEventListener('click', () => { unwrap(d.el); History.setLabel('Eliminar Comentário'); changed(); layoutBalloons(); });
        b.addEventListener('mouseenter', () => d.el.classList.add('hl'));
        b.addEventListener('mouseleave', () => d.el.classList.remove('hl'));
      } else b.innerHTML = `<div class="bl-head"><b>Eliminado:</b> ${esc(d.el.textContent.slice(0, 120))}</div>`;
      const top = Math.max(d.y - 4, lastBottom + 6);
      b.style.top = top + 'px';
      const line = document.createElement('div');
      line.className = 'bl-line';
      line.style.setProperty('--tc', colorOf(d.el.dataset.author));
      const er = d.el.getBoundingClientRect();
      const x0 = (er.right - pr.left) / z;
      line.style.left = x0 + 'px';
      line.style.top = d.y + er.height / z - 2 + 'px';
      line.style.width = Math.max(0, pr.width / z - x0) + 'px';
      balloonsEl.append(line, b);
      lastBottom = top + b.offsetHeight;
    });
  }

  async function newComment() {
    let r = currentRange();
    if (!r) return;
    if (r.collapsed) {
      const s = getSelection();
      s.modify('move', 'backward', 'word');
      s.modify('extend', 'forward', 'word');
      r = s.rangeCount ? s.getRangeAt(0) : r;
      if (r.collapsed) return infoBox('Seleccione o texto que pretende comentar.');
    }
    const span = mk('span', 'comment');
    span.dataset.initials = prefs.initials;
    span.dataset.text = '';
    span.dataset.cid = 'c' + Math.random().toString(36).slice(2, 8);
    span.append(r.extractContents());
    r.insertNode(span);
    History.setLabel('Novo Comentário');
    changed();
    layoutBalloons();
    const b = $(`.balloon[data-cid="${span.dataset.cid}"] .bl-text`);
    if (b) placeCaret(b, false);
    else {
      const t = await dialog({ title: 'Novo Comentário', width: 340, body: `<label>Comentário de ${esc(prefs.user)}:<textarea id="cm-text" style="height:70px"></textarea></label>`, buttons: [{ label: 'OK', primary: true, value: ov => $('#cm-text', ov).value.trim() }, { label: 'Cancelar', value: null }] });
      if (t === null) { unwrap(span); return changed(); }
      span.dataset.text = t;
      span.title = `${prefs.user}: ${t}`;
      changed();
    }
  }

  /* ---------- Painel de Revisão ---------- */
  function reviewPane() {
    const items = $$('.tc-ins, .tc-del, .comment', editor);
    const counts = { ins: $$('.tc-ins', editor).length, del: $$('.tc-del', editor).length, com: $$('.comment', editor).length };
    const body = TaskPane.open('review', 'Revisões', `<div class="rp-sum"><b>Painel de Revisão</b><br>${counts.ins + counts.del + counts.com} revisões: ${counts.ins} inserções, ${counts.del} eliminações, ${counts.com} comentários</div>
      <div class="rp-list">${items.map((el, i) => `<div class="rp-item" data-i="${i}" style="--tc:${colorOf(el.dataset.author)}"><div class="rp-h"><b>${el.classList.contains('comment') ? 'Comentário' : el.classList.contains('tc-ins') ? 'Inserido' : 'Eliminado'}</b> ${esc(el.dataset.author || '')} <small>${el.dataset.date ? esc(new Date(el.dataset.date).toLocaleString('pt-PT')) : ''}</small></div><div class="rp-t">${esc(el.classList.contains('comment') ? el.dataset.text || '' : el.textContent).slice(0, 200)}</div></div>`).join('') || '<div class="om-empty">Não existem revisões.</div>'}</div>`, { width: 260 });
    $$('.rp-item', body).forEach(d => d.addEventListener('click', () => { const el = items[+d.dataset.i]; el.scrollIntoView({ block: 'center' }); const r = document.createRange(); r.selectNodeContents(el); editor.focus(); setRange(r); }));
  }

  /* ---------- Comparar / Combinar ---------- */
  function lcs(a, b, eq = (x, y) => x === y) {
    const n = a.length, m = b.length;
    if (n * m > 4e6) return null;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ops = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (eq(a[i], b[j])) { ops.push(['=', a[i], b[j]]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(['-', a[i++]]);
      else ops.push(['+', b[j++]]);
    }
    while (i < n) ops.push(['-', a[i++]]);
    while (j < m) ops.push(['+', b[j++]]);
    return ops;
  }
  function blocksOf(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    const out = [];
    const walk = el => { for (const c of el.children) { if (c.matches('ul,ol,div:not(.toc)')) walk(c); else if (c.matches('p,h1,h2,h3,h4,h5,h6,li,pre,table')) out.push({ tag: c.tagName === 'LI' ? 'p' : c.tagName.toLowerCase(), cls: c.className, text: c.matches('table') ? c.innerText.replace(/\s+/g, ' ') : c.textContent, html: c.outerHTML }); } };
    walk(d);
    return out;
  }
  const attr = (author, date) => `data-author="${esc(author)}" data-date="${date}" style="--tc:${colorOf(author)}"`;
  function diffDocs(origHtml, revHtml, author) {
    const A = blocksOf(origHtml), B = blocksOf(revHtml), date = now();
    const ops = lcs(A.map(x => x.text.trim()), B.map(x => x.text.trim())) || [...A.map(x => ['-', x.text]), ...B.map(x => ['+', x.text])];
    const out = [];
    const ins = t => `<ins class="tc-ins" ${attr(author, date)}>${esc(t)}</ins>`, del = t => `<del class="tc-del" ${attr(author, date)}>${esc(t)}</del>`;
    let ai = 0, bi = 0;
    for (let k = 0; k < ops.length; k++) {
      const [op] = ops[k];
      if (op === '=') { out.push(B[bi].html); ai++; bi++; continue; }
      // agrupar eliminação seguida de inserção como alteração no parágrafo
      if (op === '-' && ops[k + 1]?.[0] === '+') {
        const a = A[ai], b = B[bi];
        const wa = a.text.split(/(\s+)/), wb = b.text.split(/(\s+)/);
        const wops = lcs(wa, wb);
        const inner = wops ? wops.map(([o, x, y]) => o === '=' ? esc(y) : o === '-' ? del(x) : ins(x)).join('') : del(a.text) + ins(b.text);
        out.push(`<${b.tag}${b.cls ? ` class="${esc(b.cls)}"` : ''}>${inner}</${b.tag}>`);
        ai++; bi++; k++;
        continue;
      }
      if (op === '-') { out.push(`<${A[ai].tag}>${del(A[ai].text)}</${A[ai].tag}>`); ai++; }
      else { out.push(`<${B[bi].tag}${B[bi].cls ? ` class="${esc(B[bi].cls)}"` : ''}>${ins(B[bi].text)}</${B[bi].tag}>`); bi++; }
    }
    return out.join('');
  }
  async function readAnyFile(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext === 'docx') { const r = await DocxIO.read(await f.arrayBuffer()); const html = r.html ?? r.altChunk; const d = new DOMParser().parseFromString(html, 'text/html'); return sanitize((d.querySelector('div.WordSection1') || d.body).innerHTML); }
    if (ext === 'txt') return textToHtml(await f.text());
    const d = new DOMParser().parseFromString(await f.text(), 'text/html');
    return sanitize((d.querySelector('div.WordSection1') || d.body).innerHTML);
  }
  async function compare(mode) {
    const res = await dialog({
      title: mode === 'combine' ? 'Combinar Documentos' : 'Comparar Documentos',
      width: 460,
      body: `<div class="two">${fieldset('Documento original', `<label class="fcheck"><input type="radio" name="cp-o" value="cur" checked> Documento actual (${esc(docName)})</label><label class="fcheck"><input type="radio" name="cp-o" value="file"> Outro ficheiro</label>`)}${fieldset('Documento revisto', `<label class="fcheck"><input type="radio" name="cp-r" value="file" checked> Escolher ficheiro...</label><label class="fcheck"><input type="radio" name="cp-r" value="cur"> Documento actual</label>`)}</div>
        <label>Marcar alterações não identificadas com:<input id="cp-a" value="${mode === 'combine' ? 'Revisor' : 'Autor'}"></label><small>Formatos: .docx, .html, .txt</small>`,
      buttons: [{ label: 'OK', primary: true, value: ov => ({ o: $('input[name=cp-o]:checked', ov).value, r: $('input[name=cp-r]:checked', ov).value, a: $('#cp-a', ov).value.trim() || 'Autor' }) }, { label: 'Cancelar', value: null }],
    });
    if (!res || res.o === res.r) return res && infoBox('Seleccione dois documentos diferentes.');
    const cur = cleanEditorHtml();
    const pick = async () => { const f = await pickAux('.docx,.html,.htm,.txt'); return f ? readAnyFile(f) : null; };
    const orig = res.o === 'cur' ? cur : await pick();
    if (orig === null) return;
    const rev = res.r === 'cur' ? cur : await pick();
    if (rev === null) return;
    const out = diffDocs(orig, rev, res.a);
    if (mode === 'compare' && !(await confirmDiscard())) return;
    const s = JSON.parse(JSON.stringify(settings));
    docCounter++;
    setDocument(`<meta name="wc-settings" content="${esc(JSON.stringify(s))}">${out}`, mode === 'combine' ? docName : `Comparação${docCounter}`);
    dirty = true;
    reviewPane();
  }

  /* ---------- Dicionário de Sinónimos ---------- */
  const SYN = {
    bom: ['óptimo', 'excelente', 'agradável', 'positivo', 'favorável'], mau: ['ruim', 'péssimo', 'negativo', 'nocivo'], grande: ['enorme', 'vasto', 'amplo', 'extenso', 'considerável'], pequeno: ['reduzido', 'diminuto', 'minúsculo', 'escasso'],
    bonito: ['belo', 'lindo', 'formoso', 'atraente'], feio: ['desagradável', 'disforme', 'horrível'], rápido: ['veloz', 'ligeiro', 'célere', 'ágil'], lento: ['vagaroso', 'demorado', 'moroso'],
    importante: ['relevante', 'essencial', 'fundamental', 'significativo', 'crucial'], difícil: ['complicado', 'árduo', 'complexo', 'custoso'], fácil: ['simples', 'acessível', 'elementar'],
    feliz: ['contente', 'alegre', 'satisfeito', 'radiante'], triste: ['infeliz', 'abatido', 'melancólico', 'desanimado'], novo: ['recente', 'moderno', 'actual', 'inédito'], velho: ['antigo', 'idoso', 'usado', 'gasto'],
    começar: ['iniciar', 'principiar', 'encetar', 'arrancar'], terminar: ['acabar', 'concluir', 'finalizar', 'encerrar'], fazer: ['realizar', 'executar', 'efectuar', 'produzir', 'elaborar'],
    dizer: ['afirmar', 'declarar', 'referir', 'mencionar', 'expressar'], ver: ['observar', 'olhar', 'avistar', 'notar'], usar: ['utilizar', 'empregar', 'aplicar'], ajudar: ['auxiliar', 'apoiar', 'socorrer', 'assistir'],
    problema: ['questão', 'dificuldade', 'obstáculo', 'contratempo'], solução: ['resolução', 'resposta', 'saída', 'remédio'], ideia: ['conceito', 'noção', 'pensamento', 'proposta'], objectivo: ['meta', 'fim', 'propósito', 'finalidade', 'alvo'],
    casa: ['lar', 'habitação', 'residência', 'moradia', 'domicílio'], trabalho: ['emprego', 'ofício', 'tarefa', 'labor', 'ocupação'], empresa: ['companhia', 'firma', 'sociedade', 'organização'],
    cliente: ['comprador', 'consumidor', 'freguês'], resultado: ['efeito', 'consequência', 'desfecho', 'produto'], mudança: ['alteração', 'modificação', 'transformação', 'variação'],
    melhorar: ['aperfeiçoar', 'aprimorar', 'optimizar', 'progredir'], aumentar: ['ampliar', 'crescer', 'elevar', 'expandir'], diminuir: ['reduzir', 'baixar', 'decrescer', 'atenuar'],
    claro: ['evidente', 'nítido', 'óbvio', 'límpido'], certo: ['correcto', 'exacto', 'seguro', 'verdadeiro'], errado: ['incorrecto', 'equivocado', 'falso'], possível: ['viável', 'exequível', 'provável'],
    muito: ['bastante', 'imenso', 'demasiado'], pouco: ['escasso', 'insuficiente', 'reduzido'], sempre: ['constantemente', 'continuamente', 'permanentemente'], nunca: ['jamais'],
    rapidamente: ['depressa', 'velozmente', 'prontamente'], também: ['igualmente', 'além disso', 'ainda'], mas: ['porém', 'contudo', 'todavia', 'no entanto'], porque: ['pois', 'visto que', 'já que'],
    exemplo: ['caso', 'modelo', 'amostra', 'ilustração'], parte: ['porção', 'fracção', 'secção', 'segmento'], forma: ['maneira', 'modo', 'feitio', 'formato'], tempo: ['período', 'época', 'momento', 'duração'],
    documento: ['texto', 'ficheiro', 'registo', 'escrito'], escrever: ['redigir', 'compor', 'anotar', 'registar'], ler: ['percorrer', 'consultar', 'examinar'], pensar: ['reflectir', 'ponderar', 'considerar', 'meditar'],
  };
  const norm = w => w.toLowerCase();
  function thesaurus(word) {
    const r = currentRange();
    word ??= (r && !r.collapsed ? r.toString() : wordAtCaret()).trim();
    const list = SYN[norm(word)] || Object.entries(SYN).filter(([, v]) => v.includes(norm(word))).flatMap(([k, v]) => [k, ...v.filter(x => x !== norm(word))]);
    const body = TaskPane.open('thesaurus', 'Pesquisar', `<label>Pesquisar:<div class="ms-row"><input id="th-q" value="${esc(word)}"><button class="std" id="th-go">→</button></div></label><label>${sel('th-src', [['th', 'Dicionário de Sinónimos: Português (Portugal)'], ['web', 'Pesquisar na Web (Bing)']], 'th')}</label>
      <div class="th-list">${list.length ? `<div class="th-head">${esc(word)} (adj./n.)</div>${list.map(s => `<button class="th-item" data-w="${esc(s)}">${esc(s)}</button>`).join('')}` : '<div class="om-empty">Não foram encontrados resultados. Tente outra palavra.</div>'}</div><div class="cb-hint">Clique numa palavra para a inserir no lugar da selecção. Clique com Ctrl para pesquisar sinónimos dessa palavra.</div>`, { width: 240 });
    $('#th-go', body).onclick = () => ($('#th-src', body).value === 'web' ? window.open('https://www.bing.com/search?q=' + encodeURIComponent($('#th-q', body).value), '_blank', 'noopener') : thesaurus($('#th-q', body).value));
    $('#th-q', body).addEventListener('keydown', e => { if (e.key === 'Enter') $('#th-go', body).click(); });
    $$('.th-item', body).forEach(b => b.addEventListener('click', e => { if (e.ctrlKey) return thesaurus(b.dataset.w); replaceWord(b.dataset.w); }));
  }
  function wordAtCaret() {
    const s = getSelection();
    if (!s.rangeCount || !editor.contains(s.anchorNode)) return '';
    const r = s.getRangeAt(0).cloneRange();
    s.modify('move', 'backward', 'word'); s.modify('extend', 'forward', 'word');
    const w = s.toString();
    return w;
  }
  function replaceWord(w) {
    restore();
    const s = getSelection();
    if (s.isCollapsed) { s.modify('move', 'backward', 'word'); s.modify('extend', 'forward', 'word'); }
    const t = s.toString(), trail = t.match(/\s*$/)[0];
    exec('insertText', w + trail);
  }

  function research() {
    const q = (currentRange()?.toString() || wordAtCaret()).trim();
    const body = TaskPane.open('research', 'Pesquisar', `<label>Pesquisar:<input id="rs-q" value="${esc(q)}"></label><label>${sel('rs-src', [['bing', 'Bing (Web)'], ['wiki', 'Wikipédia (Português)'], ['dic', 'Dicionário Priberam'], ['th', 'Dicionário de Sinónimos']], 'bing')}</label><button class="std" id="rs-go">Iniciar pesquisa</button><div class="cb-hint">Os resultados abrem num novo separador do browser.</div>`, { width: 240 });
    $('#rs-go', body).onclick = () => {
      const v = $('#rs-q', body).value.trim(), src = $('#rs-src', body).value;
      if (!v) return;
      if (src === 'th') return thesaurus(v);
      window.open({ bing: 'https://www.bing.com/search?q=', wiki: 'https://pt.wikipedia.org/w/index.php?search=', dic: 'https://dicionario.priberam.org/' }[src] + encodeURIComponent(v), '_blank', 'noopener');
    };
  }
  function translate() {
    const q = (currentRange()?.toString() || '').trim();
    const L = [['pt', 'Português'], ['en', 'Inglês'], ['es', 'Espanhol'], ['fr', 'Francês'], ['de', 'Alemão'], ['it', 'Italiano']];
    const body = TaskPane.open('translate', 'Traduzir', `<label>Texto:<textarea id="tr-q" style="height:90px">${esc(q)}</textarea></label><label>De:${sel('tr-f', L, 'pt')}</label><label>Para:${sel('tr-t', L, 'en')}</label><button class="std" id="tr-go">Traduzir</button><div class="cb-hint">A tradução é efectuada pelo Microsoft Translator (Bing) num novo separador.</div>`, { width: 240 });
    $('#tr-go', body).onclick = () => window.open(`https://www.bing.com/translator?text=${encodeURIComponent($('#tr-q', body).value)}&from=${$('#tr-f', body).value}&to=${$('#tr-t', body).value}`, '_blank', 'noopener');
  }
  async function language() {
    const L = [['pt-PT', 'Português (Portugal)'], ['pt-BR', 'Português (Brasil)'], ['en-GB', 'Inglês (Reino Unido)'], ['en-US', 'Inglês (EUA)'], ['es-ES', 'Espanhol (Espanha)'], ['fr-FR', 'Francês (França)'], ['de-DE', 'Alemão (Alemanha)'], ['it-IT', 'Italiano (Itália)']];
    const b = blockOf(currentRange()?.startContainer);
    const res = await dialog({ title: 'Idioma', width: 340, body: `<label>Marcar texto seleccionado como:<select id="lg-l" size="8" style="height:150px">${L.map(([v, l]) => `<option value="${v}"${(b?.lang || editor.lang) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>${chk('lg-np', 'Não verificar ortografia ou gramática', b?.classList.contains('no-proof'))}${chk('lg-auto', 'Detectar idioma automaticamente', true)}`, buttons: [{ label: 'Predefinição...', value: ov => ({ l: $('#lg-l', ov).value, np: $('#lg-np', ov).checked, def: true }) }, { label: 'OK', primary: true, value: ov => ({ l: $('#lg-l', ov).value, np: $('#lg-np', ov).checked }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    if (res.def) editor.lang = res.l;
    else selectedBlocks().forEach(x => { x.lang = res.l; x.classList.toggle('no-proof', res.np); });
    $('#sb-lang').textContent = L.find(l => l[0] === res.l)[1];
    History.setLabel('Idioma');
    changed();
    Spell.schedule(0);
  }

  async function trackOptions() {
    const o = settings.trackOpts || {};
    const res = await dialog({ title: 'Opções de Controlo de Alterações', width: 420, body: `${fieldset('Marcas', `<div class="two"><label>Inserções:${sel('to-ins', [['underline', 'Sublinhado'], ['bold', 'Negrito'], ['italic', 'Itálico'], ['color', 'Só cor'], ['dunder', 'Sublinhado duplo']], o.ins || 'underline')}</label><label>Cor:${sel('to-insc', [['author', 'Por autor'], ['#c0504d', 'Vermelho'], ['#1f6fc5', 'Azul'], ['#2f8f3b', 'Verde']], o.insColor || 'author')}</label><label>Eliminações:${sel('to-del', [['strike', 'Rasurado'], ['hidden', 'Oculto'], ['caret', '^'], ['dstrike', 'Rasurado duplo']], o.del || 'strike')}</label><label>Cor:${sel('to-delc', [['author', 'Por autor'], ['#c0504d', 'Vermelho'], ['#1f6fc5', 'Azul']], o.delColor || 'author')}</label></div>`)}${fieldset('Balões', `<label>Largura preferida:<input type="number" id="to-w" value="${o.width || 6.5}" step="0.5"> cm</label>`)}`, buttons: [{ label: 'OK', primary: true, value: ov => ({ ins: $('#to-ins', ov).value, insColor: $('#to-insc', ov).value, del: $('#to-del', ov).value, delColor: $('#to-delc', ov).value, width: num($('#to-w', ov).value) || 6.5 }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    settings.trackOpts = res;
    applyTrackOpts();
    changed();
  }
  function applyTrackOpts() {
    const o = settings.trackOpts || {};
    page.dataset.tcIns = o.ins || 'underline';
    page.dataset.tcDel = o.del || 'strike';
    page.style.setProperty('--tc-ins-fixed', o.insColor && o.insColor !== 'author' ? o.insColor : '');
    page.style.setProperty('--tc-del-fixed', o.delColor && o.delColor !== 'author' ? o.delColor : '');
    page.classList.toggle('tc-fixed-ins', !!(o.insColor && o.insColor !== 'author'));
    page.classList.toggle('tc-fixed-del', !!(o.delColor && o.delColor !== 'author'));
    pagesEl.style.setProperty('--balloon-w', (o.width || 6.5) + 'cm');
  }

  $('#review-view').addEventListener('change', e => {
    page.classList.remove('rv-final', 'rv-original');
    if (e.target.value === 'final') page.classList.add('rv-final');
    if (e.target.value === 'original') page.classList.add('rv-original');
    layoutBalloons();
  });

  Object.assign(CMD, {
    trackChanges: () => { if (settings.protect?.kind === 'track') return infoBox('O documento está protegido. Não é possível desactivar o controlo de alterações.'); settings.trackChanges = !tracking(); syncTrack(); changed(); },
    trackOptions, changeUser: () => CMD.options(),
    acceptChange: one => { const c = currentChange(); if (!c) return infoBox('Não existem mais alterações controladas.'); accept(c); History.setLabel('Aceitar Alteração'); changed(); if (one !== 'one' && changesList().length) nav('next'); },
    rejectChange: one => { const c = currentChange(); if (!c) return infoBox('Não existem mais alterações controladas.'); reject(c); History.setLabel('Rejeitar Alteração'); changed(); if (one !== 'one' && changesList().length) nav('next'); },
    acceptAll: () => { acceptAll(); History.setLabel('Aceitar Todas as Alterações'); changed(); },
    rejectAll: () => { changesList().forEach(reject); History.setLabel('Rejeitar Todas as Alterações'); changed(); },
    changeNav: d => nav(d),
    comment: newComment,
    deleteComment: () => { const c = nodeEl(currentRange()?.startContainer)?.closest('.comment') || $$('.comment', editor)[0]; if (c) { unwrap(c); changed(); } },
    deleteComments: () => { $$('.comment', editor).forEach(unwrap); History.setLabel('Eliminar Todos os Comentários'); changed(); },
    commentNav: d => nav(d, $$('.comment', editor)),
    balloons: m => { settings.balloons = m; layoutBalloons(); changed(); },
    showMarkup: k => { if (k === 'comments') page.classList.toggle('hide-comments'); if (k === 'insdel') page.classList.toggle('hide-insdel'); layoutBalloons(); },
    reviewPane, compare, thesaurus: () => thesaurus(), research, translate, language,
  });

  function onDocument() { colorize(); syncTrack(); applyTrackOpts(); layoutBalloons(); }
  let balloonTimer = 0;
  const schedule = () => { clearTimeout(balloonTimer); balloonTimer = setTimeout(layoutBalloons, 60); };

  return { layoutBalloons: schedule, onDocument, syncTrack, acceptAll, colorOf, wordAtCaret, replaceWord, thesaurus };
})();
window.Review = Review;
