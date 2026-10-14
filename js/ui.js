'use strict';
/* =========================================================
   Interface do Nexora Word: SuperSugestões, Mini Barra de
   Ferramentas, Pré-visualização Dinâmica, KeyTips, separadores
   contextuais, painéis de tarefas, barra de mensagens,
   barra de estado personalizável e modo Sobrepor.
   ========================================================= */

/* ---------- Descrições das SuperSugestões ---------- */
const TIPS = {
  paste: 'Colar o conteúdo da Área de Transferência.', cut: 'Cortar a selecção do documento e colocá-la na Área de Transferência.', copy: 'Copiar a selecção e colocá-la na Área de Transferência.',
  painter: 'Copiar a formatação de um local e aplicá-la a outro. Faça duplo clique para aplicar a mesma formatação a vários locais.',
  grow: 'Aumentar o tamanho do tipo de letra.', shrink: 'Diminuir o tamanho do tipo de letra.', clearFormat: 'Limpar toda a formatação da selecção, deixando apenas o texto simples.',
  bold: 'Aplicar negrito ao texto seleccionado.', italic: 'Aplicar itálico ao texto seleccionado.', underline: 'Sublinhar o texto seleccionado.', strikeThrough: 'Desenhar uma linha no meio do texto seleccionado.',
  subscript: 'Criar letras pequenas abaixo da linha de base do texto.', superscript: 'Criar letras pequenas acima da linha do texto.',
  highlight: 'Fazer com que o texto pareça ter sido marcado com um marcador.', foreColorLast: 'Alterar a cor do texto.',
  insertUnorderedList: 'Iniciar uma lista com marcas.', insertOrderedList: 'Iniciar uma lista numerada.', outdent: 'Diminuir o nível de avanço do parágrafo.', indent: 'Aumentar o nível de avanço do parágrafo.',
  sort: 'Ordenar alfabeticamente o texto seleccionado ou ordenar dados numéricos.', showMarks: 'Mostrar marcas de parágrafo e outros símbolos de formatação ocultos.',
  justifyLeft: 'Alinhar o texto à esquerda.', justifyCenter: 'Centrar o texto.', justifyRight: 'Alinhar o texto à direita.', justifyFull: 'Alinhar o texto às margens esquerda e direita, adicionando espaço extra entre as palavras, se necessário.',
  shadingLast: 'Colorir o fundo do texto ou parágrafo seleccionado.', border: 'Personalizar os limites das células ou do texto seleccionado.',
  find: 'Localizar texto no documento.', replace: 'Substituir texto no documento.', blankPage: 'Inserir uma nova página em branco na posição do cursor.', pageBreak: 'Iniciar a página seguinte na posição actual.',
  image: 'Inserir uma imagem a partir de um ficheiro.', clipart: 'Inserir ClipArt no documento, incluindo desenhos e ilustrações.', smartart: 'Inserir um gráfico SmartArt para comunicar informações visualmente.',
  chart: 'Inserir um gráfico para ilustrar e comparar dados.', link: 'Criar uma ligação para uma página Web, uma imagem, um endereço de correio electrónico ou um programa.',
  bookmark: 'Criar um marcador para atribuir um nome a um ponto específico do documento.', crossRef: 'Referir-se a itens como títulos, ilustrações e tabelas.',
  textbox: 'Inserir caixas de texto pré-formatadas.', dropCap: 'Criar uma letra maiúscula grande no início de um parágrafo.', comment: 'Adicionar um comentário sobre a selecção.',
  spellDialog: 'Verificar a ortografia e a gramática do texto no documento.', wordCount: 'Saber o número de palavras, caracteres, parágrafos e linhas do documento.',
  trackChanges: 'Controlar todas as alterações efectuadas no documento, incluindo inserções, eliminações e alterações de formatação.',
  acceptChange: 'Aceitar a alteração actual e avançar para a seguinte alteração proposta.', rejectChange: 'Rejeitar a alteração actual e avançar para a seguinte.',
  protect: 'Restringir a forma como as pessoas podem aceder ao documento.', viewPrint: 'Ver o documento tal como será impresso.', viewReading: 'Ver o documento no modo Leitura em Ecrã Inteiro.',
  viewWeb: 'Ver o documento tal como seria apresentado numa página Web.', viewOutline: 'Ver o documento como um destaque e mostrar as ferramentas de destaque.', viewDraft: 'Ver o documento como um rascunho para edição rápida do texto.',
  zoomDialog: 'Abrir a caixa de diálogo Zoom para especificar o nível de zoom do documento.', zoom100: 'Ampliar o documento para 100% do tamanho normal.', zoomPage: 'Ampliar o documento para que uma página inteira caiba na janela.',
  zoomWidth: 'Ampliar o documento para que a largura da página corresponda à largura da janela.', footnote: 'Adicionar uma nota de rodapé ao documento.', endnote: 'Adicionar uma nota de fim ao documento.',
  tocUpdate: 'Actualizar o índice para que todas as entradas façam referência aos números de página correctos.', caption: 'Adicionar uma legenda a uma imagem ou outra imagem.', markEntry: 'Incluir o texto seleccionado no índice remissivo.',
  envelopes: 'Criar e imprimir envelopes.', labels: 'Criar e imprimir etiquetas.', mmPreview: 'Substituir os campos de impressão em série por dados reais da lista de destinatários.',
  research: 'Abrir o painel de tarefas Pesquisar para procurar em materiais de referência.', thesaurus: 'Sugerir outras palavras com significado semelhante ao da palavra seleccionada.',
  translate: 'Traduzir o texto seleccionado para um idioma diferente.', save: 'Guardar o documento.', undo: 'Anular a última acção.', redo: 'Refazer a última acção.',
  stylesPane: 'Mostrar a janela Estilos.', fontDialog: 'Mostrar a caixa de diálogo Tipo de Letra.', paragraphDialog: 'Mostrar a caixa de diálogo Parágrafo.', pageSetup: 'Mostrar a caixa de diálogo Configurar Página.',
  clipboardPane: 'Mostrar o painel de tarefas Área de Transferência.', mergeCells: 'Unir as células seleccionadas numa só célula.', splitCells: 'Dividir as células seleccionadas em várias células novas.',
  macroList: 'Ver a lista de macros, a partir da qual pode executar, criar ou eliminar uma macro.', newWindow: 'Abrir uma nova janela com uma vista do documento actual.', splitView: 'Dividir a janela actual em duas partes.',
};
const DD_TIPS = {
  'dd-fonts': 'Alterar o tipo de letra.', 'dd-sizes': 'Alterar o tamanho do tipo de letra.', 'dd-case': 'Alterar todo o texto seleccionado para MAIÚSCULAS, minúsculas ou outras opções comuns.',
  'dd-multilevel': 'Iniciar uma lista com vários níveis.', 'dd-linespacing': 'Alterar o espaçamento entre as linhas de texto.', 'dd-changestyles': 'Alterar o conjunto de estilos, cores e tipos de letra utilizados neste documento.',
  'dd-table': 'Inserir ou desenhar uma tabela no documento.', 'dd-shapes': 'Inserir formas já existentes, tais como rectângulos e círculos, setas, linhas, símbolos de fluxograma e chamadas.',
  'dd-header': 'Editar o cabeçalho do documento. O conteúdo do cabeçalho será apresentado na parte superior de cada página impressa.', 'dd-footer': 'Editar o rodapé do documento.',
  'dd-pagenum': 'Inserir números de página no documento.', 'dd-quickparts': 'Inserir partes de conteúdo reutilizáveis, incluindo campos, propriedades do documento e fórmulas pré-formatadas.',
  'dd-wordart': 'Inserir texto decorativo no documento.', 'dd-equation': 'Inserir equações matemáticas comuns ou criar as suas próprias equações.', 'dd-symbols': 'Inserir símbolos que não constam do teclado.',
  'dd-themes': 'Alterar a estrutura geral de todo o documento, incluindo cores, tipos de letra e efeitos.', 'dd-margins': 'Seleccionar os tamanhos das margens para todo o documento ou para a secção actual.',
  'dd-orientation': 'Alternar as páginas entre os esquemas vertical e horizontal.', 'dd-size': 'Escolher um tamanho de papel para a secção actual.', 'dd-columns': 'Dividir o texto em duas ou mais colunas.',
  'dd-breaks': 'Adicionar quebras de página, secção ou coluna ao documento.', 'dd-linenums': 'Adicionar números de linha à margem junto de cada linha do documento.', 'dd-hyphen': 'Activar a hifenização, que permite ao Nexora Word dividir as linhas entre as sílabas das palavras.',
  'dd-watermark': 'Inserir texto fantasma atrás do conteúdo da página.', 'dd-pagecolor': 'Escolher uma cor para o fundo da página.', 'dd-toc': 'Adicionar um índice ao documento.',
  'dd-citation': 'Citar um livro, um artigo de jornal ou outra publicação periódica como fonte de informações no documento.', 'dd-biblio': 'Adicionar uma bibliografia que lista todas as fontes citadas no documento.',
  'dd-mm-start': 'Iniciar uma impressão em série para criar uma carta modelo que pretende imprimir ou enviar por correio electrónico várias vezes.', 'dd-mm-recipients': 'Escolher a lista de pessoas às quais pretende enviar a carta.',
  'dd-mm-fields': 'Adicionar um campo da lista de destinatários ao documento.', 'dd-mm-finish': 'Concluir a impressão em série.', 'dd-balloons': 'Escolher como mostrar as revisões no documento.',
  'dd-compare': 'Comparar ou combinar várias versões de um documento.', 'dd-macros': 'Ver a lista de macros, gravar uma nova macro.', 'dd-cover': 'Inserir uma folha de rosto totalmente formatada.',
};

/* ---------- SuperSugestões ---------- */
const SuperTip = (() => {
  const el = $('#supertip');
  let timer = 0, current = null;
  function show(target) {
    let title = target.dataset.tip || target.getAttribute('title') || '';
    if (target.hasAttribute('title')) { target.dataset.tip = title; target.removeAttribute('title'); }
    if (!title) return;
    const cmd = target.dataset.cmd, dd = target.dataset.dropdown;
    const desc = target.dataset.desc || TIPS[cmd] || DD_TIPS[dd] || '';
    const inRibbon = !!target.closest('#ribbon, #qat, #tabs');
    el.innerHTML = `<b>${esc(title)}</b>${desc ? `<p>${esc(desc)}</p>` : ''}${inRibbon && desc ? '<div class="st-foot"><i class="ic" data-icon="question"></i>Prima F1 para obter mais ajuda.</div>' : ''}`;
    el.classList.toggle('simple', !desc);
    renderIcons(el);
    el.classList.remove('hidden');
    const r = target.getBoundingClientRect();
    let x = r.left, y = r.bottom + 4;
    if (target.closest('#ribbon')) y = $('#ribbon').getBoundingClientRect().bottom + 2;
    if (target.closest('#statusbar')) y = r.top - el.offsetHeight - 4;
    x = Math.min(x, innerWidth - el.offsetWidth - 6);
    el.style.left = Math.max(2, x) + 'px';
    el.style.top = Math.max(2, y) + 'px';
  }
  function hide() { clearTimeout(timer); current = null; el.classList.add('hidden'); }
  document.addEventListener('mouseover', e => {
    const t = e.target.closest?.('[data-tip], [title]');
    if (t === current) return;
    hide();
    if (!t || t.closest('#editor, .sheet, .dialog .dlg-body')) return;
    if (t.hasAttribute('title')) { t.dataset.tip = t.getAttribute('title'); t.removeAttribute('title'); }
    current = t;
    timer = setTimeout(() => current === t && show(t), t.closest('#ribbon, #qat') ? 650 : 450);
  });
  document.addEventListener('mousedown', hide, true);
  document.addEventListener('keydown', hide, true);
  return { hide };
})();

/* ---------- Painéis de tarefas ---------- */
const TaskPane = (() => {
  const pane = $('#task-pane');
  let onClose = null, kind = null;
  function open(k, title, html, opts = {}) {
    if (kind && kind !== k) close();
    kind = k;
    $('#task-pane-title').textContent = title;
    const body = $('#task-pane-body');
    if (typeof html === 'string') body.innerHTML = html; else { body.innerHTML = ''; body.append(html); }
    renderIcons(body);
    pane.classList.remove('hidden');
    pane.style.width = (opts.width || 260) + 'px';
    onClose = opts.onClose || null;
    scheduleRulers();
    return body;
  }
  function close() {
    if (!kind) return;
    pane.classList.add('hidden');
    onClose?.();
    onClose = null;
    kind = null;
    scheduleRulers();
  }
  return { open, close, get kind() { return kind; }, body: () => $('#task-pane-body') };
})();

/* ---------- Barra de mensagens ---------- */
const MessageBar = {
  show(text, btn, action) {
    $('#message-text').innerHTML = text;
    const b = $('#message-btn');
    b.textContent = btn || '';
    b.classList.toggle('hidden', !btn);
    b.onclick = action || null;
    if ($('#chk-msgbar').checked) $('#message-bar').classList.remove('hidden');
    renderIcons($('#message-bar'));
    scheduleRulers();
  },
  hide() { $('#message-bar').classList.add('hidden'); scheduleRulers(); },
};

/* ---------- Separadores contextuais ---------- */
const ContextTabs = (() => {
  let last = '';
  function context() {
    const r = currentRange();
    const el = nodeEl(r?.startContainer);
    return {
      table: !!el?.closest('#editor td, #editor th'),
      img: !!selImg,
      hf: page.classList.contains('hf-mode'),
    };
  }
  function update() {
    const c = context();
    const key = JSON.stringify(c);
    $$('.ctx-set').forEach(s => s.classList.toggle('show', !!c[s.dataset.ctxset]));
    $$('[data-needs="img"]').forEach(b => { b.disabled = !c.img; b.classList.toggle('disabled', !c.img); });
    const active = $('.tab.active');
    if (active?.classList.contains('ctx-tab') && !active.closest('.ctx-set').classList.contains('show')) selectTab('base');
    if (key !== last) {
      const prev = last ? JSON.parse(last) : {};
      if (c.hf && !prev.hf) selectTab('hf-design');
      if (c.img && !prev.img && $('.tab.active')?.dataset.tab === 'base' && selImg?.dataset.justInserted) selectTab('img-format');
      last = key;
      window.TableTools?.sync?.();
      window.ImageTools?.sync?.();
    }
  }
  return { update };
})();

/* ---------- Mini Barra de Ferramentas ---------- */
const MiniBar = (() => {
  const bar = $('#mini-toolbar');
  bar.innerHTML = `<div class="mini-row">
      <button class="mini-combo" data-dropdown="dd-fonts" data-tip="Tipo de Letra"><span id="mini-font">Calibri</span></button>
      <button class="mini-combo small" data-dropdown="dd-sizes" data-tip="Tamanho do Tipo de Letra"><span id="mini-size">11</span></button>
      <button class="btn-ic" data-cmd="grow" data-tip="Aumentar Tipo de Letra"><i class="ic" data-icon="grow"></i></button>
      <button class="btn-ic" data-cmd="shrink" data-tip="Diminuir Tipo de Letra"><i class="ic" data-icon="shrink"></i></button>
      <button class="btn-ic" data-dropdown="dd-styles" data-tip="Estilos"><i class="ic" data-icon="changestyles"></i></button>
      <button class="btn-ic" data-cmd="painter" data-tip="Pincel de Formatação"><i class="ic" data-icon="painter"></i></button>
    </div><div class="mini-row">
      <button class="btn-ic txt" data-cmd="bold" data-tip="Negrito"><b>N</b></button>
      <button class="btn-ic txt" data-cmd="italic" data-tip="Itálico"><i style="font-family:'Times New Roman';font-weight:bold;font-size:14px">I</i></button>
      <button class="btn-ic txt" data-cmd="underline" data-tip="Sublinhado"><u style="font-weight:bold">S</u></button>
      <button class="btn-ic" data-cmd="justifyCenter" data-tip="Centrar"><i class="ic" data-icon="alignCenter"></i></button>
      <button class="btn-ic" data-cmd="highlight" data-tip="Cor de Realce do Texto"><i class="ic" data-icon="highlight"></i></button>
      <button class="btn-ic" data-cmd="foreColorLast" data-tip="Cor do Tipo de Letra"><i class="ic" data-icon="fontcolor"></i></button>
      <button class="btn-ic" data-cmd="outdent" data-tip="Diminuir Avanço"><i class="ic" data-icon="outdent"></i></button>
      <button class="btn-ic" data-cmd="indent" data-tip="Aumentar Avanço"><i class="ic" data-icon="indent"></i></button>
      <button class="btn-ic" data-cmd="insertUnorderedList" data-tip="Marcas"><i class="ic" data-icon="bullets"></i></button>
    </div>`;
  let visible = false, anchor = null, hovering = false;
  function show(x, y) {
    if (!prefs.miniToolbar) return;
    renderIcons(bar);
    $('#mini-font').textContent = fontInput.value;
    $('#mini-size').textContent = sizeInput.value;
    bar.classList.remove('hidden');
    const w = bar.offsetWidth, h = bar.offsetHeight;
    bar.style.left = Math.max(4, Math.min(innerWidth - w - 4, x - 10)) + 'px';
    bar.style.top = Math.max(4, y - h - 14) + 'px';
    bar.style.opacity = '0.25';
    anchor = { x, y };
    visible = true;
  }
  function hide() { visible = false; bar.classList.add('hidden'); }
  editor.addEventListener('mouseup', e => {
    if (e.button !== 0) return;
    setTimeout(() => {
      const s = getSelection();
      if (s.rangeCount && !s.isCollapsed && editor.contains(s.anchorNode) && !painter) show(e.clientX, e.clientY);
      else hide();
    }, 10);
  });
  document.addEventListener('mousemove', e => {
    if (!visible || hovering || openDD) return;
    const r = bar.getBoundingClientRect();
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    const d = Math.hypot(dx, dy);
    if (d > 160) return hide();
    bar.style.opacity = String(Math.max(0.15, 1 - d / 120));
  });
  bar.addEventListener('mouseenter', () => { hovering = true; bar.style.opacity = '1'; });
  bar.addEventListener('mouseleave', () => { hovering = false; });
  editor.addEventListener('keydown', hide);
  editor.addEventListener('mousedown', hide);
  scroller.addEventListener('scroll', hide);
  return { hide, get visible() { return visible; } };
})();

/* ---------- Pré-visualização Dinâmica ---------- */
const Preview = (() => {
  let active = null, timer = 0;
  const offsets = () => {
    const r = currentRange();
    if (!r || !editor.contains(r.startContainer)) return null;
    const pre = document.createRange();
    pre.setStart(editor, 0); pre.setEnd(r.startContainer, r.startOffset);
    const s = pre.toString().length;
    return { s, e: s + r.toString().length };
  };
  function wrapRange(styleFn) {
    const r = currentRange();
    if (!r || r.collapsed || !editor.contains(r.commonAncestorContainer)) return null;
    const sel = offsets();
    const spans = [];
    for (const t of textNodesIn(r)) {
      let node = t.node;
      if (t.end < node.nodeValue.length) node.splitText(t.end);
      if (t.start > 0) node = node.splitText(t.start);
      const sp = document.createElement('span');
      sp.className = 'wc-preview';
      styleFn(sp);
      node.replaceWith(sp);
      sp.append(node);
      spans.push(sp);
    }
    return { spans, sel };
  }
  function restoreSel(sel) {
    if (!sel) return;
    const idx = textIndex();
    const at = p => { const i = idx.starts.findIndex((st, k) => p <= st + idx.nodes[k].nodeValue.length); const k = i < 0 ? idx.nodes.length - 1 : i; return { node: idx.nodes[k], offset: p - idx.starts[k] }; };
    if (!idx.nodes.length) return;
    const a = at(sel.s), b = at(sel.e), r = document.createRange();
    r.setStart(a.node, Math.max(0, a.offset)); r.setEnd(b.node, Math.max(0, b.offset));
    setRange(r);
  }
  function start(kind, value) {
    end();
    if (kind === 'font' || kind === 'size' || kind === 'color' || kind === 'hl' || kind === 'cstyle') {
      const w = wrapRange(sp => {
        if (kind === 'font') sp.style.fontFamily = `'${value}'`;
        if (kind === 'size') sp.style.fontSize = value + 'pt';
        if (kind === 'color') sp.style.color = value;
        if (kind === 'hl') sp.style.backgroundColor = value || 'transparent';
        if (kind === 'cstyle') sp.className += ' ' + DocStyles.metaOf(value).cls;
      });
      if (w) active = { kind, ...w };
    } else if (kind === 'pstyle') {
      const r = currentRange();
      if (!r) return;
      const root = rootOf(r.commonAncestorContainer);
      if (root !== editor) return;
      const blocks = $$(BLOCKS, editor).filter(b => r.intersectsNode(b) && !b.querySelector(BLOCKS));
      if (!blocks.length) return;
      const m = DocStyles.metaOf(value);
      const probe = document.createElement(m.tag || 'p');
      if (m.cls) probe.className = m.cls;
      probe.style.cssText = 'position:absolute;visibility:hidden';
      editor.append(probe);
      const cs = getComputedStyle(probe);
      const props = ['fontFamily', 'fontSize', 'color', 'fontWeight', 'fontStyle', 'marginTop', 'marginBottom', 'lineHeight', 'letterSpacing', 'borderBottom', 'paddingBottom', 'fontVariant', 'marginLeft'];
      const vals = Object.fromEntries(props.map(p => [p, cs[p]]));
      probe.remove();
      active = { kind, blocks: blocks.map(b => { const old = b.getAttribute('style'); Object.assign(b.style, vals); return { b, old }; }) };
    } else if (kind === 'theme') {
      active = { kind, prev: settings.theme };
      DocStyles.setTheme(value);
    } else if (kind === 'tstyle' && window.TableTools) {
      const t = TableTools.current();
      if (t) { active = { kind, t, prev: t.className }; TableTools.applyStyleClass(t, value); }
    } else if (kind === 'pic' && selImg) {
      active = { kind, img: selImg, prev: selImg.getAttribute('style'), prevCls: selImg.className };
      ImageTools?.applyStyle(selImg, value, true);
      positionImgBox();
    }
  }
  function end() {
    clearTimeout(timer);
    if (!active) return;
    const a = active;
    active = null;
    if (a.spans) {
      a.spans.forEach(sp => { const p = sp.parentNode; while (sp.firstChild) p.insertBefore(sp.firstChild, sp); sp.remove(); p.normalize(); });
      restoreSel(a.sel);
    } else if (a.blocks) a.blocks.forEach(({ b, old }) => { if (old === null) b.removeAttribute('style'); else b.setAttribute('style', old); });
    else if (a.kind === 'theme') DocStyles.setTheme(a.prev);
    else if (a.kind === 'tstyle') a.t.className = a.prev;
    else if (a.kind === 'pic') { if (a.prev === null) a.img.removeAttribute('style'); else a.img.setAttribute('style', a.prev); a.img.className = a.prevCls; positionImgBox(); }
  }
  function previewOf(el) {
    if (!prefs.livePreview) return null;
    const cmd = el.dataset.cmd, arg = el.dataset.arg;
    if (cmd === 'fontName') return ['font', arg];
    if (cmd === 'fontSize') return ['size', arg];
    if (cmd === 'foreColor' && arg && arg !== 'custom') return ['color', arg];
    if (cmd === 'highlightColor' && arg !== 'custom') return ['hl', arg];
    if (cmd === 'style') return [DocStyles.defs()[arg]?.type === 'c' ? 'cstyle' : 'pstyle', arg];
    if (cmd === 'setTheme') return ['theme', arg];
    if (cmd === 'tableStyle') return ['tstyle', arg];
    if (cmd === 'picStyle') return ['pic', arg];
    return null;
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest?.('.dropdown [data-cmd], .gallery [data-cmd]');
    if (!el) return;
    const p = previewOf(el);
    if (!p) return;
    clearTimeout(timer);
    timer = setTimeout(() => start(...p), 120);
  });
  document.addEventListener('mouseout', e => {
    const el = e.target.closest?.('.dropdown [data-cmd], .gallery [data-cmd]');
    if (!el || el.contains(e.relatedTarget)) return;
    end();
  });
  document.addEventListener('mousedown', e => { if (e.target.closest?.('.dropdown [data-cmd], .gallery [data-cmd]')) end(); }, true);
  document.addEventListener('click', () => end(), true);
  return { start, end };
})();

/* ---------- KeyTips (tecla Alt) ---------- */
const KeyTips = (() => {
  const layer = $('#keytips');
  let mode = null, buffer = '', altAlone = false;
  const badges = items => {
    layer.innerHTML = items.map(({ el, kt }) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return '';
      const inRibbon = el.closest('#ribbon');
      const x = r.left + r.width / 2, y = inRibbon ? (el.matches('.btn-lg, .btn-lg *') ? r.bottom - 6 : r.top + r.height / 2 + 4) : r.bottom - 4;
      return `<span class="kt" style="left:${x}px;top:${y}px" data-k="${kt}">${kt}</span>`;
    }).join('');
    layer.classList.add('show');
  };
  function showTabs() {
    mode = 'tabs';
    buffer = '';
    const items = [{ el: $('#office-btn'), kt: 'F' }];
    $$('#qat .qat-btn').forEach((b, i) => items.push({ el: b, kt: String(i + 1) }));
    $$('#tabs .tab').forEach(t => { if (t.offsetParent) items.push({ el: t, kt: t.dataset.kt }); });
    badges(items);
    current = items;
  }
  let current = [];
  function showPanel() {
    mode = 'panel';
    buffer = '';
    const panel = $('.panel.active');
    current = $$('[data-kt]', panel).filter(el => el.offsetParent).map(el => ({ el, kt: el.dataset.kt }));
    badges(current);
  }
  function hide() { mode = null; buffer = ''; layer.classList.remove('show'); layer.innerHTML = ''; }
  function press(k) {
    buffer += k.toUpperCase();
    const exact = current.find(i => i.kt.toUpperCase() === buffer);
    const partial = current.filter(i => i.kt.toUpperCase().startsWith(buffer));
    if (exact) {
      const el = exact.el;
      if (mode === 'tabs') {
        if (el.id === 'office-btn') { hide(); toggleOfficeMenu(); return; }
        if (el.classList.contains('tab')) { selectTab(el.dataset.tab); requestAnimationFrame(showPanel); return; }
        hide(); el.click(); return;
      }
      hide();
      if (el.matches('input')) { el.focus(); el.select?.(); return; }
      el.click();
      return;
    }
    if (!partial.length) { buffer = ''; return; }
    $$('.kt', layer).forEach(b => b.classList.toggle('dim', !b.dataset.k.toUpperCase().startsWith(buffer)));
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Alt') { altAlone = true; return; }
    altAlone = false;
    if (!mode) return;
    if (e.key === 'Escape') { e.preventDefault(); if (mode === 'panel') showTabs(); else hide(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); press(e.key); }
  }, true);
  document.addEventListener('keyup', e => {
    if (e.key === 'Alt' && altAlone) {
      e.preventDefault();
      if (mode) hide(); else showTabs();
    }
    altAlone = false;
  }, true);
  document.addEventListener('mousedown', () => { if (mode) hide(); }, true);
  addEventListener('blur', hide);
  return { hide };
})();

/* ---------- Barra de estado personalizável, Caps Lock, Sobrepor ---------- */
const StatusBar = (() => {
  const ITEMS = [['page', 'Número de Página Formatado'], ['section', 'Secção'], ['words', 'Número de Palavras'], ['spell', 'Verificação Ortográfica e Gramatical'], ['lang', 'Idioma'], ['track', 'Controlar Alterações'], ['caps', 'Caps Lock'], ['ovr', 'Sobrepor'], ['macro', 'Gravação de Macros'], ['views', 'Atalhos de Visualização'], ['zoom', 'Zoom'], ['slider', 'Controlo de Deslize do Zoom']];
  const DEFAULT_HIDDEN = ['section', 'caps', 'ovr'];
  const hidden = () => prefs.statusHidden ?? DEFAULT_HIDDEN;
  function apply() {
    const h = hidden();
    $$('#statusbar [data-sb]').forEach(el => el.classList.toggle('sb-off', h.includes(el.dataset.sb)));
    caps();
  }
  let capsOn = false;
  function caps(e) {
    if (e?.getModifierState) capsOn = e.getModifierState('CapsLock');
    $('#sb-caps').classList.toggle('sb-off', hidden().includes('caps') || !capsOn);
  }
  document.addEventListener('keydown', caps);
  document.addEventListener('keyup', caps);
  $('#statusbar').addEventListener('contextmenu', e => {
    e.preventDefault();
    const m = $('#ctx-menu');
    m.innerHTML = '<div class="dd-title">Personalizar Barra de Estado</div>' + ITEMS.map(([k, l]) => `<button class="dd-item${hidden().includes(k) ? '' : ' checked'}" data-sbtoggle="${k}">${l}</button>`).join('');
    m.classList.add('open');
    m.style.left = Math.min(e.clientX, innerWidth - m.offsetWidth - 4) + 'px';
    m.style.top = Math.max(0, e.clientY - m.offsetHeight) + 'px';
  });
  $('#ctx-menu').addEventListener('click', e => {
    const b = e.target.closest('[data-sbtoggle]');
    if (!b) return;
    const k = b.dataset.sbtoggle, h = [...hidden()];
    const i = h.indexOf(k);
    if (i >= 0) h.splice(i, 1); else h.push(k);
    prefs.statusHidden = h;
    savePrefs();
    apply();
    b.classList.toggle('checked');
  });
  // Modo Sobrepor
  function setOvr(on) {
    prefs.overtype = on;
    $('#sb-ovr').textContent = on ? 'Sobrepor' : 'Inserir';
    $('#sb-ovr').classList.toggle('on', on);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Insert' && prefs.overtypeKey !== false && rootOf(e.target)) { e.preventDefault(); setOvr(!prefs.overtype); } });
  editor.addEventListener('beforeinput', e => {
    if (!prefs.overtype || e.inputType !== 'insertText' || !e.data) return;
    const s = getSelection();
    if (!s.isCollapsed) return;
    for (let i = 0; i < e.data.length; i++) s.modify('extend', 'forward', 'character');
    if (s.toString().includes('\n')) s.collapseToStart();
  });
  return { apply, setOvr };
})();

/* ---------- Ecrã inicial ---------- */
const Splash = {
  hide() {
    const s = $('#splash');
    if (!s) return;
    s.classList.add('fade');
    setTimeout(() => s.remove(), 450);
  },
};

/* ---------- Comandos genéricos de interface ---------- */
let lastDDAnchor = null;
Object.assign(CMD, {
  undo: () => History.undo(), redo: () => History.redo(),
  openDD: id => setTimeout(() => lastDDAnchor && toggleDropdown(id, lastDDAnchor, lastDDAnchor), 0),
  galleryUp: id => $('#' + (id || 'style-gallery')).scrollBy({ top: -60, left: -360, behavior: 'smooth' }),
  galleryDown: id => $('#' + (id || 'style-gallery')).scrollBy({ top: 60, left: 360, behavior: 'smooth' }),
  closeTaskPane: () => TaskPane.close(), hideMessage: () => MessageBar.hide(),
  toggleOvertype: () => StatusBar.setOvr(!prefs.overtype),
  macroRecord: () => Macros.startRecording(), macroStop: () => Macros.stopRecording(), macroList: () => Macros.list(),
  macroToggle: () => (Macros.recording ? Macros.stopRecording() : Macros.startRecording()),
});

/* Ganchos chamados quando um menu pendente é aberto */
const DD_HOOKS = {
  'dd-undo': () => History.renderList(),
};
