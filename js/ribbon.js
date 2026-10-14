'use strict';
/* =========================================================
   Especificação do friso do Nexora Word (pt-PT) e menus.
   Este ficheiro é carregado antes do app.js e só gera HTML.
   ========================================================= */
const RIBBON = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ic = (n, lg) => `<i class="ic${lg ? ' lg' : ''}" data-icon="${n}"></i>`;
  const a = it => [
    it.cmd ? `data-cmd="${it.cmd}"` : '', it.arg !== undefined ? `data-arg="${it.arg}"` : '', it.dd && !it.split ? `data-dropdown="${it.dd}"` : '',
    it.id ? `id="${it.id}"` : '', `data-tip="${(it.tip || it.label || '').replace(/"/g, '&quot;')}"`, it.kt ? `data-kt="${it.kt}"` : '', it.ctx ? `data-needs="${it.ctx}"` : '',
  ].filter(Boolean).join(' ');

  function item(it) {
    switch (it.t) {
      case 'lg':
        if (it.split) return `<span class="split-lg"><button class="btn-lg split-top" ${a({ ...it, dd: null })}>${ic(it.icon, true)}</button><button class="btn-lg split-bottom has-arrow" data-dropdown="${it.dd}" data-tip="${it.label}"><span>${it.label}</span></button></span>`;
        return `<button class="btn-lg${it.dd ? ' has-arrow' : ''}" ${a(it)}>${ic(it.icon, true)}<span>${it.label}</span></button>`;
      case 'sm':
        if (it.split) return `<span class="split"><button class="split-main btn-sm" ${a({ ...it, dd: null })}>${ic(it.icon)}<span>${it.label}</span></button><button class="split-arrow" data-dropdown="${it.dd}" data-tip="${it.label}"></button></span>`;
        return `<button class="btn-sm${it.dd ? ' has-arrow' : ''}" ${a(it)}>${it.icon ? ic(it.icon) : ''}<span>${it.label}</span></button>`;
      case 'ic':
        return `<button class="btn-ic${it.dd ? ' has-arrow' : ''}${it.txt ? ' txt' : ''}" ${a(it)}>${it.html || ic(it.icon)}</button>`;
      case 'split':
        return `<span class="split"><button class="split-main btn-ic${it.bar ? ' color-btn' : ''}" ${a({ ...it, dd: null })}>${ic(it.icon)}${it.bar ? `<span class="color-bar" id="${it.bar}" style="background:${it.color}"></span>` : ''}</button><button class="split-arrow" data-dropdown="${it.dd}" data-tip="${it.label}"></button></span>`;
      case 'combo':
        return `<div class="combo" style="width:${it.w}px"><input id="${it.id}" value="${it.value || ''}" spellcheck="false" data-tip="${it.label}"><button class="combo-arrow" data-dropdown="${it.dd}" data-tip="${it.label}"></button></div>`;
      case 'sep': return '<span class="vsep"></span>';
      case 'col': return `<div class="col">${it.items.map(item).join('')}</div>`;
      case 'rows': return `<div class="rows${it.cls ? ' ' + it.cls : ''}">${it.rows.map(r => `<div class="row">${r.map(item).join('')}</div>`).join('')}</div>`;
      case 'check': return `<label class="rb-check"><input type="checkbox" id="${it.id}"${it.checked ? ' checked' : ''}${it.cmd ? ` data-change="${it.cmd}"` : ''}> ${it.label}</label>`;
      case 'spin': return `<label class="spin">${it.icon ? ic(it.icon) : ''}${it.label}<input type="number" step="${it.step || 0.1}" ${it.min !== undefined ? `min="${it.min}"` : ''} id="${it.id}">${it.unit || ''}</label>`;
      case 'select': return `<label class="rb-select">${it.label ? it.label + ' ' : ''}<select id="${it.id}">${it.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>`;
      case 'gallery': return `<div class="gallery${it.cls ? ' ' + it.cls : ''}" id="${it.id}" style="width:${it.w}px"></div><div class="gallery-scroll"><button data-cmd="galleryUp" data-arg="${it.id}" data-tip="Linha anterior">▴</button><button data-cmd="galleryDown" data-arg="${it.id}" data-tip="Linha seguinte">▾</button><button data-dropdown="${it.more}" data-tip="Mais">▾</button></div>`;
      case 'html': return it.html;
      case 'grid9': return `<div class="grid9">${['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'].map(p => `<button class="btn-ic g9" data-cmd="cellAlign" data-arg="${p}" data-tip="Alinhar ${{ t: 'em Cima', m: 'ao Centro', b: 'em Baixo' }[p[0]]} ${{ l: 'à Esquerda', c: 'ao Centro', r: 'à Direita' }[p[1]]}"><i class="al al-${p}"></i></button>`).join('')}</div>`;
      default: return '';
    }
  }

  const group = g => `<div class="group"${g.needs ? ` data-needs="${g.needs}"` : ''}><div class="group-body">${g.items.map(item).join('')}</div><div class="group-label">${g.label}${g.launcher ? `<button class="launcher" data-cmd="${g.launcher}" data-tip="${g.launcherTip || 'Mostrar a caixa de diálogo ' + g.label}"></button>` : ''}</div></div>`;

  /* ------------------------------------------------------------------ */
  const TABS = [
    { id: 'base', label: 'Base', kt: 'B', groups: [
      { label: 'Área de Transferência', launcher: 'clipboardPane', launcherTip: 'Área de Transferência do Nexora', items: [
        { t: 'lg', cmd: 'paste', dd: 'dd-paste', split: true, icon: 'paste', label: 'Colar', tip: 'Colar (Ctrl+V)', kt: 'V' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'cut', icon: 'cut', label: 'Cortar', tip: 'Cortar (Ctrl+X)', kt: 'X' },
          { t: 'sm', cmd: 'copy', icon: 'copy', label: 'Copiar', tip: 'Copiar (Ctrl+C)', kt: 'C' },
          { t: 'sm', cmd: 'painter', id: 'btn-painter', icon: 'painter', label: 'Pincel de Formatação', tip: 'Pincel de Formatação (Ctrl+Shift+C)', kt: 'FP' },
        ] },
      ] },
      { label: 'Tipo de Letra', launcher: 'fontDialog', items: [
        { t: 'rows', rows: [
          [{ t: 'combo', id: 'font-name', w: 138, value: 'Calibri', dd: 'dd-fonts', label: 'Tipo de Letra' }, { t: 'combo', id: 'font-size', w: 44, value: '11', dd: 'dd-sizes', label: 'Tamanho do Tipo de Letra' },
            { t: 'ic', cmd: 'grow', icon: 'grow', tip: 'Aumentar Tipo de Letra (Ctrl+>)', kt: 'FG' }, { t: 'ic', cmd: 'shrink', icon: 'shrink', tip: 'Diminuir Tipo de Letra (Ctrl+<)', kt: 'FK' }, { t: 'sep' },
            { t: 'ic', cmd: 'clearFormat', icon: 'clear', tip: 'Limpar Formatação', kt: 'E' }],
          [{ t: 'ic', cmd: 'bold', txt: true, html: '<b>N</b>', tip: 'Negrito (Ctrl+B)', kt: '1' }, { t: 'ic', cmd: 'italic', txt: true, html: '<i style="font-family:\'Times New Roman\';font-size:14px;font-weight:bold">I</i>', tip: 'Itálico (Ctrl+I)', kt: '2' },
            { t: 'ic', cmd: 'underline', txt: true, html: '<u style="font-weight:bold">S</u>', tip: 'Sublinhado (Ctrl+U)', kt: '3' }, { t: 'ic', cmd: 'strikeThrough', icon: 'strike', tip: 'Rasurado', kt: '4' },
            { t: 'ic', cmd: 'subscript', icon: 'sub', tip: 'Inferior à Linha (Ctrl+=)', kt: '5' }, { t: 'ic', cmd: 'superscript', icon: 'sup', tip: 'Superior à Linha (Ctrl+Shift++)', kt: '6' },
            { t: 'ic', dd: 'dd-case', icon: 'case', tip: 'Maiúsculas/Minúsculas', kt: '7' }, { t: 'sep' },
            { t: 'split', cmd: 'highlight', dd: 'dd-highlight', icon: 'highlight', bar: 'bar-highlight', color: '#ffff00', label: 'Cor de Realce do Texto', kt: 'I' },
            { t: 'split', cmd: 'foreColorLast', dd: 'dd-forecolor', icon: 'fontcolor', bar: 'bar-fore', color: '#ff0000', label: 'Cor do Tipo de Letra', kt: 'FC' }],
        ] },
      ] },
      { label: 'Parágrafo', launcher: 'paragraphDialog', items: [
        { t: 'rows', rows: [
          [{ t: 'split', cmd: 'insertUnorderedList', dd: 'dd-bullets', icon: 'bullets', label: 'Marcas', kt: 'U' }, { t: 'split', cmd: 'insertOrderedList', dd: 'dd-numbering', icon: 'numbering', label: 'Numeração', kt: 'N' },
            { t: 'ic', dd: 'dd-multilevel', icon: 'multilevel', tip: 'Lista com Vários Níveis', kt: 'M' }, { t: 'sep' },
            { t: 'ic', cmd: 'outdent', icon: 'outdent', tip: 'Diminuir Avanço', kt: 'AO' }, { t: 'ic', cmd: 'indent', icon: 'indent', tip: 'Aumentar Avanço', kt: 'AI' }, { t: 'sep' },
            { t: 'ic', cmd: 'sort', icon: 'sort', tip: 'Ordenar', kt: 'SO' }, { t: 'sep' }, { t: 'ic', cmd: 'showMarks', id: 'btn-marks', icon: 'pilcrow', tip: 'Mostrar Tudo (Ctrl+*)', kt: '8' }],
          [{ t: 'ic', cmd: 'justifyLeft', icon: 'alignLeft', tip: 'Alinhar Texto à Esquerda (Ctrl+L)', kt: 'AL' }, { t: 'ic', cmd: 'justifyCenter', icon: 'alignCenter', tip: 'Centrar (Ctrl+E)', kt: 'AC' },
            { t: 'ic', cmd: 'justifyRight', icon: 'alignRight', tip: 'Alinhar Texto à Direita (Ctrl+R)', kt: 'AR' }, { t: 'ic', cmd: 'justifyFull', icon: 'alignJustify', tip: 'Justificar (Ctrl+J)', kt: 'AJ' }, { t: 'sep' },
            { t: 'ic', dd: 'dd-linespacing', icon: 'linespacing', tip: 'Espaçamento Entre Linhas', kt: 'K' }, { t: 'sep' },
            { t: 'split', cmd: 'shadingLast', dd: 'dd-shading', icon: 'shading', bar: 'bar-shading', color: '#ffff00', label: 'Sombreado', kt: 'H' },
            { t: 'split', cmd: 'border', arg: 'bottom', dd: 'dd-borders', icon: 'borders', label: 'Limite Inferior', kt: 'B' }],
        ] },
      ] },
      { label: 'Estilos', launcher: 'stylesPane', launcherTip: 'Estilos (Alt+Ctrl+Shift+S)', items: [
        { t: 'gallery', id: 'style-gallery', w: 362, more: 'dd-styles' },
        { t: 'lg', dd: 'dd-changestyles', icon: 'changestyles', label: 'Alterar Estilos', kt: 'G' },
      ] },
      { label: 'Edição', items: [{ t: 'col', items: [
        { t: 'sm', cmd: 'find', dd: 'dd-find', split: true, icon: 'find', label: 'Localizar', tip: 'Localizar (Ctrl+F)', kt: 'FD' },
        { t: 'sm', cmd: 'replace', icon: 'replace', label: 'Substituir', tip: 'Substituir (Ctrl+H)', kt: 'R' },
        { t: 'sm', dd: 'dd-select', icon: 'select', label: 'Seleccionar', kt: 'SL' },
      ] }] },
    ] },

    { id: 'inserir', label: 'Inserir', kt: 'I', groups: [
      { label: 'Páginas', items: [{ t: 'col', items: [
        { t: 'sm', dd: 'dd-cover', icon: 'cover', label: 'Folha de Rosto', kt: 'V' },
        { t: 'sm', cmd: 'blankPage', icon: 'new', label: 'Página em Branco', kt: 'NP' },
        { t: 'sm', cmd: 'pageBreak', icon: 'pagebreak', label: 'Quebra de Página', tip: 'Quebra de Página (Ctrl+Enter)', kt: 'B' },
      ] }] },
      { label: 'Tabelas', items: [{ t: 'lg', dd: 'dd-table', icon: 'table', label: 'Tabela', kt: 'T' }] },
      { label: 'Ilustrações', items: [
        { t: 'lg', cmd: 'image', icon: 'image', label: 'Imagem', kt: 'P' }, { t: 'lg', cmd: 'clipart', icon: 'clipart', label: 'ClipArt', kt: 'F' },
        { t: 'lg', dd: 'dd-shapes', icon: 'shapes', label: 'Formas', kt: 'SH' }, { t: 'lg', cmd: 'smartart', icon: 'smartart', label: 'SmartArt', kt: 'M' }, { t: 'lg', cmd: 'chart', icon: 'chart', label: 'Gráfico', kt: 'C' },
      ] },
      { label: 'Ligações', items: [{ t: 'col', items: [
        { t: 'sm', cmd: 'link', icon: 'link', label: 'Hiperligação', tip: 'Hiperligação (Ctrl+K)', kt: 'I' },
        { t: 'sm', cmd: 'bookmark', icon: 'bookmark', label: 'Marcador', kt: 'K' },
        { t: 'sm', cmd: 'crossRef', icon: 'crossref', label: 'Referência Cruzada', kt: 'RF' },
      ] }] },
      { label: 'Cabeçalho e Rodapé', items: [
        { t: 'lg', dd: 'dd-header', icon: 'header', label: 'Cabeçalho', kt: 'H' }, { t: 'lg', dd: 'dd-footer', icon: 'footer', label: 'Rodapé', kt: 'O' },
        { t: 'lg', dd: 'dd-pagenum', icon: 'pagenumber', label: 'Número de Página', kt: 'NU' },
      ] },
      { label: 'Texto', items: [
        { t: 'lg', cmd: 'textbox', icon: 'textbox', label: 'Caixa de Texto', kt: 'X' },
        { t: 'lg', dd: 'dd-quickparts', icon: 'quickparts', label: 'Peças Rápidas', kt: 'Q' },
        { t: 'lg', dd: 'dd-wordart', icon: 'wordart', label: 'WordArt', kt: 'W' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'dropCap', icon: 'dropcap', label: 'Capitular', kt: 'RC' },
          { t: 'sm', dd: 'dd-date', icon: 'date', label: 'Data e Hora', kt: 'D' },
          { t: 'sm', dd: 'dd-object', icon: 'object', label: 'Objecto', kt: 'J' },
        ] },
      ] },
      { label: 'Símbolos', items: [
        { t: 'lg', dd: 'dd-equation', icon: 'equation', label: 'Equação', kt: 'E' }, { t: 'lg', dd: 'dd-symbols', icon: 'symbol', label: 'Símbolo', kt: 'U' },
      ] },
    ] },

    { id: 'esquema', label: 'Esquema de Página', kt: 'P', groups: [
      { label: 'Temas', items: [
        { t: 'lg', dd: 'dd-themes', icon: 'themes', label: 'Temas', kt: 'TH' },
        { t: 'col', items: [
          { t: 'sm', dd: 'dd-themecolors', icon: 'themecolors', label: 'Cores', tip: 'Cores do Tema', kt: 'TC' },
          { t: 'sm', dd: 'dd-themefonts', icon: 'themefonts', label: 'Tipos de Letra', tip: 'Tipos de Letra do Tema', kt: 'TF' },
        ] },
      ] },
      { label: 'Configurar Página', launcher: 'pageSetup', items: [
        { t: 'lg', dd: 'dd-margins', icon: 'margins', label: 'Margens', kt: 'M' }, { t: 'lg', dd: 'dd-orientation', icon: 'orientation', label: 'Orientação', kt: 'O' },
        { t: 'lg', dd: 'dd-size', icon: 'size', label: 'Tamanho', kt: 'SZ' }, { t: 'lg', dd: 'dd-columns', icon: 'columns', label: 'Colunas', kt: 'J' },
        { t: 'col', items: [
          { t: 'sm', dd: 'dd-breaks', icon: 'pagebreak', label: 'Quebras', kt: 'B' },
          { t: 'sm', dd: 'dd-linenums', icon: 'linenumbers', label: 'Números de Linha', kt: 'LN' },
          { t: 'sm', dd: 'dd-hyphen', icon: 'hyphenation', label: 'Hifenização', kt: 'H' },
        ] },
      ] },
      { label: 'Fundo de Página', items: [
        { t: 'lg', dd: 'dd-watermark', icon: 'watermark', label: "Marca d'Água", kt: 'PW' }, { t: 'lg', dd: 'dd-pagecolor', icon: 'pagecolor', label: 'Cor da Página', kt: 'PC' },
        { t: 'lg', cmd: 'bordersDialog', arg: 'page', id: 'btn-pageborder', icon: 'pageborder', label: 'Limites da Página', kt: 'PB' },
      ] },
      { label: 'Parágrafo', launcher: 'paragraphDialog', items: [{ t: 'rows', rows: [
        [{ t: 'html', html: '<span class="field-hdr">Avanço</span><span class="field-hdr">Espaçamento</span>' }],
        [{ t: 'spin', id: 'ind-left', icon: 'indent', label: 'Esquerda:', unit: 'cm' }, { t: 'spin', id: 'sp-before', icon: 'spaceBefore', label: 'Antes:', unit: 'pt', step: 6, min: 0 }],
        [{ t: 'spin', id: 'ind-right', icon: 'outdent', label: 'Direita:', unit: 'cm' }, { t: 'spin', id: 'sp-after', icon: 'spaceAfter', label: 'Depois:', unit: 'pt', step: 6, min: 0 }],
      ], cls: 'para-fields' }] },
      { label: 'Dispor', items: [
        { t: 'lg', dd: 'dd-position', icon: 'position', label: 'Posição', ctx: 'img', kt: 'PO' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'zOrder', arg: 'front', icon: 'bringfront', label: 'Trazer para a Frente', ctx: 'img', kt: 'AF' },
          { t: 'sm', cmd: 'zOrder', arg: 'back', icon: 'sendback', label: 'Enviar para Trás', ctx: 'img', kt: 'AE' },
          { t: 'sm', dd: 'dd-wrap', icon: 'wrap', label: 'Moldar Texto', ctx: 'img', kt: 'TW' },
        ] },
        { t: 'col', items: [
          { t: 'sm', dd: 'dd-align-obj', icon: 'alignobj', label: 'Alinhar', ctx: 'img', kt: 'AA' },
          { t: 'sm', dd: 'dd-rotate', icon: 'rotate', label: 'Rodar', ctx: 'img', kt: 'AY' },
        ] },
      ] },
    ] },

    { id: 'referencias', label: 'Referências', kt: 'S', groups: [
      { label: 'Índice', items: [
        { t: 'lg', dd: 'dd-toc', icon: 'toc', label: 'Índice', kt: 'T' },
        { t: 'col', items: [
          { t: 'sm', dd: 'dd-addtext', icon: 'tocadd', label: 'Adicionar Texto', kt: 'A' },
          { t: 'sm', cmd: 'tocUpdate', icon: 'refresh', label: 'Actualizar Índice', kt: 'U' },
        ] },
      ] },
      { label: 'Notas de Rodapé', launcher: 'notesDialog', items: [
        { t: 'lg', cmd: 'footnote', icon: 'footnote', label: 'Inserir Nota de Rodapé', tip: 'Inserir Nota de Rodapé (Alt+Ctrl+F)', kt: 'F' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'endnote', icon: 'endnote', label: 'Inserir Nota de Fim', tip: 'Inserir Nota de Fim (Alt+Ctrl+D)', kt: 'E' },
          { t: 'sm', cmd: 'nextNote', icon: 'nextnote', label: 'Nota de Rodapé Seguinte', kt: 'O' },
          { t: 'sm', cmd: 'showNotes', icon: 'shownotes', label: 'Mostrar Notas', kt: 'H' },
        ] },
      ] },
      { label: 'Citações e Bibliografia', items: [
        { t: 'lg', dd: 'dd-citation', icon: 'citation', label: 'Inserir Citação', kt: 'C' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'manageSources', icon: 'managesources', label: 'Gerir Fontes', kt: 'M' },
          { t: 'html', html: '<label class="rb-select">Estilo: <select id="cite-style"><option value="APA">APA</option><option value="MLA">MLA</option><option value="ISO">ISO 690</option><option value="Chicago">Chicago</option></select></label>' },
          { t: 'sm', dd: 'dd-biblio', icon: 'bibliography', label: 'Bibliografia', kt: 'B' },
        ] },
      ] },
      { label: 'Legendas', items: [
        { t: 'lg', cmd: 'caption', icon: 'caption', label: 'Inserir Legenda', kt: 'P' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'tableOfFigures', icon: 'tableoffigures', label: 'Inserir Índice de Ilustrações', kt: 'G' },
          { t: 'sm', cmd: 'figuresUpdate', icon: 'refresh', label: 'Actualizar Tabela', kt: 'V' },
          { t: 'sm', cmd: 'crossRef', icon: 'crossref', label: 'Referência Cruzada', kt: 'RF' },
        ] },
      ] },
      { label: 'Índice Remissivo', items: [
        { t: 'lg', cmd: 'markEntry', icon: 'markentry', label: 'Marcar Entrada', tip: 'Marcar Entrada (Alt+Shift+X)', kt: 'N' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'insertIndex', icon: 'insertindex', label: 'Inserir Índice Remissivo', kt: 'X' },
          { t: 'sm', cmd: 'indexUpdate', icon: 'refresh', label: 'Actualizar Índice Remissivo', kt: 'D' },
        ] },
      ] },
      { label: 'Índice de Autoridades', items: [
        { t: 'lg', cmd: 'markCitation', icon: 'markcitation', label: 'Marcar Citação', tip: 'Marcar Citação (Alt+Shift+I)', kt: 'I' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'insertAuthorities', icon: 'insertindex', label: 'Inserir Índice de Autoridades', kt: 'S' },
          { t: 'sm', cmd: 'authoritiesUpdate', icon: 'refresh', label: 'Actualizar Tabela', kt: 'UA' },
        ] },
      ] },
    ] },

    { id: 'correspondencia', label: 'Correspondência', kt: 'C', groups: [
      { label: 'Criar', items: [{ t: 'lg', cmd: 'envelopes', icon: 'envelope', label: 'Envelopes', kt: 'E' }, { t: 'lg', cmd: 'labels', icon: 'labels', label: 'Etiquetas', kt: 'L' }] },
      { label: 'Iniciar Impressão em Série', items: [
        { t: 'lg', dd: 'dd-mm-start', icon: 'startmerge', label: 'Iniciar Impressão em Série', kt: 'S' },
        { t: 'lg', dd: 'dd-mm-recipients', icon: 'recipients', label: 'Seleccionar Destinatários', kt: 'R' },
        { t: 'lg', cmd: 'mmEditList', icon: 'editrecipients', label: 'Editar Lista de Destinatários', kt: 'D' },
      ] },
      { label: 'Escrever e Inserir Campos', items: [
        { t: 'col', items: [
          { t: 'sm', cmd: 'mmHighlight', id: 'btn-mm-highlight', icon: 'highlightfields', label: 'Realçar Campos de Impressão em Série', kt: 'H' },
          { t: 'sm', cmd: 'mmAddressBlock', icon: 'addressblock', label: 'Bloco de Endereço', kt: 'A' },
          { t: 'sm', cmd: 'mmGreeting', icon: 'greeting', label: 'Linha de Saudação', kt: 'G' },
        ] },
        { t: 'lg', dd: 'dd-mm-fields', icon: 'insertfield', label: 'Inserir Campo de Impressão em Série', kt: 'I' },
      ] },
      { label: 'Pré-visualizar Resultados', items: [
        { t: 'lg', cmd: 'mmPreview', id: 'btn-mm-preview', icon: 'preview', label: 'Pré-visualizar Resultados', kt: 'P' },
        { t: 'rows', rows: [
          [{ t: 'ic', cmd: 'mmNav', arg: 'first', icon: 'first', tip: 'Primeiro Registo' }, { t: 'ic', cmd: 'mmNav', arg: 'prev', icon: 'prev', tip: 'Registo Anterior' },
            { t: 'html', html: '<input id="mm-record" class="mm-record" value="1" data-tip="Ir para Registo">' }, { t: 'ic', cmd: 'mmNav', arg: 'next', icon: 'next', tip: 'Registo Seguinte' }, { t: 'ic', cmd: 'mmNav', arg: 'last', icon: 'last', tip: 'Último Registo' }],
          [{ t: 'sm', cmd: 'mmFind', icon: 'find', label: 'Localizar Destinatário' }],
        ] },
      ] },
      { label: 'Concluir', items: [{ t: 'lg', dd: 'dd-mm-finish', icon: 'finish', label: 'Concluir e Unir', kt: 'F' }] },
    ] },

    { id: 'rever', label: 'Rever', kt: 'R', groups: [
      { label: 'Revisão', items: [
        { t: 'lg', cmd: 'spellDialog', id: 'btn-spell', icon: 'spell', label: 'Ortografia e Gramática', tip: 'Ortografia e Gramática (F7)', kt: 'S' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'research', icon: 'research', label: 'Pesquisar', tip: 'Pesquisar (Alt+Clique)', kt: 'R' },
          { t: 'sm', cmd: 'thesaurus', icon: 'thesaurus', label: 'Dicionário de Sinónimos', tip: 'Dicionário de Sinónimos (Shift+F7)', kt: 'E' },
          { t: 'sm', cmd: 'translate', icon: 'translate', label: 'Traduzir', kt: 'L' },
        ] },
        { t: 'col', items: [
          { t: 'sm', cmd: 'language', icon: 'language', label: 'Definir Idioma', kt: 'U' },
          { t: 'sm', cmd: 'wordCount', icon: 'wordcount', label: 'Contar Palavras', kt: 'W' },
        ] },
      ] },
      { label: 'Comentários', items: [
        { t: 'lg', cmd: 'comment', icon: 'comment', label: 'Novo Comentário', kt: 'C' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'deleteComment', dd: 'dd-delcomment', split: true, icon: 'deletecomment', label: 'Eliminar', kt: 'D' },
          { t: 'sm', cmd: 'commentNav', arg: 'prev', icon: 'prevcomment', label: 'Anterior', kt: 'V' },
          { t: 'sm', cmd: 'commentNav', arg: 'next', icon: 'nextcomment', label: 'Seguinte', kt: 'N' },
        ] },
      ] },
      { label: 'Controlo', launcher: 'trackOptions', items: [
        { t: 'lg', cmd: 'trackChanges', id: 'btn-track', dd: 'dd-track', split: true, icon: 'trackchanges', label: 'Controlar Alterações', tip: 'Controlar Alterações (Ctrl+Shift+E)', kt: 'G' },
        { t: 'lg', dd: 'dd-balloons', icon: 'balloons', label: 'Balões', kt: 'TB' },
        { t: 'col', items: [
          { t: 'html', html: '<select id="review-view" class="rb-wide" data-tip="Visualizar para Revisão"><option value="final-markup">Marcação Final Mostrada</option><option value="final">Final</option><option value="original-markup">Marcação Original Mostrada</option><option value="original">Original</option></select>' },
          { t: 'sm', dd: 'dd-showmarkup', icon: 'showmarkup', label: 'Mostrar Marcas', kt: 'TM' },
          { t: 'sm', cmd: 'reviewPane', icon: 'reviewpane', label: 'Painel de Revisão', kt: 'TP' },
        ] },
      ] },
      { label: 'Alterações', items: [
        { t: 'lg', cmd: 'acceptChange', dd: 'dd-accept', split: true, icon: 'accept', label: 'Aceitar', kt: 'A' },
        { t: 'lg', cmd: 'rejectChange', dd: 'dd-reject', split: true, icon: 'reject', label: 'Rejeitar', kt: 'J' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'changeNav', arg: 'prev', icon: 'prevchange', label: 'Anterior', kt: 'F' },
          { t: 'sm', cmd: 'changeNav', arg: 'next', icon: 'nextchange', label: 'Seguinte', kt: 'H' },
        ] },
      ] },
      { label: 'Comparar', items: [
        { t: 'lg', dd: 'dd-compare', icon: 'compare', label: 'Comparar', kt: 'M' },
      ] },
      { label: 'Proteger', items: [
        { t: 'lg', cmd: 'protect', id: 'btn-protect', icon: 'protect', label: 'Proteger Documento', kt: 'PE' },
      ] },
      { label: 'Nexora IA', items: [
        { t: 'lg', cmd: 'aiPane', icon: 'ai', label: 'Assistente IA', tip: 'Abrir o assistente de escrita Nexora IA', kt: 'IA' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'aiRewrite', dd: 'dd-ai-tone', split: true, icon: 'refresh', label: 'Reescrever', tip: 'Reescrever a selecção com IA (▾ escolher tom)' },
          { t: 'sm', cmd: 'aiFix', icon: 'spell', label: 'Corrigir com IA', tip: 'Corrigir ortografia e gramática com IA' },
          { t: 'sm', cmd: 'aiDictate', icon: 'mic', id: 'btn-aidictate', label: 'Ditar', tip: 'Ditado por voz — transcrição Whisper' },
        ] },
        { t: 'col', items: [
          { t: 'sm', cmd: 'aiCopilot', icon: 'copilot', id: 'btn-aicopilot', label: 'Copiloto', tip: 'Sugestões automáticas enquanto escreves (Tab aceita)' },
          { t: 'sm', cmd: 'aiTranslate', icon: 'translate', label: 'Traduzir', tip: 'Traduzir a selecção com IA' },
          { t: 'sm', dd: 'dd-ai-more', icon: 'ai', label: 'Mais IA', tip: 'Gerar documento, tabela, SmartArt, análise e mais' },
        ] },
      ] },
    ] },

    { id: 'ver', label: 'Ver', kt: 'V', groups: [
      { label: 'Modos de Visualização de Documento', items: [
        { t: 'lg', cmd: 'viewPrint', cls: 'view-btn', icon: 'printlayout', label: 'Esquema de Impressão', kt: 'P' },
        { t: 'lg', cmd: 'viewReading', icon: 'reading', label: 'Leitura em Ecrã Inteiro', kt: 'F' },
        { t: 'lg', cmd: 'viewWeb', icon: 'weblayout', label: 'Esquema Web', kt: 'L' },
        { t: 'lg', cmd: 'viewOutline', icon: 'outline', label: 'Destaque', kt: 'U' },
        { t: 'lg', cmd: 'viewDraft', icon: 'draft', label: 'Rascunho', kt: 'E' },
        { t: 'lg', cmd: 'focusMode', icon: 'focus', label: 'Modo Foco', tip: 'Oculta o friso e as réguas — só a folha (Esc para sair)' },
      ] },
      { label: 'Mostrar/Ocultar', items: [
        { t: 'col', items: [{ t: 'check', id: 'chk-ruler', label: 'Régua', checked: true }, { t: 'check', id: 'chk-grid', label: 'Linhas de Grelha' }, { t: 'check', id: 'chk-msgbar', label: 'Barra de Mensagens', checked: true }] },
        { t: 'col', items: [{ t: 'check', id: 'chk-docmap', label: 'Mapa do Documento' }, { t: 'check', id: 'chk-thumbs', label: 'Miniaturas' }, { t: 'check', id: 'chk-marks', label: 'Marcas de formatação' }] },
      ] },
      { label: 'Zoom', items: [
        { t: 'lg', cmd: 'zoomDialog', icon: 'zoom', label: 'Zoom', kt: 'Q' }, { t: 'lg', cmd: 'zoom100', icon: 'zoom100', label: '100%', kt: 'J' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'zoomPage', icon: 'onepage', label: 'Uma Página', kt: 'G' },
          { t: 'sm', cmd: 'zoomTwo', icon: 'twopages', label: 'Duas Páginas', kt: '2' },
          { t: 'sm', cmd: 'zoomWidth', icon: 'pagewidth', label: 'Largura da Página', kt: 'I' },
        ] },
      ] },
      { label: 'Janela', items: [
        { t: 'lg', cmd: 'newWindow', icon: 'newwindow', label: 'Nova Janela', kt: 'N' },
        { t: 'lg', cmd: 'arrangeAll', icon: 'arrange', label: 'Dispor Todas', kt: 'A' },
        { t: 'lg', cmd: 'splitView', id: 'btn-split', icon: 'split', label: 'Dividir', kt: 'S' },
      ] },
      { label: 'Macros', items: [{ t: 'lg', dd: 'dd-macros', icon: 'macros', label: 'Macros', kt: 'M' }] },
    ] },

    /* ---------- Separadores contextuais ---------- */
    { id: 'tbl-design', label: 'Estrutura', ctxSet: 'table', kt: 'JT', groups: [
      { label: 'Opções de Estilo de Tabela', items: [
        { t: 'col', items: [{ t: 'check', id: 'tso-header', label: 'Linha de Cabeçalho', checked: true }, { t: 'check', id: 'tso-total', label: 'Linha de Totais' }, { t: 'check', id: 'tso-banded', label: 'Linhas em Banda', checked: true }] },
        { t: 'col', items: [{ t: 'check', id: 'tso-first', label: 'Primeira Coluna', checked: true }, { t: 'check', id: 'tso-last', label: 'Última Coluna' }, { t: 'check', id: 'tso-bandcol', label: 'Colunas em Banda' }] },
      ] },
      { label: 'Estilos de Tabela', items: [
        { t: 'gallery', id: 'table-style-gallery', w: 380, more: 'dd-tablestyles', cls: 'tbl-gallery' },
        { t: 'col', items: [
          { t: 'split', cmd: 'cellShadingLast', dd: 'dd-cellshading', icon: 'shading', bar: 'bar-cellshading', color: '#ffff00', label: 'Sombreado' },
          { t: 'sm', dd: 'dd-cellborders', icon: 'borders', label: 'Limites' },
        ] },
      ] },
      { label: 'Desenhar Limites', launcher: 'bordersDialog', items: [
        { t: 'rows', rows: [
          [{ t: 'html', html: '<select id="draw-border-style" class="rb-mini"><option value="solid">———————</option><option value="dashed">- - - - - - -</option><option value="dotted">···············</option><option value="double">═══════</option></select>' }],
          [{ t: 'html', html: '<select id="draw-border-width" class="rb-mini"><option value="0.5">½ pt</option><option value="1">1 pt</option><option value="1.5">1½ pt</option><option value="2.25">2¼ pt</option><option value="3">3 pt</option></select>' }],
          [{ t: 'html', html: '<label class="rb-color">Cor da Caneta <input type="color" id="draw-border-color" value="#000000"></label>' }],
        ] },
        { t: 'lg', cmd: 'drawBorders', id: 'btn-drawborder', icon: 'drawtable', label: 'Desenhar Tabela' },
        { t: 'lg', cmd: 'eraseBorders', id: 'btn-erase', icon: 'eraser', label: 'Borracha' },
      ] },
    ] },
    { id: 'tbl-layout', label: 'Esquema', ctxSet: 'table', kt: 'JL', groups: [
      { label: 'Tabela', items: [{ t: 'col', items: [
        { t: 'sm', dd: 'dd-tblselect', icon: 'select', label: 'Seleccionar' },
        { t: 'sm', cmd: 'tableGridlines', id: 'btn-tblgrid', icon: 'gridlines', label: 'Ver Linhas de Grelha' },
        { t: 'sm', cmd: 'tableProps', icon: 'properties', label: 'Propriedades' },
      ] }] },
      { label: 'Linhas e Colunas', launcher: 'insertCellsDialog', items: [
        { t: 'lg', dd: 'dd-tbldelete', icon: 'deletetable', label: 'Eliminar' },
        { t: 'lg', cmd: 'tableOpSel', arg: 'rowAbove', icon: 'rowabove', label: 'Inserir Acima' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'tableOpSel', arg: 'rowBelow', icon: 'rowbelow', label: 'Inserir Abaixo' },
          { t: 'sm', cmd: 'tableOpSel', arg: 'colLeft', icon: 'colleft', label: 'Inserir à Esquerda' },
          { t: 'sm', cmd: 'tableOpSel', arg: 'colRight', icon: 'colright', label: 'Inserir à Direita' },
        ] },
      ] },
      { label: 'Unir', items: [{ t: 'col', items: [
        { t: 'sm', cmd: 'mergeCells', icon: 'merge', label: 'Unir Células' },
        { t: 'sm', cmd: 'splitCells', icon: 'splitcells', label: 'Dividir Células' },
        { t: 'sm', cmd: 'splitTable', icon: 'splittable', label: 'Dividir Tabela' },
      ] }] },
      { label: 'Tamanho da Célula', launcher: 'tableProps', items: [
        { t: 'lg', dd: 'dd-autofit', icon: 'autofit', label: 'Ajuste Automático' },
        { t: 'rows', rows: [
          [{ t: 'spin', id: 'cell-h', icon: 'rowheight', label: 'Altura:', unit: 'cm', step: 0.1, min: 0 }, { t: 'ic', cmd: 'distribute', arg: 'rows', icon: 'distrows', tip: 'Distribuir Linhas' }],
          [{ t: 'spin', id: 'cell-w', icon: 'colwidth', label: 'Largura:', unit: 'cm', step: 0.1, min: 0 }, { t: 'ic', cmd: 'distribute', arg: 'cols', icon: 'distcols', tip: 'Distribuir Colunas' }],
        ] },
      ] },
      { label: 'Alinhamento', items: [
        { t: 'grid9' },
        { t: 'lg', cmd: 'textDirection', icon: 'textdir', label: 'Direcção do Texto' },
        { t: 'lg', cmd: 'cellMargins', icon: 'cellmargins', label: 'Margens da Célula' },
      ] },
      { label: 'Dados', items: [
        { t: 'lg', cmd: 'tableSort', icon: 'sort', label: 'Ordenar' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'repeatHeader', id: 'btn-repeathdr', icon: 'repeatheader', label: 'Repetir Linhas de Cabeçalho' },
          { t: 'sm', cmd: 'tableToText', icon: 'totext', label: 'Converter em Texto' },
          { t: 'sm', cmd: 'formula', icon: 'formula', label: 'Fórmula' },
        ] },
      ] },
    ] },
    { id: 'img-format', label: 'Formatar', ctxSet: 'img', kt: 'JP', groups: [
      { label: 'Ajustar', items: [{ t: 'col', items: [
        { t: 'sm', dd: 'dd-brightness', icon: 'brightness', label: 'Brilho' },
        { t: 'sm', dd: 'dd-contrast', icon: 'contrast', label: 'Contraste' },
        { t: 'sm', dd: 'dd-recolor', icon: 'recolor', label: 'Voltar a Colorir' },
      ] }, { t: 'col', items: [
        { t: 'sm', cmd: 'compressImages', icon: 'compress', label: 'Comprimir Imagens' },
        { t: 'sm', cmd: 'changeImage', icon: 'image', label: 'Alterar Imagem' },
        { t: 'sm', cmd: 'resetImage', icon: 'resetimg', label: 'Repor Imagem' },
      ] }] },
      { label: 'Estilos de Imagem', items: [
        { t: 'gallery', id: 'pic-style-gallery', w: 300, more: 'dd-picstyles', cls: 'pic-gallery' },
        { t: 'col', items: [
          { t: 'sm', dd: 'dd-picshape', icon: 'shapes', label: 'Forma da Imagem' },
          { t: 'sm', dd: 'dd-picborder', icon: 'picborder', label: 'Limite da Imagem' },
          { t: 'sm', dd: 'dd-piceffects', icon: 'piceffects', label: 'Efeitos de Imagem' },
        ] },
      ] },
      { label: 'Dispor', items: [
        { t: 'lg', dd: 'dd-position', icon: 'position', label: 'Posição' },
        { t: 'col', items: [
          { t: 'sm', cmd: 'zOrder', arg: 'front', icon: 'bringfront', label: 'Trazer para a Frente' },
          { t: 'sm', cmd: 'zOrder', arg: 'back', icon: 'sendback', label: 'Enviar para Trás' },
          { t: 'sm', dd: 'dd-wrap', icon: 'wrap', label: 'Moldar Texto' },
        ] },
        { t: 'col', items: [{ t: 'sm', dd: 'dd-align-obj', icon: 'alignobj', label: 'Alinhar' }, { t: 'sm', dd: 'dd-rotate', icon: 'rotate', label: 'Rodar' }] },
      ] },
      { label: 'Tamanho', launcher: 'imageSize', items: [
        { t: 'lg', cmd: 'crop', icon: 'crop', label: 'Recortar' },
        { t: 'rows', rows: [[{ t: 'spin', id: 'img-h', icon: 'rowheight', label: '', unit: 'cm', step: 0.1, min: 0 }], [{ t: 'spin', id: 'img-w', icon: 'colwidth', label: '', unit: 'cm', step: 0.1, min: 0 }]] },
      ] },
    ] },
    { id: 'hf-design', label: 'Estrutura', ctxSet: 'hf', kt: 'JH', groups: [
      { label: 'Cabeçalho e Rodapé', items: [
        { t: 'lg', dd: 'dd-header', icon: 'header', label: 'Cabeçalho' }, { t: 'lg', dd: 'dd-footer', icon: 'footer', label: 'Rodapé' }, { t: 'lg', dd: 'dd-pagenum', icon: 'pagenumber', label: 'Número de Página' },
      ] },
      { label: 'Inserir', items: [
        { t: 'lg', dd: 'dd-date', icon: 'date', label: 'Data e Hora' }, { t: 'lg', dd: 'dd-quickparts', icon: 'quickparts', label: 'Peças Rápidas' },
        { t: 'lg', cmd: 'image', icon: 'image', label: 'Imagem' }, { t: 'lg', cmd: 'clipart', icon: 'clipart', label: 'ClipArt' },
      ] },
      { label: 'Navegação', items: [
        { t: 'lg', cmd: 'hfGoto', arg: 'header', icon: 'gotoheader', label: 'Ir para Cabeçalho' }, { t: 'lg', cmd: 'hfGoto', arg: 'footer', icon: 'gotofooter', label: 'Ir para Rodapé' },
        { t: 'col', items: [{ t: 'sm', cmd: 'hfNav', arg: 'prev', icon: 'prev', label: 'Secção Anterior' }, { t: 'sm', cmd: 'hfNav', arg: 'next', icon: 'next', label: 'Secção Seguinte' }] },
      ] },
      { label: 'Opções', items: [{ t: 'col', items: [{ t: 'check', id: 'hf-first', label: 'Primeira Página Diferente' }, { t: 'check', id: 'hf-oddeven', label: 'Páginas Pares e Ímpares Diferentes' }, { t: 'check', id: 'hf-showdoc', label: 'Mostrar Texto do Documento', checked: true }] }] },
      { label: 'Posição', items: [{ t: 'rows', rows: [
        [{ t: 'spin', id: 'hf-top', icon: 'gotoheader', label: 'Cabeçalho a partir do Topo:', unit: 'cm', step: 0.1, min: 0 }],
        [{ t: 'spin', id: 'hf-bottom', icon: 'gotofooter', label: 'Rodapé a partir do Fundo:', unit: 'cm', step: 0.1, min: 0 }],
      ] }] },
      { label: 'Fechar', items: [{ t: 'lg', cmd: 'hfClose', icon: 'closehf', label: 'Fechar Cabeçalho e Rodapé' }] },
    ] },
  ];

  const CTX_SETS = { table: 'Ferramentas de Tabela', img: 'Ferramentas de Imagem', hf: 'Ferramentas de Cabeçalho e Rodapé' };

  function build() {
    const tabs = $('#tabs'), ribbon = $('#ribbon');
    let tabsHtml = '', ctxHtml = {};
    TABS.forEach((t, i) => {
      const btn = `<button class="tab${i === 0 ? ' active' : ''}${t.ctxSet ? ' ctx-tab' : ''}" data-tab="${t.id}" data-kt="${t.kt}">${t.label}</button>`;
      if (t.ctxSet) (ctxHtml[t.ctxSet] ??= []).push(btn);
      else tabsHtml += btn;
    });
    for (const [k, title] of Object.entries(CTX_SETS)) tabsHtml += `<span class="ctx-set" data-ctxset="${k}"><span class="ctx-title">${title}</span>${ctxHtml[k].join('')}</span>`;
    tabsHtml += '<span class="tabs-spacer"></span><button class="help-btn" data-cmd="about" data-tip="Ajuda do Nexora Word (F1)">?</button>';
    tabs.innerHTML = tabsHtml;
    ribbon.innerHTML = TABS.map((t, i) => `<div class="panel${i === 0 ? ' active' : ''}" data-panel="${t.id}">${t.groups.map(group).join('')}</div>`).join('');
  }

  /* ------------------------------------------------------------------
     Menus pendentes simples gerados por especificação
     { id, title?, items: [ {cmd,arg,label,icon,desc,check} | '-' | {title} ] }
     ------------------------------------------------------------------ */
  const MENUS = {
    'dd-paste': [{ cmd: 'paste', label: 'Colar', icon: 'paste' }, { cmd: 'pasteSpecial', label: 'Colar Especial...', icon: 'pastespecial' }, { cmd: 'pastePlain', label: 'Colar Texto Não Formatado', icon: 'txt' }, { cmd: 'pasteLink', label: 'Colar como Hiperligação', icon: 'link' }],
    'dd-find': [{ cmd: 'find', label: 'Localizar', icon: 'find' }, { cmd: 'goTo', label: 'Ir Para...', icon: 'goto' }],
    'dd-select': [{ cmd: 'selectAll', label: 'Seleccionar Tudo', icon: 'select' }, { cmd: 'selectSimilar', label: 'Seleccionar Texto com Formatação Semelhante' }],
    'dd-multilevel': [{ title: 'Biblioteca de Listas' }, { cmd: 'multilevel', arg: 'outline', label: '1) a) i)', icon: 'multilevel' }, { cmd: 'multilevel', arg: 'legal', label: '1. 1.1. 1.1.1.', icon: 'multilevel' }, { cmd: 'multilevel', arg: 'bullets', label: '● ○ ■ (marcas)', icon: 'bullets' }, '-', { cmd: 'listLevel', arg: 'down', label: 'Alterar Nível da Lista (descer)', icon: 'indent' }, { cmd: 'listLevel', arg: 'up', label: 'Alterar Nível da Lista (subir)', icon: 'outdent' }, { cmd: 'listStart', label: 'Definir Valor de Numeração...' }],
    'dd-changestyles': [{ title: 'Alterar Estilos' }, { cmd: 'styleSet', arg: 'office', label: 'Conjunto de Estilos: Predefinido' }, { cmd: 'styleSet', arg: 'formal', label: 'Conjunto de Estilos: Formal' }, { cmd: 'styleSet', arg: 'moderno', label: 'Conjunto de Estilos: Moderno' }, { cmd: 'styleSet', arg: 'simples', label: 'Conjunto de Estilos: Simples' }, '-', { dd: 'dd-themecolors', cmd: 'openDD', arg: 'dd-themecolors', label: 'Cores', icon: 'themecolors' }, { cmd: 'openDD', arg: 'dd-themefonts', label: 'Tipos de Letra', icon: 'themefonts' }, '-', { cmd: 'stylesPane', label: 'Painel de Estilos', icon: 'stylespane' }],
    'dd-breaks': [{ title: 'Quebras de Página' }, { cmd: 'pageBreak', label: 'Página', desc: 'Marca o ponto onde uma página termina e a seguinte começa.', icon: 'pagebreak' }, { cmd: 'colBreak', label: 'Coluna', desc: 'Indica que o texto a seguir à quebra começa na coluna seguinte.', icon: 'columns' }, { cmd: 'lineBreak', label: 'Moldagem de Texto', desc: 'Separa o texto em redor de objectos (quebra de linha).', icon: 'hr' }, { title: 'Quebras de Secção' }, { cmd: 'sectionBreak', arg: 'next', label: 'Página Seguinte', desc: 'Insere uma quebra de secção e inicia a nova secção na página seguinte.', icon: 'pagebreak' }, { cmd: 'sectionBreak', arg: 'cont', label: 'Contínua', desc: 'Insere uma quebra de secção e inicia a nova secção na mesma página.', icon: 'hr' }],
    'dd-linenums': [{ cmd: 'lineNumbers', arg: 'none', label: 'Nenhum', check: () => !settings.lineNumbers || settings.lineNumbers === 'none' }, { cmd: 'lineNumbers', arg: 'continuous', label: 'Contínuo', check: () => settings.lineNumbers === 'continuous' }, { cmd: 'lineNumbers', arg: 'page', label: 'Reiniciar Cada Página', check: () => settings.lineNumbers === 'page' }],
    'dd-hyphen': [{ cmd: 'hyphenate', arg: '0', label: 'Nenhuma', check: () => !settings.hyphenate }, { cmd: 'hyphenate', arg: '1', label: 'Automática', check: () => !!settings.hyphenate }],
    'dd-position': [{ title: 'Em Linha com o Texto' }, { cmd: 'imgPosition', arg: 'inline', label: 'Em Linha com o Texto', icon: 'position' }, { title: 'Com Moldagem de Texto Quadrada' }, { cmd: 'imgPosition', arg: 'left', label: 'Posição Superior Esquerda' }, { cmd: 'imgPosition', arg: 'center', label: 'Posição ao Centro' }, { cmd: 'imgPosition', arg: 'right', label: 'Posição Superior Direita' }],
    'dd-wrap': [{ cmd: 'imgWrap', arg: 'inline', label: 'Em Linha com o Texto', icon: 'position' }, { cmd: 'imgWrap', arg: 'left', label: 'Quadrado (à esquerda)', icon: 'wrap' }, { cmd: 'imgWrap', arg: 'right', label: 'Quadrado (à direita)', icon: 'wrap' }, { cmd: 'imgWrap', arg: 'topbottom', label: 'Superior e Inferior', icon: 'wrap' }, { cmd: 'imgWrap', arg: 'behind', label: 'Atrás do Texto', icon: 'sendback' }, { cmd: 'imgWrap', arg: 'front', label: 'À Frente do Texto', icon: 'bringfront' }],
    'dd-align-obj': [{ cmd: 'imgAlign', arg: 'left', label: 'Alinhar à Esquerda', icon: 'alignLeft' }, { cmd: 'imgAlign', arg: 'center', label: 'Alinhar ao Centro', icon: 'alignCenter' }, { cmd: 'imgAlign', arg: 'right', label: 'Alinhar à Direita', icon: 'alignRight' }],
    'dd-rotate': [{ cmd: 'imgRotate', arg: '90', label: 'Rodar 90° para a Direita', icon: 'rotate' }, { cmd: 'imgRotate', arg: '-90', label: 'Rodar 90° para a Esquerda', icon: 'rotate' }, { cmd: 'imgRotate', arg: 'flipV', label: 'Inverter Verticalmente' }, { cmd: 'imgRotate', arg: 'flipH', label: 'Inverter Horizontalmente' }, '-', { cmd: 'imgRotate', arg: '0', label: 'Repor Rotação' }],
    'dd-toc': [{ title: 'Incorporado' }, { cmd: 'toc', arg: '1', label: 'Índice Automático 1', desc: 'Índice com títulos de nível 1 a 3', icon: 'toc' }, { cmd: 'toc', arg: '2', label: 'Índice Automático 2', desc: 'Índice com título "Conteúdo"', icon: 'toc' }, { cmd: 'toc', arg: 'manual', label: 'Índice Manual', desc: 'Entradas editáveis manualmente', icon: 'toc' }, '-', { cmd: 'tocRemove', label: 'Remover Índice', icon: 'close' }],
    'dd-addtext': [{ cmd: 'style', arg: 'normal', label: 'Não Mostrar no Índice' }, { cmd: 'style', arg: 'h1', label: 'Nível 1' }, { cmd: 'style', arg: 'h2', label: 'Nível 2' }, { cmd: 'style', arg: 'h3', label: 'Nível 3' }],
    'dd-biblio': [{ title: 'Incorporado' }, { cmd: 'bibliography', arg: 'Bibliografia', label: 'Bibliografia', icon: 'bibliography' }, { cmd: 'bibliography', arg: 'Obras Citadas', label: 'Obras Citadas', icon: 'bibliography' }, '-', { cmd: 'bibliography', arg: '', label: 'Inserir Bibliografia', icon: 'bibliography' }],
    'dd-header': [{ title: 'Incorporado' }, { cmd: 'hfTemplate', arg: 'header:blank', label: 'Em branco', icon: 'header' }, { cmd: 'hfTemplate', arg: 'header:three', label: 'Em branco (Três Colunas)', icon: 'header' }, { cmd: 'hfTemplate', arg: 'header:title', label: 'Alfabeto (título do documento)', icon: 'header' }, { cmd: 'hfTemplate', arg: 'header:line', label: 'Linhas Simples', icon: 'header' }, '-', { cmd: 'hfEdit', arg: 'header', label: 'Editar Cabeçalho', icon: 'header' }, { cmd: 'hfRemove', arg: 'header', label: 'Remover Cabeçalho', icon: 'close' }],
    'dd-footer': [{ title: 'Incorporado' }, { cmd: 'hfTemplate', arg: 'footer:blank', label: 'Em branco', icon: 'footer' }, { cmd: 'hfTemplate', arg: 'footer:three', label: 'Em branco (Três Colunas)', icon: 'footer' }, { cmd: 'hfTemplate', arg: 'footer:pagexy', label: 'Página X de Y', icon: 'footer' }, { cmd: 'hfTemplate', arg: 'footer:line', label: 'Linhas Simples', icon: 'footer' }, '-', { cmd: 'hfEdit', arg: 'footer', label: 'Editar Rodapé', icon: 'footer' }, { cmd: 'hfRemove', arg: 'footer', label: 'Remover Rodapé', icon: 'close' }],
    'dd-pagenum': [{ title: 'Início da Página' }, { cmd: 'pageNumber', arg: 'header:left', label: 'Número Simples 1 (esquerda)', icon: 'pagenumber' }, { cmd: 'pageNumber', arg: 'header:center', label: 'Número Simples 2 (centro)', icon: 'pagenumber' }, { cmd: 'pageNumber', arg: 'header:right', label: 'Número Simples 3 (direita)', icon: 'pagenumber' }, { title: 'Fim da Página' }, { cmd: 'pageNumber', arg: 'footer:left', label: 'Número Simples 1 (esquerda)', icon: 'pagenumber' }, { cmd: 'pageNumber', arg: 'footer:center', label: 'Número Simples 2 (centro)', icon: 'pagenumber' }, { cmd: 'pageNumber', arg: 'footer:right', label: 'Número Simples 3 (direita)', icon: 'pagenumber' }, { cmd: 'pageNumber', arg: 'footer:xy', label: 'Página X de Y', icon: 'pagenumber' }, { title: 'Posição Actual' }, { cmd: 'pageNumber', arg: 'here', label: 'Número Simples', icon: 'pagenumber' }, '-', { cmd: 'pageNumberFormat', label: 'Formatar Números de Página...' }, { cmd: 'pageNumberRemove', label: 'Remover Números de Página', icon: 'close' }],
    'dd-object': [{ cmd: 'insertFileText', label: 'Texto do Ficheiro...', icon: 'txt' }, { cmd: 'insertObjectImage', label: 'Objecto (imagem/ficheiro)...', icon: 'object' }],
    'dd-cover': [{ title: 'Incorporado' }, { cmd: 'coverPage', arg: 'alfabeto', label: 'Alfabeto', icon: 'cover' }, { cmd: 'coverPage', arg: 'anual', label: 'Anual', icon: 'cover' }, { cmd: 'coverPage', arg: 'cubiculos', label: 'Cubículos', icon: 'cover' }, { cmd: 'coverPage', arg: 'movimento', label: 'Movimento', icon: 'cover' }, '-', { cmd: 'coverRemove', label: 'Remover a Folha de Rosto Actual', icon: 'close' }],
    'dd-mm-start': [{ cmd: 'mmStart', arg: 'letters', label: 'Cartas', icon: 'startmerge' }, { cmd: 'mmStart', arg: 'email', label: 'Mensagens de Correio Electrónico', icon: 'send' }, { cmd: 'mmStart', arg: 'envelopes', label: 'Envelopes...', icon: 'envelope' }, { cmd: 'mmStart', arg: 'labels', label: 'Etiquetas...', icon: 'labels' }, { cmd: 'mmStart', arg: 'directory', label: 'Directório', icon: 'txt' }, { cmd: 'mmStart', arg: 'normal', label: 'Documento Normal do Nexora Word', icon: 'new' }],
    'dd-mm-recipients': [{ cmd: 'mmNewList', label: 'Escrever Nova Lista...' }, { cmd: 'mmLoadCsv', label: 'Utilizar Lista Existente... (CSV)' }],
    'dd-mm-finish': [{ cmd: 'mmFinish', arg: 'edit', label: 'Editar Documentos Individuais...', icon: 'new' }, { cmd: 'mmFinish', arg: 'print', label: 'Imprimir Documentos...', icon: 'print' }, { cmd: 'mmFinish', arg: 'email', label: 'Enviar Mensagens de Correio Electrónico...', icon: 'send' }],
    'dd-track': [{ cmd: 'trackChanges', label: 'Controlar Alterações', icon: 'trackchanges' }, { cmd: 'trackOptions', label: 'Alterar Opções de Controlo...' }, { cmd: 'changeUser', label: 'Alterar Nome de Utilizador...' }],
    'dd-balloons': [{ cmd: 'balloons', arg: 'all', label: 'Mostrar Revisões em Balões', check: () => settings.balloons === 'all' }, { cmd: 'balloons', arg: 'inline', label: 'Mostrar Todas as Revisões Inline', check: () => settings.balloons === 'inline' }, { cmd: 'balloons', arg: 'comments', label: 'Mostrar Apenas Comentários e Formatação em Balões', check: () => !settings.balloons || settings.balloons === 'comments' }],
    'dd-showmarkup': [{ cmd: 'showMarkup', arg: 'comments', label: 'Comentários', check: () => !page.classList.contains('hide-comments') }, { cmd: 'showMarkup', arg: 'insdel', label: 'Inserções e Eliminações', check: () => !page.classList.contains('hide-insdel') }, { cmd: 'showMarkup', arg: 'format', label: 'Formatação', check: () => true }],
    'dd-accept': [{ cmd: 'acceptChange', label: 'Aceitar e Avançar para Seguinte', icon: 'accept' }, { cmd: 'acceptChange', arg: 'one', label: 'Aceitar Alteração', icon: 'accept' }, { cmd: 'acceptAll', label: 'Aceitar Todas as Alterações Mostradas' }, { cmd: 'acceptAll', label: 'Aceitar Todas as Alterações no Documento' }],
    'dd-reject': [{ cmd: 'rejectChange', label: 'Rejeitar e Avançar para Seguinte', icon: 'reject' }, { cmd: 'rejectChange', arg: 'one', label: 'Rejeitar Alteração', icon: 'reject' }, { cmd: 'rejectAll', label: 'Rejeitar Todas as Alterações Mostradas' }, { cmd: 'rejectAll', label: 'Rejeitar Todas as Alterações no Documento' }],
    'dd-delcomment': [{ cmd: 'deleteComment', label: 'Eliminar', icon: 'deletecomment' }, { cmd: 'deleteComments', label: 'Eliminar Todos os Comentários Mostrados' }, { cmd: 'deleteComments', label: 'Eliminar Todos os Comentários no Documento' }],
    'dd-compare': [{ cmd: 'compare', arg: 'compare', label: 'Comparar...', desc: 'Comparar duas versões de um documento (comparação legal).', icon: 'compare' }, { cmd: 'compare', arg: 'combine', label: 'Combinar...', desc: 'Combinar revisões de vários autores num único documento.', icon: 'compare' }],
    'dd-macros': [{ cmd: 'macroList', label: 'Ver Macros', icon: 'macros' }, { cmd: 'macroRecord', label: 'Gravar Macro...', icon: 'record' }, { cmd: 'macroStop', label: 'Parar Gravação', icon: 'stop' }],
    'dd-tblselect': [{ cmd: 'tblSelect', arg: 'cell', label: 'Seleccionar Célula' }, { cmd: 'tblSelect', arg: 'col', label: 'Seleccionar Coluna' }, { cmd: 'tblSelect', arg: 'row', label: 'Seleccionar Linha' }, { cmd: 'tblSelect', arg: 'table', label: 'Seleccionar Tabela' }],
    'dd-tbldelete': [{ cmd: 'tableOpSel', arg: 'delCells', label: 'Eliminar Células...', icon: 'deletetable' }, { cmd: 'tableOpSel', arg: 'delCol', label: 'Eliminar Colunas' }, { cmd: 'tableOpSel', arg: 'delRow', label: 'Eliminar Linhas' }, { cmd: 'tableOpSel', arg: 'delTable', label: 'Eliminar Tabela', icon: 'close' }],
    'dd-autofit': [{ cmd: 'autofit', arg: 'content', label: 'Ajustar Automaticamente ao Conteúdo' }, { cmd: 'autofit', arg: 'window', label: 'Ajustar Automaticamente à Janela' }, { cmd: 'autofit', arg: 'fixed', label: 'Largura de Coluna Fixa' }],
    'dd-cellborders': [{ cmd: 'cellBorder', arg: 'all', label: 'Todos os Limites', icon: 'borders' }, { cmd: 'cellBorder', arg: 'outside', label: 'Limites Exteriores' }, { cmd: 'cellBorder', arg: 'inside', label: 'Limites Interiores' }, { cmd: 'cellBorder', arg: 'top', label: 'Limite Superior' }, { cmd: 'cellBorder', arg: 'bottom', label: 'Limite Inferior' }, { cmd: 'cellBorder', arg: 'left', label: 'Limite Esquerdo' }, { cmd: 'cellBorder', arg: 'right', label: 'Limite Direito' }, '-', { cmd: 'cellBorder', arg: 'none', label: 'Sem Limite' }, { cmd: 'bordersDialog', arg: 'cell', label: 'Limites e Sombreado...' }],
    'dd-brightness': [-40, -30, -20, -10, 0, 10, 20, 30, 40].map(v => ({ cmd: 'imgAdjust', arg: `brightness:${v}`, label: `${v > 0 ? '+' : ''}${v} %${v === 0 ? ' (Normal)' : ''}` })),
    'dd-contrast': [-40, -30, -20, -10, 0, 10, 20, 30, 40].map(v => ({ cmd: 'imgAdjust', arg: `contrast:${v}`, label: `${v > 0 ? '+' : ''}${v} %${v === 0 ? ' (Normal)' : ''}` })),
    'dd-recolor': [{ title: 'Modos de Cor' }, { cmd: 'imgRecolor', arg: 'none', label: 'Sem Recoloração' }, { cmd: 'imgRecolor', arg: 'grayscale', label: 'Escala de Cinzentos' }, { cmd: 'imgRecolor', arg: 'sepia', label: 'Sépia' }, { cmd: 'imgRecolor', arg: 'washout', label: 'Desbotado' }, { cmd: 'imgRecolor', arg: 'bw', label: 'Preto e Branco' }, { title: 'Variações Escuras' }, { cmd: 'imgRecolor', arg: 'blue', label: 'Cor de Destaque 1 Escura' }, { cmd: 'imgRecolor', arg: 'invert', label: 'Negativo' }],
    'dd-picshape': [{ cmd: 'picShape', arg: 'rect', label: 'Rectângulo' }, { cmd: 'picShape', arg: 'round', label: 'Rectângulo Arredondado' }, { cmd: 'picShape', arg: 'ellipse', label: 'Oval' }, { cmd: 'picShape', arg: 'diamond', label: 'Losango' }, { cmd: 'picShape', arg: 'hexagon', label: 'Hexágono' }],
    'dd-piceffects': [{ cmd: 'picEffect', arg: 'none', label: 'Sem Efeitos' }, { cmd: 'picEffect', arg: 'shadow', label: 'Sombra' }, { cmd: 'picEffect', arg: 'reflection', label: 'Reflexo' }, { cmd: 'picEffect', arg: 'glow', label: 'Brilho' }, { cmd: 'picEffect', arg: 'soft', label: 'Margens Suaves' }, { cmd: 'picEffect', arg: '3d', label: 'Rotação 3D' }],
    'dd-ai-tone': [{ title: 'Reescrever com Tom' }, { cmd: 'aiTone', arg: 'formal', label: 'Formal' }, { cmd: 'aiTone', arg: 'informal', label: 'Informal' }, { cmd: 'aiTone', arg: 'concise', label: 'Conciso' }, { cmd: 'aiTone', arg: 'persuasive', label: 'Persuasivo' }, { cmd: 'aiTone', arg: 'simple', label: 'Simples (para leigos)' }],
    'dd-ai-more': [
      { title: 'Escrita' },
      { cmd: 'aiSummarize', label: 'Resumir', icon: 'toc' }, { cmd: 'aiExpand', label: 'Expandir', icon: 'grow' }, { cmd: 'aiShorten', label: 'Encurtar', icon: 'shrink' }, { cmd: 'aiContinue', label: 'Continuar', icon: 'next' }, { cmd: 'aiListContinue', label: 'Continuar Lista', icon: 'numbering' },
      { title: 'Gerar' },
      { cmd: 'aiGenerate', label: 'Documento a partir de Descrição…', icon: 'docgen', desc: 'A IA escreve um documento formatado a partir da tua descrição.' },
      { cmd: 'aiTable', label: 'Tabela a partir de Descrição…', icon: 'table' },
      { cmd: 'aiSmartArt', label: 'SmartArt a partir de Descrição…', icon: 'smartart' },
      { cmd: 'aiMergeLetter', label: 'Carta de Impressão em Série…', icon: 'merge', desc: 'Escreve uma carta com os campos de união dos destinatários.' },
      { title: 'Documento' },
      { cmd: 'aiAnalyze', label: 'Analisar Documento', icon: 'research', desc: 'Detecta inconsistências, contradições e problemas.' },
      { cmd: 'aiDocProps', label: 'Preencher Propriedades', icon: 'properties', desc: 'Título, assunto e palavras-chave gerados a partir do conteúdo.' },
      { cmd: 'aiCaptions', label: 'Legendas Automáticas', icon: 'caption', desc: 'Gera legendas para imagens e tabelas sem legenda.' },
      { cmd: 'aiCommentReply', label: 'Responder a Comentário', icon: 'nextcomment' },
      { title: 'Outros' },
      { cmd: 'aiCommand', label: 'Comando por Texto…', icon: 'wand', desc: 'Formata o documento com instruções em linguagem natural.' },
      { cmd: 'aiReadAloud', label: 'Ler em Voz Alta', icon: 'volume' },
      { cmd: 'aiSetup', label: 'Configurar Nexora IA…', icon: 'aisetup' },
    ],
  };

  function menuHtml(items) {
    return items.map(it => {
      if (it === '-') return '<div class="dd-sep"></div>';
      if (it.title) return `<div class="dd-title">${it.title}</div>`;
      const body = it.desc ? `<span class="dd-two"><b>${it.label}</b><small>${it.desc}</small></span>` : it.label;
      return `<button class="dd-item${it.desc ? ' dd-desc' : ''}" data-cmd="${it.cmd}"${it.arg !== undefined ? ` data-arg="${it.arg}"` : ''} data-label="${it.label.replace(/"/g, '&quot;')}">${it.icon ? ic(it.icon) : ''}${body}</button>`;
    }).join('');
  }

  function buildMenus() {
    const host = $('#dropdowns');
    for (const [id, items] of Object.entries(MENUS)) {
      let dd = $('#' + id);
      if (!dd) { dd = document.createElement('div'); dd.className = 'dropdown'; dd.id = id; host.append(dd); }
      dd.innerHTML = menuHtml(items);
    }
    // contentores vazios preenchidos dinamicamente por outros módulos
    ['dd-styles', 'dd-themes', 'dd-themecolors', 'dd-themefonts', 'dd-wordart', 'dd-equation', 'dd-quickparts', 'dd-citation', 'dd-mm-fields', 'dd-tablestyles', 'dd-picstyles', 'dd-cellshading', 'dd-picborder', 'dd-undo'].forEach(id => {
      if (!$('#' + id)) { const dd = document.createElement('div'); dd.className = 'dropdown'; dd.id = id; host.append(dd); }
    });
  }

  function refreshChecks(id) {
    const items = MENUS[id];
    if (!items) return;
    const btns = $$('.dd-item', $('#' + id));
    let i = 0;
    for (const it of items) {
      if (it === '-' || it.title) continue;
      const b = btns[i++];
      if (b && it.check) b.classList.toggle('checked', !!it.check());
    }
  }

  build();
  buildMenus();
  return { TABS, MENUS, CTX_SETS, refreshChecks, menuHtml };
})();
