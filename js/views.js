'use strict';
/* =========================================================
   Ver: Leitura em Ecrã Inteiro, Destaque, Rascunho, Mapa do
   Documento, Miniaturas, Linhas de Grelha, Dividir janela,
   Duas Páginas, Pré-visualização de Impressão, Enviar/Publicar,
   nível e valor inicial de listas.
   ========================================================= */
const Views = (() => {
  const pane = $('#left-pane'), paneBody = $('#left-pane-body'), paneMode = $('#left-pane-mode');
  let mode = null, thumbsTimer = 0;

  /* ---------- Clones de página (miniaturas, leitura, pré-visualização) ---------- */
  function pageClone(k, scale) {
    const [w, h] = pageDims();
    const frame = document.createElement('div');
    frame.className = 'pg-frame';
    frame.style.width = w * MM * scale + 'px';
    frame.style.height = h * MM * scale + 'px';
    const inner = document.createElement('div');
    inner.style.zoom = scale;
    inner.style.width = w + 'mm';
    const clone = page.cloneNode(true);
    clone.querySelector('#img-box')?.remove();
    clone.querySelector('#balloons')?.remove();
    clone.querySelector('#watermark')?.removeAttribute('id');
    clone.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
    clone.querySelectorAll('.wc-preview').forEach(s => { const p = s.parentNode; while (s.firstChild) p.insertBefore(s.firstChild, s); s.remove(); });
    clone.classList.remove('hf-mode', 'hide-body');
    clone.classList.remove('hf-mode');
    clone.style.position = 'relative';
    clone.style.top = -k * Pager.S + 'px';
    clone.style.minHeight = '';
    clone.style.height = Pager.S + 'px';
    inner.append(clone);
    frame.append(inner);
    return frame;
  }

  /* ---------- Painel esquerdo: Mapa do Documento / Miniaturas ---------- */
  const HEAD_SEL = 'h1, h2, h3, h4, .doc-title';
  function openLeftPane(m) {
    mode = m;
    paneMode.value = m;
    pane.classList.remove('hidden');
    $('#chk-docmap').checked = m === 'map';
    $('#chk-thumbs').checked = m === 'thumbs';
    refresh();
    scheduleRulers();
  }
  function closeLeftPane() {
    mode = null;
    pane.classList.add('hidden');
    $('#chk-docmap').checked = $('#chk-thumbs').checked = false;
    scheduleRulers();
  }
  function renderMap() {
    const heads = $$(HEAD_SEL, editor).filter(h => !h.closest('.toc') && h.textContent.trim());
    paneBody.innerHTML = heads.length
      ? heads.map((h, i) => {
        const lvl = h.matches('h1') ? 1 : h.matches('h2') ? 2 : h.matches('h3') ? 3 : h.matches('h4') ? 4 : 1;
        return `<button class="dm-item dm-${lvl}" data-i="${i}">${esc(h.textContent.trim())}</button>`;
      }).join('')
      : '<div class="om-empty" style="padding:12px">Crie um destaque do documento.<br><br>Atribua estilos de título ao texto do documento e este aparecerá aqui.</div>';
    $$('.dm-item', paneBody).forEach(b => b.addEventListener('click', () => {
      const h = heads[+b.dataset.i];
      if (!h) return;
      placeCaret(h, true);
      h.scrollIntoView({ block: 'start' });
      markCurrent();
    }));
    markCurrent();
  }
  function markCurrent() {
    if (mode !== 'map') return;
    const heads = $$(HEAD_SEL, editor).filter(h => !h.closest('.toc') && h.textContent.trim());
    const y = scroller.scrollTop + 60;
    let cur = -1;
    heads.forEach((h, i) => { if (h.getBoundingClientRect().top + scroller.scrollTop - scroller.getBoundingClientRect().top <= y) cur = i; });
    $$('.dm-item', paneBody).forEach((b, i) => b.classList.toggle('active', i === cur));
  }
  function renderThumbs() {
    const scale = Math.min(0.24, 150 / (pageDims()[0] * MM));
    paneBody.innerHTML = '';
    for (let k = 0; k < Pager.count; k++) {
      const t = document.createElement('div');
      t.className = 'thumb';
      t.append(pageClone(k, scale));
      const n = document.createElement('span');
      n.className = 'thumb-n';
      n.textContent = Pager.fieldValue('PAGE', k);
      t.append(n);
      t.addEventListener('click', () => Pager.scrollToPage(k + 1));
      paneBody.append(t);
    }
  }
  function refresh() {
    if (!mode) return;
    if (mode === 'map') renderMap();
    else renderThumbs();
  }
  function scheduleThumbs() {
    if (mode !== 'thumbs') return;
    clearTimeout(thumbsTimer);
    thumbsTimer = setTimeout(renderThumbs, 400);
  }
  paneMode.addEventListener('change', () => openLeftPane(paneMode.value));
  scroller.addEventListener('scroll', () => markCurrent());

  /* ---------- Leitura em Ecrã Inteiro / Pré-visualização ---------- */
  function overlayShell(cls, topHtml) {
    const ov = document.createElement('div');
    ov.className = 'doc-overlay ' + cls;
    ov.innerHTML = `<div class="ov-top">${topHtml}</div><div class="ov-body"></div><div class="ov-foot"><button class="std ov-prev" data-tip="Página anterior">◀</button><span class="ov-pos"></span><button class="std ov-next" data-tip="Página seguinte">▶</button></div>`;
    document.body.append(ov);
    return ov;
  }
  function pagedViewer(kind) {
    let idx = Math.max(0, Pager.currentIndex()), two = kind === 'reading', scale = kind === 'reading' ? 0 : 0.5;
    const title = kind === 'reading' ? 'Leitura em Ecrã Inteiro' : 'Pré-visualizar Impressão';
    const ov = overlayShell(kind, `<span class="ov-title">${esc(docName)} - ${title}</span>
      ${kind === 'reading' ? '<button class="std" data-a="print">Imprimir</button><button class="std" data-a="save">Guardar</button>' : '<button class="std" data-a="print">Imprimir...</button><button class="std" data-a="zin">+</button><button class="std" data-a="zout">−</button>'}
      <span class="ov-sp"></span>
      <button class="std" data-a="one">Uma Página</button><button class="std" data-a="two">Duas Páginas</button>
      ${kind === 'reading' ? '<button class="std" data-a="edit">Permitir Escrita</button>' : ''}
      <button class="std ov-close" data-a="close">✕ ${kind === 'reading' ? 'Fechar' : 'Fechar a Pré-visualização'}</button>`);
    const body = $('.ov-body', ov), pos = $('.ov-pos', ov);
    function fit() {
      const avail = body.clientWidth - 60;
      const pw = pageDims()[0] * MM;
      scale = Math.max(0.2, Math.min(1.4, avail / (pw * (two ? 2.15 : 1))));
      render();
    }
    function render() {
      body.innerHTML = '';
      const pages = two ? [idx, idx + 1] : [idx];
      for (const k of pages) if (k < Pager.count) {
        const c = pageClone(k, scale);
        c.classList.add('ov-page');
        body.append(c);
      }
      pos.textContent = Pager.count > 1 ? `Página ${idx + 1} de ${Pager.count}` : '';
      $('.ov-prev', ov).disabled = idx === 0;
      $('.ov-next', ov).disabled = idx >= Pager.count - 1;
    }
    const step = d => { idx = Math.max(0, Math.min(Pager.count - 1, idx + d * (two ? 2 : 1))); render(); };
    $('.ov-prev', ov).onclick = () => step(-1);
    $('.ov-next', ov).onclick = () => step(1);
    ov.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close') return close();
      if (a === 'print') { window.print(); }
      if (a === 'save') CMD.save();
      if (a === 'one') { two = false; fit(); }
      if (a === 'two') { two = true; idx = Math.floor(idx / 2) * 2; fit(); }
      if (a === 'edit') close();
      if (a === 'zin') { scale = Math.min(1.4, scale * 1.2); render(); }
      if (a === 'zout') { scale = Math.max(0.15, scale / 1.2); render(); }
    });
    const onKey = e => {
      if (!document.body.contains(ov)) return document.removeEventListener('keydown', onKey);
      if (e.key === 'Escape') close();
      if (e.key === 'PageDown' || e.key === 'ArrowRight') step(1);
      if (e.key === 'PageUp' || e.key === 'ArrowLeft') step(-1);
      if (e.key === 'Home') { idx = 0; render(); }
      if (e.key === 'End') { idx = Pager.count - 1; render(); }
    };
    document.addEventListener('keydown', onKey);
    function close() { ov.remove(); document.removeEventListener('keydown', onKey); app.classList.remove('reading'); if (kind === 'reading') setView('print'); }
    return { render: fit, close };
  }
  function enterReading() {
    app.classList.add('reading');
    pagedViewer('reading').render();
  }
  function exitReading() {
    $$('.doc-overlay.reading').forEach(o => o.remove());
  }
  function printPreview() {
    closeOfficeMenu();
    pagedViewer('print-preview').render();
  }

  /* ---------- Dividir janela ---------- */
  let splitOn = false, splitTimer = 0;
  function splitView() {
    splitOn = !splitOn;
    $('#btn-split')?.classList.toggle('active', splitOn);
    const sv = $('#split-view');
    sv.classList.toggle('hidden', !splitOn);
    if (splitOn) syncSplit();
  }
  function syncSplit() {
    if (!splitOn) return;
    clearTimeout(splitTimer);
    splitTimer = setTimeout(() => {
      const mir = $('#split-mirror');
      mir.innerHTML = '';
      const clone = page.cloneNode(true);
      clone.querySelector('#img-box')?.remove();
      clone.querySelector('#watermark')?.removeAttribute('id');
      clone.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
      clone.style.position = 'relative';
      mir.append(clone);
      mir.style.zoom = zoom / 100;
    }, 150);
  }

  /* ---------- Comandos ---------- */
  /* ---------- Modo Foco ---------- */
  let focusEl = null;
  function focusMode() {
    const on = document.body.classList.toggle('focus-mode');
    focusEl?.remove(); focusEl = null;
    if (on) {
      TaskPane.close(); closeLeftPane();
      focusEl = document.createElement('div');
      focusEl.id = 'focus-exit';
      focusEl.innerHTML = 'Modo Foco — <b>Esc</b> para sair';
      focusEl.onclick = focusMode;
      document.body.append(focusEl);
      scheduleRulers();
    } else scheduleRulers();
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) focusMode();
  });

  Object.assign(CMD, {
    focusMode,
    viewPrint: () => setView('print'),
    viewWeb: () => setView('web'),
    viewDraft: () => setView('draft'),
    viewOutline: () => setView('outline'),
    viewReading: () => { setView('print'); enterReading(); },
    docMap: () => (mode === 'map' ? closeLeftPane() : openLeftPane('map')),
    thumbnails: () => (mode === 'thumbs' ? closeLeftPane() : openLeftPane('thumbs')),
    closeLeftPane,
    zoomTwo: () => setZoom((scroller.clientHeight - 30) / (2 * Pager.S) * 100),
    newWindow: () => { autosave(); const w = window.open(location.href, '_blank'); if (!w) infoBox('O browser bloqueou a abertura de uma nova janela.'); },
    arrangeAll: () => infoBox('Cada janela do Nexora Word é uma janela do browser.<br>Utilize as funções do sistema operativo (por exemplo, arrastar a janela para uma lateral do ecrã) para as dispor lado a lado.'),
    splitView,
    sendEmail: kind => {
      closeOfficeMenu();
      const subject = encodeURIComponent(docName);
      const body = encodeURIComponent(editor.innerText.slice(0, 1500) + (editor.innerText.length > 1500 ? '\n[…]' : ''));
      location.href = `mailto:?subject=${subject}&body=${body}`;
    },
    publishBlog: () => {
      closeOfficeMenu();
      dialog({
        title: 'Registar uma Conta de Blogue',
        width: 420,
        body: `<div class="msg"><i class="ic" data-icon="info"></i><div>Para publicar num blogue é necessária uma conta num fornecedor de blogues (WordPress, Blogger, SharePoint…).<br><br>Esta versão do Nexora Word não consegue ligar-se a serviços de blogues. Pode copiar o documento como HTML e publicá-lo manualmente.</div></div>`,
        buttons: [{ label: 'Copiar como HTML', primary: true, value: 'html' }, { label: 'Cancelar', value: null }],
      }).then(r => { if (r === 'html') navigator.clipboard?.writeText(buildHtml()).then(() => infoBox('O HTML do documento foi copiado para a Área de Transferência.')); });
    },
    listLevel: dir => exec(dir === 'down' ? 'indent' : 'outdent'),
    listStart: async () => {
      const li = nodeEl(currentRange()?.startContainer)?.closest('li');
      const ol = li?.closest('ol');
      if (!ol) return infoBox('O cursor não está numa lista numerada.');
      const res = await dialog({
        title: 'Definir Valor de Numeração',
        width: 300,
        body: `<label>Iniciar numeração em:<input type="number" id="ls-v" min="0" value="${ol.start || 1}"></label>`,
        buttons: [{ label: 'OK', primary: true, value: ov => +$('#ls-v', ov).value }, { label: 'Cancelar', value: null }],
      });
      if (res === null || isNaN(res)) return;
      ol.start = res;
      changed();
    },
  });

  /* Mostrar/Ocultar */
  $('#chk-grid').addEventListener('change', e => { settings.gridlines = e.target.checked; Pager.schedule(0); });
  $('#chk-msgbar').addEventListener('change', e => { if (!e.target.checked) MessageBar.hide(); });
  $('#chk-docmap').addEventListener('change', e => e.target.checked ? openLeftPane('map') : closeLeftPane());
  $('#chk-thumbs').addEventListener('change', e => e.target.checked ? openLeftPane('thumbs') : closeLeftPane());

  /* Espelho da vista dividida: actualizar com o documento */
  const mo = new MutationObserver(() => { syncSplit(); scheduleThumbs(); });
  mo.observe(editor, { childList: true, subtree: true, characterData: true, attributes: true });

  return {
    refresh, closeLeftPane, printPreview, exitReading, pageClone, syncSplit,
    get leftMode() { return mode; },
  };
})();
window.Views = Views;
