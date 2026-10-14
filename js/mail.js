'use strict';
/* =========================================================
   Correspondência: impressão em série (lista de destinatários
   própria ou CSV), campos, pré-visualização, unir; envelopes
   e etiquetas.
   ========================================================= */
const MailMerge = (() => {
  const DEFAULT_FIELDS = ['Título', 'Nome Próprio', 'Apelido', 'Nome da Empresa', 'Endereço 1', 'Endereço 2', 'Cidade', 'Código Postal', 'País', 'Telefone', 'Correio Electrónico'];
  const mm = () => settings.mm || (settings.mm = { type: 'letters', fields: [], rows: [], include: [], preview: false, idx: 0 });
  const fieldHtml = f => `<span class="mm-field" data-field="${esc(f)}" contenteditable="false">«${esc(f)}»</span>`;
  const rec = i => { const m = mm(); const r = m.rows[i] || []; return Object.fromEntries(m.fields.map((f, k) => [f, r[k] ?? ''])); };
  const included = () => mm().rows.map((_, i) => i).filter(i => mm().include[i] !== false);
  const find = names => mm().fields.find(f => names.some(n => f.toLowerCase().replace(/\s+/g, '') === n.toLowerCase().replace(/\s+/g, ''))) || null;

  function parseCsv(text) {
    const delim = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = [];
    let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); if (row.some(v => v.trim())) rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    row.push(cur);
    if (row.some(v => v.trim())) rows.push(row);
    return rows;
  }

  function requireList() {
    if (mm().rows.length) return true;
    infoBox('Primeiro tem de seleccionar uma lista de destinatários em <b>Seleccionar Destinatários</b>.');
    return false;
  }

  async function listEditor(title, editable = true) {
    const m = mm();
    if (!m.fields.length) m.fields = [...DEFAULT_FIELDS];
    let fields = [...m.fields], rows = m.rows.map(r => [...r]), include = [...m.include];
    const table = () => `<table class="mm-table"><thead><tr><th></th>${fields.map(f => `<th>${esc(f)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr><td><input type="checkbox" data-inc="${i}"${include[i] !== false ? ' checked' : ''}></td>${fields.map((_, k) => `<td>${editable ? `<input data-r="${i}" data-c="${k}" value="${esc(r[k] ?? '')}">` : esc(r[k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const res = await dialog({
      title,
      width: 760,
      body: `<div class="mm-wrap" id="mm-wrap">${table()}</div><div class="dlg-inline"><button class="std" id="mm-add">Nova Entrada</button><button class="std" id="mm-del">Eliminar Entrada</button><button class="std" id="mm-cols">Personalizar Colunas...</button><button class="std" id="mm-sort">Ordenar por 1.ª coluna</button><span id="mm-count" style="margin-left:auto"></span></div>`,
      onOpen: ov => {
        const wrap = $('#mm-wrap', ov);
        const sync = () => { $$('input[data-r]', wrap).forEach(inp => { rows[+inp.dataset.r][+inp.dataset.c] = inp.value; }); $$('input[data-inc]', wrap).forEach(c => { include[+c.dataset.inc] = c.checked; }); };
        const redraw = () => { wrap.innerHTML = table(); $('#mm-count', ov).textContent = `${rows.length} destinatário(s)`; };
        redraw();
        $('#mm-add', ov).onclick = () => { sync(); rows.push(fields.map(() => '')); redraw(); wrap.scrollTop = 1e6; };
        $('#mm-del', ov).onclick = () => { sync(); const f = document.activeElement?.dataset?.r ?? rows.length - 1; rows.splice(+f, 1); include.splice(+f, 1); redraw(); };
        $('#mm-sort', ov).onclick = () => { sync(); const idx = rows.map((r, i) => i).sort((a, b) => String(rows[a][0] ?? '').localeCompare(String(rows[b][0] ?? ''), 'pt')); rows = idx.map(i => rows[i]); include = idx.map(i => include[i]); redraw(); };
        $('#mm-cols', ov).onclick = async () => { sync(); const t = await dialog({ title: 'Personalizar Lista de Endereços', width: 320, body: `<label>Nomes de campos (um por linha):<textarea id="cf" style="height:180px">${esc(fields.join('\n'))}</textarea></label>`, buttons: [{ label: 'OK', primary: true, value: o => $('#cf', o).value.split('\n').map(s => s.trim()).filter(Boolean) }, { label: 'Cancelar', value: null }] }); if (t?.length) { rows = rows.map(r => t.map(f => r[fields.indexOf(f)] ?? '')); fields = t; redraw(); } };
        ov.addEventListener('change', sync);
        ov.addEventListener('input', sync);
      },
      buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancelar', value: null }],
    });
    if (!res) return false;
    Object.assign(m, { fields, rows, include, idx: Math.min(m.idx, Math.max(0, rows.length - 1)) });
    History.setLabel('Lista de Destinatários');
    changed();
    return true;
  }

  async function loadCsv() {
    const f = await pickAux('.csv,.txt');
    if (!f) return;
    let text = new TextDecoder('utf-8').decode(await f.arrayBuffer());
    if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(await f.arrayBuffer());
    const rows = parseCsv(text.replace(/^\uFEFF/, ''));
    if (rows.length < 2) return infoBox('O ficheiro não contém dados suficientes (é necessária uma linha de cabeçalho e pelo menos um registo).', 'warning');
    Object.assign(mm(), { fields: rows[0].map(s => s.trim()), rows: rows.slice(1), include: [], idx: 0 });
    changed();
    listEditor('Destinatários da Impressão em Série', false);
  }

  function render() {
    const m = mm();
    const r = rec(m.idx);
    $$('.mm-field', page).forEach(s => { const v = m.preview ? (r[s.dataset.field] ?? '') : `«${s.dataset.field}»`; if (s.textContent !== v) s.textContent = v; });
    $('#mm-record').value = m.rows.length ? m.idx + 1 : '';
    $('#btn-mm-preview')?.classList.toggle('active', !!m.preview);
  }

  async function addressBlock() {
    if (!requireList()) return;
    const name = [find(['Título', 'Titulo']), find(['Nome Próprio', 'Nome', 'FirstName']), find(['Apelido', 'LastName'])].filter(Boolean);
    const comp = find(['Nome da Empresa', 'Empresa', 'Company']);
    const addr = [find(['Endereço 1', 'Endereço', 'Morada', 'Address']), find(['Endereço 2'])].filter(Boolean);
    const city = [find(['Código Postal', 'CP', 'Postal']), find(['Cidade', 'Localidade', 'City'])].filter(Boolean);
    const country = find(['País', 'Country']);
    const ok = await dialog({ title: 'Inserir Bloco de Endereço', width: 380, body: `${chk('ab-name', 'Inserir o nome do destinatário', true)}${chk('ab-comp', 'Inserir o nome da empresa', !!comp)}${chk('ab-country', 'Inserir o país/região no endereço', !!country)}<div class="mm-prev">${[name.map(f => '«' + f + '»').join(' '), comp && '«' + comp + '»', ...addr.map(f => '«' + f + '»'), city.map(f => '«' + f + '»').join(' '), country && '«' + country + '»'].filter(Boolean).map(esc).join('<br>')}</div>`, buttons: [{ label: 'OK', primary: true, value: ov => ({ n: $('#ab-name', ov).checked, c: $('#ab-comp', ov).checked, k: $('#ab-country', ov).checked }) }, { label: 'Cancelar', value: null }] });
    if (!ok) return;
    const lines = [ok.n && name.map(fieldHtml).join(' '), ok.c && comp && fieldHtml(comp), ...addr.map(fieldHtml), city.map(fieldHtml).join(' '), ok.k && country && fieldHtml(country)].filter(Boolean);
    exec('insertHTML', `<p class="no-spacing">${lines.join('<br>')}</p><p><br></p>`);
    render();
  }

  async function greeting() {
    if (!requireList()) return;
    const n = find(['Nome Próprio', 'Nome', 'FirstName']) || mm().fields[0];
    const res = await dialog({ title: 'Inserir Linha de Saudação', width: 360, body: `<div class="ms-row">${sel('gl-a', ['Caro(a)', 'Exmo(a). Sr(a).', 'Olá', 'Prezado(a)'], 'Caro(a)')}${sel('gl-f', mm().fields, n)}${sel('gl-p', [',', ':', ''], ',')}</div>`, buttons: [{ label: 'OK', primary: true, value: ov => ({ a: $('#gl-a', ov).value, f: $('#gl-f', ov).value, p: $('#gl-p', ov).value }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    exec('insertHTML', `<p>${esc(res.a)} ${fieldHtml(res.f)}${esc(res.p)}</p>`);
    render();
  }

  function mergedHtml(indices) {
    const tpl = cleanEditorClone();
    const parts = indices.map(i => {
      const r = rec(i), c = tpl.cloneNode(true);
      $$('.mm-field', c).forEach(s => s.replaceWith(document.createTextNode(r[s.dataset.field] ?? '')));
      return c.innerHTML;
    });
    if (mm().type === 'labels' && $('table.labels-sheet', tpl)) {
      // etiquetas: preencher as células da folha com registos sucessivos
      const sheet = $('table.labels-sheet', tpl).cloneNode(true);
      const cells = $$('td', sheet);
      const cellTpl = cells[0].innerHTML;
      const out = [];
      for (let p = 0; p < indices.length; p += cells.length) {
        const s = sheet.cloneNode(true);
        $$('td', s).forEach((td, k) => {
          const i = indices[p + k];
          if (i === undefined) { td.innerHTML = '<br>'; return; }
          const r = rec(i), d = document.createElement('div');
          d.innerHTML = cellTpl;
          $$('.mm-field', d).forEach(x => x.replaceWith(document.createTextNode(r[x.dataset.field] ?? '')));
          td.innerHTML = d.innerHTML;
        });
        out.push(s.outerHTML);
      }
      return out.join('<hr class="page-break">');
    }
    return parts.join(mm().type === 'directory' ? '' : '<hr class="page-break">');
  }

  async function finish(mode) {
    if (!requireList()) return;
    const m = mm();
    const res = await dialog({ title: mode === 'print' ? 'Unir na Impressora' : mode === 'email' ? 'Unir em Correio Electrónico' : 'Unir num Novo Documento', width: 340, body: `${fieldset('Unir registos', `<label class="fcheck"><input type="radio" name="mf" value="all" checked> Todos</label><label class="fcheck"><input type="radio" name="mf" value="cur"> Registo actual</label><label class="fcheck"><input type="radio" name="mf" value="range"> De: <input type="number" id="mf-a" value="1" min="1" style="width:50px"> A: <input type="number" id="mf-b" value="${m.rows.length}" min="1" style="width:50px"></label>`)}${mode === 'email' ? `<label>Para:${sel('mf-to', m.fields, find(['Correio Electrónico', 'Email', 'E-mail']) || m.fields[0])}</label><label>Linha de assunto:<input id="mf-subj" value="${esc(docName)}"></label>` : ''}`, buttons: [{ label: 'OK', primary: true, value: ov => ({ r: $('input[name=mf]:checked', ov).value, a: +$('#mf-a', ov).value, b: +$('#mf-b', ov).value, to: $('#mf-to', ov)?.value, subj: $('#mf-subj', ov)?.value }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    let idx = included();
    if (res.r === 'cur') idx = [m.idx];
    if (res.r === 'range') idx = idx.filter(i => i + 1 >= res.a && i + 1 <= res.b);
    if (!idx.length) return infoBox('Nenhum registo corresponde aos critérios.');
    if (mode === 'email') {
      const tpl = cleanEditorClone();
      const links = idx.map(i => { const r = rec(i), c = tpl.cloneNode(true); $$('.mm-field', c).forEach(s => s.replaceWith(document.createTextNode(r[s.dataset.field] ?? ''))); return { to: r[res.to], body: c.innerText }; }).filter(l => l.to);
      return dialog({ title: 'Mensagens de Correio Electrónico', width: 460, body: `<p>Foram geradas ${links.length} mensagens. Clique em cada destinatário para abrir a mensagem no seu programa de correio electrónico:</p><div class="mm-mail">${links.map(l => `<a class="std" href="mailto:${encodeURIComponent(l.to)}?subject=${encodeURIComponent(res.subj)}&body=${encodeURIComponent(l.body.slice(0, 1800))}">${esc(l.to)}</a>`).join('')}</div>`, buttons: [{ label: 'Fechar', primary: true, value: true }] });
    }
    const html = mergedHtml(idx);
    if (mode === 'print') {
      const saved = { html: editor.innerHTML };
      editor.innerHTML = html;
      Pager.layout();
      window.print();
      editor.innerHTML = saved.html;
      Pager.layout();
      return;
    }
    if (!(await confirmDiscard())) return;
    const s = JSON.parse(JSON.stringify(settings));
    delete s.mm;
    docCounter++;
    setDocument(`<meta name="wc-settings" content="${esc(JSON.stringify(s))}">${html}`, `${m.type === 'labels' ? 'Etiquetas' : m.type === 'envelopes' ? 'Envelopes' : 'Cartas'}${docCounter}`);
    dirty = true;
    setTitle();
  }

  /* ---------- Envelopes ---------- */
  const ENV = { DL: [220, 110], C5: [229, 162], C6: [162, 114], 'Comercial 10': [241.3, 104.8] };
  async function envelopes(merge) {
    const res = await dialog({
      title: 'Envelopes e Etiquetas',
      width: 460,
      body: `<div class="dlg-tabs"><button class="dlg-tab active">Envelopes</button><button class="dlg-tab" id="ev-lab">Etiquetas</button></div>
        <label>Endereço de entrega:<textarea id="ev-to" style="height:80px">${merge ? '' : esc(currentRange()?.toString() || '')}</textarea></label>
        <label>Endereço do remetente:<textarea id="ev-from" style="height:60px">${esc(prefs.user)}</textarea></label>${chk('ev-omit', 'Omitir', false)}
        <label>Tamanho do envelope:${sel('ev-size', Object.keys(ENV).map(k => [k, `${k} (${ENV[k][0] / 10} x ${ENV[k][1] / 10} cm)`]), 'DL')}</label>`,
      onOpen: ov => { $('#ev-lab', ov).onclick = () => { ov.remove(); labels(merge); }; },
      buttons: [{ label: merge ? 'OK' : 'Adicionar ao Documento', primary: true, value: ov => ({ to: $('#ev-to', ov).value, from: $('#ev-omit', ov).checked ? '' : $('#ev-from', ov).value, size: $('#ev-size', ov).value }) }, { label: 'Imprimir', value: ov => ({ to: $('#ev-to', ov).value, from: $('#ev-omit', ov).checked ? '' : $('#ev-from', ov).value, size: $('#ev-size', ov).value, print: true }) }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    if (!merge && !(await confirmDiscard())) return;
    const [w, h] = ENV[res.size];
    PAGE_SIZES.Personalizado = [h, w];
    const toHtml = merge && mm().fields.length ? (() => { const n = [find(['Nome Próprio', 'Nome']), find(['Apelido'])].filter(Boolean).map(fieldHtml).join(' '); const a = [find(['Endereço 1', 'Endereço', 'Morada'])].filter(Boolean).map(fieldHtml); const c = [find(['Código Postal']), find(['Cidade'])].filter(Boolean).map(fieldHtml).join(' '); return [n, ...a, c].filter(Boolean).join('<br>'); })() : esc(res.to).replace(/\n/g, '<br>');
    const s = { ...defaultSettings(), size: 'Personalizado', customSize: [h, w], landscape: true, margins: { t: 1.5, b: 1, l: 1.5, r: 1.5 }, mm: merge ? settings.mm : undefined };
    if (merge) s.mm = { ...mm(), type: 'envelopes' };
    const html = `<meta name="wc-settings" content="${esc(JSON.stringify(s))}"><p class="no-spacing env-from">${esc(res.from).replace(/\n/g, '<br>')}</p><p class="no-spacing env-to" style="margin-left:${w / 10 * 0.42}cm;margin-top:${h / 10 * 0.25}cm">${toHtml}</p>`;
    docCounter++;
    setDocument(html, `Envelope${docCounter}`);
    dirty = true;
    if (res.print) printRange('');
  }

  /* ---------- Etiquetas ---------- */
  const LABELS = {
    'Avery L7160': { cols: 3, rows: 7, w: 63.5, h: 38.1, mt: 15.1, ml: 7.2, gap: 2.5 },
    'Avery L7163': { cols: 2, rows: 7, w: 99.1, h: 38.1, mt: 15.1, ml: 4.7, gap: 2.5 },
    'Avery L7651': { cols: 5, rows: 13, w: 38.1, h: 21.2, mt: 10.7, ml: 4.7, gap: 2.5 },
    'Avery L7159': { cols: 3, rows: 8, w: 63.5, h: 33.9, mt: 12.9, ml: 7.2, gap: 2.5 },
  };
  async function labels(merge) {
    const res = await dialog({
      title: 'Envelopes e Etiquetas',
      width: 460,
      body: `<div class="dlg-tabs"><button class="dlg-tab" id="lb-env">Envelopes</button><button class="dlg-tab active">Etiquetas</button></div>
        <label>Endereço:<textarea id="lb-t" style="height:90px">${merge ? '' : esc(currentRange()?.toString() || '')}</textarea></label>
        ${merge ? '' : fieldset('Imprimir', '<label class="fcheck"><input type="radio" name="lb-m" value="full" checked> Página inteira da mesma etiqueta</label><label class="fcheck"><input type="radio" name="lb-m" value="one"> Uma única etiqueta</label>')}
        <label>Etiqueta:${sel('lb-p', Object.keys(LABELS).map(k => [k, `${k} (${LABELS[k].cols * LABELS[k].rows} por folha, ${LABELS[k].w} x ${LABELS[k].h} mm)`]), 'Avery L7160')}</label>`,
      onOpen: ov => { $('#lb-env', ov).onclick = () => { ov.remove(); envelopes(merge); }; },
      buttons: [{ label: 'Novo Documento', primary: true, value: ov => ({ t: $('#lb-t', ov).value, m: $('input[name=lb-m]:checked', ov)?.value || 'full', p: $('#lb-p', ov).value }) }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    if (!(await confirmDiscard())) return;
    const L = LABELS[res.p];
    const content = merge && mm().fields.length ? [[find(['Nome Próprio', 'Nome']), find(['Apelido'])].filter(Boolean).map(fieldHtml).join(' '), ...[find(['Endereço 1', 'Endereço', 'Morada'])].filter(Boolean).map(fieldHtml), [find(['Código Postal']), find(['Cidade'])].filter(Boolean).map(fieldHtml).join(' ')].filter(Boolean).join('<br>') : esc(res.t).replace(/\n/g, '<br>');
    const cell = i => `<td style="width:${L.w}mm;height:${L.h}mm">${res.m === 'one' && i ? '<br>' : content || '<br>'}</td>`;
    const rows = Array.from({ length: L.rows }, (_, r) => `<tr>${Array.from({ length: L.cols }, (_, c) => cell(r * L.cols + c)).join('')}</tr>`).join('');
    const s = { ...defaultSettings(), margins: { t: L.mt / 10, b: 0.5, l: L.ml / 10, r: 0.3 } };
    if (merge) s.mm = { ...mm(), type: 'labels' };
    docCounter++;
    setDocument(`<meta name="wc-settings" content="${esc(JSON.stringify(s))}"><table class="labels-sheet" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:${L.gap}mm 0;table-layout:fixed;width:auto">${rows}</table><p><br></p>`, `Etiquetas${docCounter}`);
    page.classList.add('show-tblgrid');
    dirty = true;
  }

  DD_HOOKS['dd-mm-fields'] = dd => {
    const f = mm().fields;
    dd.innerHTML = f.length ? f.map(x => `<button class="dd-item" data-cmd="mmInsertField" data-arg="${esc(x)}">${esc(x)}</button>`).join('') : '<div class="dd-foot">Seleccione primeiro os destinatários.</div>';
  };
  $('#mm-record').addEventListener('change', e => { const n = parseInt(e.target.value) - 1; if (n >= 0 && n < mm().rows.length) { mm().idx = n; render(); } });

  Object.assign(CMD, {
    mmStart: t => {
      mm().type = t;
      if (t === 'envelopes') return envelopes(true);
      if (t === 'labels') return labels(true);
      if (t === 'normal') { settings.mm = undefined; $$('.mm-field', editor).forEach(s => s.replaceWith(document.createTextNode(s.textContent))); changed(); return; }
      MessageBar.show(`<b>Impressão em Série</b> Tipo de documento: ${{ letters: 'Cartas', email: 'Mensagens de Correio Electrónico', directory: 'Directório' }[t]}. Seleccione os destinatários e insira os campos.`);
      setTimeout(() => MessageBar.hide(), 5000);
    },
    mmNewList: () => { if (!mm().rows.length) { mm().fields = [...DEFAULT_FIELDS]; mm().rows = [DEFAULT_FIELDS.map(() => '')]; } listEditor('Nova Lista de Endereços'); },
    mmLoadCsv: loadCsv,
    mmEditList: () => requireList() && listEditor('Destinatários da Impressão em Série'),
    mmInsertField: f => { exec('insertHTML', fieldHtml(f)); render(); },
    mmHighlight: () => { page.classList.toggle('mm-highlight'); $('#btn-mm-highlight').classList.toggle('active', page.classList.contains('mm-highlight')); },
    mmAddressBlock: addressBlock, mmGreeting: greeting,
    mmPreview: () => { if (!requireList()) return; mm().preview = !mm().preview; render(); },
    mmNav: d => { const m = mm(); if (!m.rows.length) return; m.idx = { first: 0, prev: Math.max(0, m.idx - 1), next: Math.min(m.rows.length - 1, m.idx + 1), last: m.rows.length - 1 }[d]; if (!m.preview) m.preview = true; render(); },
    mmFind: async () => {
      if (!requireList()) return;
      const t = await dialog({ title: 'Localizar Entrada', width: 320, body: '<label>Localizar:<input id="mf-q"></label>', buttons: [{ label: 'Localizar Seguinte', primary: true, value: ov => $('#mf-q', ov).value.trim().toLowerCase() }, { label: 'Cancelar', value: null }] });
      if (!t) return;
      const m = mm(), n = m.rows.length;
      for (let k = 1; k <= n; k++) { const i = (m.idx + k) % n; if (m.rows[i].some(v => String(v).toLowerCase().includes(t))) { m.idx = i; m.preview = true; render(); return; } }
      infoBox('Não foi encontrada nenhuma entrada correspondente.');
    },
    mmFinish: finish, envelopes: () => envelopes(false), labels: () => labels(false),
  });

  return { render, mm };
})();
window.MailMerge = MailMerge;
