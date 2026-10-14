'use strict';
/* =========================================================
   Ferramentas de Tabela (Estrutura / Esquema) e
   Ferramentas de Imagem (Formatar)
   ========================================================= */
const TableTools = (() => {
  const STYLES = [
    ['tbl-grid', 'Grelha da Tabela'], ['tbl-plain', 'Tabela Simples'], ['tbl-light-shading', 'Sombreado Claro'], ['tbl-light-list', 'Lista Clara'],
    ['tbl-light-grid', 'Grelha Clara'], ['tbl-medium1', 'Sombreado Médio 1'], ['tbl-medium-grid', 'Grelha Média'], ['tbl-dark-list', 'Lista Escura'], ['tbl-colorful', 'Lista Colorida'],
  ];
  const ALL = STYLES.map(s => s[0]).concat(['tbl-light']);
  const accents = () => ['#000000', ...DocStyles.theme().accents];

  function current() {
    const r = currentRange();
    return nodeEl(r?.startContainer)?.closest('#editor table') || $('#editor td.cell-sel')?.closest('table') || null;
  }
  function currentCell() {
    const r = currentRange();
    return nodeEl(r?.startContainer)?.closest('#editor td, #editor th') || $('#editor .cell-sel') || null;
  }
  function selectedCells() {
    const marked = $$('#editor .cell-sel');
    if (marked.length) return marked;
    const r = currentRange(), t = current();
    if (!r || !t) return [];
    if (r.collapsed) return [currentCell()].filter(Boolean);
    return $$('td,th', t).filter(c => r.intersectsNode(c) && c.closest('table') === t);
  }

  /* modelo de grelha (respeita colspan/rowspan) */
  function grid(t) {
    const g = [];
    [...t.rows].forEach((tr, ri) => {
      g[ri] ??= [];
      let c = 0;
      for (const cell of tr.cells) {
        while (g[ri][c]) c++;
        for (let dr = 0; dr < cell.rowSpan; dr++) for (let dc = 0; dc < cell.colSpan; dc++) { (g[ri + dr] ??= [])[c + dc] = cell; }
        cell.dataset.gr = ri; cell.dataset.gc = c;
        c += cell.colSpan;
      }
    });
    return g;
  }

  function applyStyleClass(t, value) {
    const [cls, acc] = value.split(':');
    t.classList.remove(...ALL);
    t.classList.add(cls);
    t.style.setProperty('--acc', accents()[+acc || 0]);
    t.style.setProperty('--acc-l', DocStyles.shadeHex(accents()[+acc || 0], +acc ? 0.8 : 0.85));
    t.style.setProperty('--acc-d', DocStyles.shadeHex(accents()[+acc || 0], -0.25));
    t.dataset.tstyle = value;
  }

  const thumb = (cls, acc) => {
    const a = accents()[acc];
    return `<button class="tblstyle-item" data-cmd="tableStyle" data-arg="${cls}:${acc}" data-tip="${STYLES.find(s => s[0] === cls)[1]}${acc ? ' - Cor ' + acc : ''}"><table class="${cls} tso-first" style="--acc:${a};--acc-l:${DocStyles.shadeHex(a, acc ? 0.8 : 0.85)};--acc-d:${DocStyles.shadeHex(a, -0.25)}">${Array.from({ length: 5 }, (_, r) => `<tr>${Array.from({ length: 5 }, () => `<${r ? 'td' : 'th'}></${r ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table></button>`;
  };
  function buildGalleries() {
    $('#table-style-gallery').innerHTML = STYLES.map(([c], i) => thumb(c, i < 2 ? 0 : 1)).join('');
    $('#dd-tablestyles').innerHTML = `<div class="dd-title">Simples</div><div class="tbl-grid-dd">${STYLES.slice(0, 2).map(([c]) => thumb(c, 0)).join('')}</div><div class="dd-title">Incorporadas</div><div class="tbl-grid-dd">${STYLES.slice(2).map(([c]) => [0, 1, 2, 3, 4, 5, 6].map(a => thumb(c, a)).join('')).join('')}</div><div class="dd-sep"></div><button class="dd-item" data-cmd="tableStyle" data-arg="tbl-grid:0">Limpar</button>`;
  }

  function sync() {
    const t = current();
    if (!t) return;
    const cell = currentCell();
    const set = (id, v) => { const el = $('#' + id); if (el && document.activeElement !== el) el.value = v; };
    if (cell) {
      set('cell-h', fmt(cell.parentElement.offsetHeight / CM));
      set('cell-w', fmt(cell.offsetWidth / CM));
    }
    const cls = n => t.classList.contains(n);
    $('#tso-header').checked = !cls('tso-nohdr');
    $('#tso-total').checked = cls('tso-total');
    $('#tso-banded').checked = !cls('tso-noband');
    $('#tso-first').checked = cls('tso-first');
    $('#tso-last').checked = cls('tso-last');
    $('#tso-bandcol').checked = cls('tso-bandcol');
    $('#btn-repeathdr').classList.toggle('active', !!t.tHead);
    $$('.tblstyle-item').forEach(b => b.classList.toggle('active', b.dataset.arg === t.dataset.tstyle));
  }

  [['tso-header', 'tso-nohdr', true], ['tso-total', 'tso-total'], ['tso-banded', 'tso-noband', true], ['tso-first', 'tso-first'], ['tso-last', 'tso-last'], ['tso-bandcol', 'tso-bandcol']].forEach(([id, cls, inverse]) => {
    $('#' + id).addEventListener('change', e => {
      const t = current();
      if (!t) return;
      t.classList.toggle(cls, inverse ? !e.target.checked : e.target.checked);
      History.setLabel('Opções de Estilo de Tabela');
      changed();
    });
  });

  /* ---------- Operações ---------- */
  function opSel(op) {
    const cell = currentCell();
    if (!cell) return;
    ctxTarget = cell;
    if (op === 'delCells') return deleteCellsDialog(cell);
    tableOp(op);
  }

  async function deleteCellsDialog(cell) {
    const v = await dialog({ title: 'Eliminar Células', width: 280, body: ['left', 'up', 'row', 'col'].map((k, i) => `<label class="fcheck"><input type="radio" name="dc" value="${k}"${i ? '' : ' checked'}> ${{ left: 'Deslocar as células para a esquerda', up: 'Deslocar as células para cima', row: 'Eliminar linha inteira', col: 'Eliminar coluna inteira' }[k]}</label>`).join(''), buttons: [{ label: 'OK', primary: true, value: ov => $('input[name=dc]:checked', ov).value }, { label: 'Cancelar', value: null }] });
    if (!v) return;
    ctxTarget = cell;
    if (v === 'row') return tableOp('delRow');
    if (v === 'col') return tableOp('delCol');
    if (v === 'left') { const row = cell.parentElement; cell.remove(); const n = document.createElement('td'); n.innerHTML = '<br>'; row.append(n); }
    if (v === 'up') {
      const t = cell.closest('table'), g = grid(t), c = +cell.dataset.gc, r0 = +cell.dataset.gr;
      for (let r = r0; r < g.length - 1; r++) { const a = g[r][c], b = g[r + 1][c]; if (a && b) a.innerHTML = b.innerHTML; }
      const last = g[g.length - 1][c]; if (last) last.innerHTML = '<br>';
    }
    changed();
  }

  async function insertCellsDialog() {
    const v = await dialog({ title: 'Inserir Células', width: 280, body: ['right', 'down', 'row', 'col'].map((k, i) => `<label class="fcheck"><input type="radio" name="ic" value="${k}"${i ? '' : ' checked'}> ${{ right: 'Deslocar as células para a direita', down: 'Deslocar as células para baixo', row: 'Inserir linha inteira', col: 'Inserir coluna inteira' }[k]}</label>`).join(''), buttons: [{ label: 'OK', primary: true, value: ov => $('input[name=ic]:checked', ov).value }, { label: 'Cancelar', value: null }] });
    const cell = currentCell();
    if (!v || !cell) return;
    ctxTarget = cell;
    if (v === 'row' || v === 'down') return tableOp('rowAbove');
    tableOp('colLeft');
  }

  function merge() {
    const cells = selectedCells();
    if (cells.length < 2) return infoBox('Seleccione duas ou mais células adjacentes para as unir.');
    const t = cells[0].closest('table'), g = grid(t);
    let r1 = Infinity, c1 = Infinity, r2 = -1, c2 = -1;
    cells.forEach(c => { const r = +c.dataset.gr, k = +c.dataset.gc; r1 = Math.min(r1, r); c1 = Math.min(c1, k); r2 = Math.max(r2, r + c.rowSpan - 1); c2 = Math.max(c2, k + c.colSpan - 1); });
    const inside = new Set();
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      const cell = g[r]?.[c];
      if (!cell) continue;
      const cr = +cell.dataset.gr, cc = +cell.dataset.gc;
      if (cr < r1 || cc < c1 || cr + cell.rowSpan - 1 > r2 || cc + cell.colSpan - 1 > c2) return infoBox('As células seleccionadas têm de formar um rectângulo.');
      inside.add(cell);
    }
    const first = g[r1][c1];
    const extra = [...inside].filter(c => c !== first);
    const parts = [first.innerHTML, ...extra.map(c => c.innerHTML)].filter(h => h.replace(/<br\s*\/?>/g, '').trim());
    first.innerHTML = parts.map(h => (/^<(p|h\d|ul|ol|table|div)/i.test(h) ? h : `<p>${h}</p>`)).join('') || '<br>';
    first.colSpan = c2 - c1 + 1;
    first.rowSpan = r2 - r1 + 1;
    first.style.width = '';
    extra.forEach(c => c.remove());
    [...t.rows].forEach(tr => { if (!tr.cells.length) tr.remove(); });
    $$('.cell-sel', t).forEach(c => c.classList.remove('cell-sel'));
    History.setLabel('Unir Células');
    changed();
  }

  async function splitCellsDialog() {
    const cell = currentCell();
    if (!cell) return;
    const res = await dialog({ title: 'Dividir Células', width: 280, body: `<label>Número de colunas:<input type="number" id="sc-c" value="2" min="1" max="20"></label><label>Número de linhas:<input type="number" id="sc-r" value="1" min="1" max="20"></label>`, buttons: [{ label: 'OK', primary: true, value: ov => ({ c: +$('#sc-c', ov).value || 1, r: +$('#sc-r', ov).value || 1 }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    const t = cell.closest('table'), g = grid(t), gc = +cell.dataset.gc, row = cell.parentElement;
    const mk = () => { const c = document.createElement(cell.tagName); c.innerHTML = '<br>'; return c; };
    // colunas
    if (res.c > 1) {
      const extraCols = Math.max(0, res.c - cell.colSpan);
      if (extraCols) g.forEach((r, ri) => { const other = r[gc]; if (other && other !== cell && +other.dataset.gc === gc && !(ri >= +cell.dataset.gr && ri < +cell.dataset.gr + cell.rowSpan)) other.colSpan += extraCols; });
      const total = cell.colSpan + extraCols;
      const base = Math.floor(total / res.c);
      cell.colSpan = base;
      let after = cell;
      for (let i = 1; i < res.c; i++) { const n = mk(); n.colSpan = i === res.c - 1 ? total - base * (res.c - 1) : base; n.rowSpan = cell.rowSpan; after.after(n); after = n; }
    }
    // linhas
    if (res.r > 1) {
      const rowCells = $$(':scope > td, :scope > th', row);
      const newCells = rowCells.filter(c => c === cell || (+c.dataset.gc >= gc && +c.dataset.gc < gc + res.c && c.parentElement === row && c.compareDocumentPosition(cell) & Node.DOCUMENT_POSITION_PRECEDING) || c === cell);
      const group = [cell];
      let n = cell.nextElementSibling;
      for (let i = 1; i < res.c && n; i++) { group.push(n); n = n.nextElementSibling; }
      void newCells;
      rowCells.filter(c => !group.includes(c)).forEach(c => { c.rowSpan += res.r - 1; });
      let ref = row;
      for (let i = 1; i < res.r; i++) {
        const tr = document.createElement('tr');
        group.forEach(gcell => { const c = mk(); c.colSpan = gcell.colSpan; tr.append(c); });
        ref.after(tr);
        ref = tr;
      }
    }
    History.setLabel('Dividir Células');
    changed();
  }

  function splitTable() {
    const cell = currentCell();
    if (!cell) return;
    const row = cell.parentElement, t = row.closest('table');
    if (row === t.rows[0]) return;
    const nt = t.cloneNode(false);
    const body = document.createElement('tbody');
    nt.append(body);
    let r = row;
    while (r) { const next = r.nextElementSibling; body.append(r); r = next; }
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    t.after(p, nt);
    placeCaret(p, true);
    History.setLabel('Dividir Tabela');
    changed();
  }

  function autofit(mode) {
    const t = current();
    if (!t) return;
    const cells = $$('td,th', t);
    if (mode === 'content') { t.style.width = 'auto'; t.style.tableLayout = 'auto'; cells.forEach(c => { c.style.width = ''; }); }
    else if (mode === 'window') { t.style.width = '100%'; t.style.tableLayout = 'fixed'; cells.forEach(c => { c.style.width = ''; }); }
    else { cells.forEach(c => { c.style.width = c.offsetWidth + 'px'; }); t.style.tableLayout = 'fixed'; t.style.width = t.offsetWidth + 'px'; }
    changed();
  }

  function distribute(what) {
    const t = current();
    if (!t) return;
    if (what === 'rows') { const h = Math.max(...[...t.rows].map(r => r.offsetHeight)); [...t.rows].forEach(r => { r.style.height = h + 'px'; }); }
    else { const n = Math.max(...[...t.rows].map(r => [...r.cells].reduce((s, c) => s + c.colSpan, 0))); $$('td,th', t).forEach(c => { c.style.width = (100 / n * c.colSpan).toFixed(2) + '%'; }); t.style.tableLayout = 'fixed'; }
    changed();
  }

  function cellAlign(p) {
    const v = { t: 'top', m: 'middle', b: 'bottom' }[p[0]], h = { l: 'left', c: 'center', r: 'right' }[p[1]];
    selectedCells().forEach(c => { c.style.verticalAlign = v; c.style.textAlign = h; $$('p', c).forEach(x => { x.style.textAlign = ''; }); });
    changed();
  }

  function textDirection() {
    const cells = selectedCells();
    const cur = cells[0]?.style.writingMode || '';
    const next = { '': 'vertical-rl', 'vertical-rl': 'sideways-lr', 'sideways-lr': '' }[cur] ?? '';
    cells.forEach(c => { c.style.writingMode = next; if (next === 'sideways-lr') c.style.writingMode = 'vertical-lr', c.style.transform = 'rotate(180deg)'; else c.style.transform = ''; });
    changed();
  }

  async function cellMargins() {
    const t = current();
    if (!t) return;
    const c = getComputedStyle(t.querySelector('td,th'));
    const res = await dialog({ title: 'Opções da Tabela', width: 320, body: `${'<div class="dlg-fs-title">Margens predefinidas das células</div>'}<div class="two"><label>Superior:<input type="number" step="0.05" id="cm-t" value="${pxToCm(c.paddingTop)}"> cm</label><label>Esquerda:<input type="number" step="0.05" id="cm-l" value="${pxToCm(c.paddingLeft)}"> cm</label><label>Inferior:<input type="number" step="0.05" id="cm-b" value="${pxToCm(c.paddingBottom)}"> cm</label><label>Direita:<input type="number" step="0.05" id="cm-r" value="${pxToCm(c.paddingRight)}"> cm</label></div><label>Espaçamento entre células:<input type="number" step="0.05" id="cm-sp" value="0"> cm</label>`, buttons: [{ label: 'OK', primary: true, value: ov => ['t', 'l', 'b', 'r', 'sp'].map(k => num($('#cm-' + k, ov).value) || 0) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    const [tt, l, b, r, sp] = res;
    $$('td,th', t).forEach(cell => { cell.style.padding = `${tt}cm ${r}cm ${b}cm ${l}cm`; });
    t.style.borderCollapse = sp ? 'separate' : '';
    t.style.borderSpacing = sp ? sp + 'cm' : '';
    changed();
  }

  async function sortTable() {
    const t = current();
    if (!t) return;
    const cols = Math.max(...[...t.rows].map(r => r.cells.length));
    const res = await dialog({ title: 'Ordenar', width: 360, body: `<div class="two"><label>Ordenar por:<select id="st-col">${Array.from({ length: cols }, (_, i) => `<option value="${i}">Coluna ${i + 1}</option>`).join('')}</select></label><label>Tipo:<select id="st-type"><option value="text">Texto</option><option value="num">Número</option><option value="date">Data</option></select></label></div><label class="fcheck"><input type="radio" name="st-dir" value="asc" checked> Ascendente</label><label class="fcheck"><input type="radio" name="st-dir" value="desc"> Descendente</label>${chk('st-hdr', 'A minha lista tem linha de cabeçalho', !!t.querySelector('th') || !!t.tHead)}`, buttons: [{ label: 'OK', primary: true, value: ov => ({ col: +$('#st-col', ov).value, type: $('#st-type', ov).value, dir: $('input[name=st-dir]:checked', ov).value, hdr: $('#st-hdr', ov).checked }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    const body = t.tBodies[0];
    const rows = [...body.rows];
    const head = res.hdr && !t.tHead ? rows.shift() : null;
    const key = r => { const v = r.cells[res.col]?.textContent.trim() || ''; if (res.type === 'num') return num(v.replace(/[^\d,.-]/g, '')) || 0; if (res.type === 'date') { const [d, m, y] = v.split(/[/.-]/); return new Date(+y, +m - 1, +d).getTime() || 0; } return v; };
    rows.sort((a, b) => { const x = key(a), y = key(b); const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt'); return res.dir === 'asc' ? c : -c; });
    if (head) body.append(head);
    rows.forEach(r => body.append(r));
    History.setLabel('Ordenar Tabela');
    changed();
  }

  function repeatHeader() {
    const t = current();
    if (!t) return;
    if (t.tHead) { const body = t.tBodies[0]; [...t.tHead.rows].reverse().forEach(r => body.prepend(r)); t.tHead.remove(); }
    else { const th = t.createTHead(); th.append(t.rows[0]); }
    sync();
    changed();
  }

  async function toText() {
    const t = current();
    if (!t) return;
    const sep = await dialog({ title: 'Converter Tabela em Texto', width: 300, body: '<div class="dlg-fs-title">Separar texto com</div>' + [['tab', 'Tabulações'], [';', 'Pontos e vírgulas'], ['para', 'Marcas de parágrafo'], [',', 'Vírgulas']].map(([v, l], i) => `<label class="fcheck"><input type="radio" name="tt" value="${v}"${i ? '' : ' checked'}> ${l}</label>`).join(''), buttons: [{ label: 'OK', primary: true, value: ov => $('input[name=tt]:checked', ov).value }, { label: 'Cancelar', value: null }] });
    if (!sep) return;
    const frag = document.createDocumentFragment();
    [...t.rows].forEach(r => {
      const vals = [...r.cells].map(c => c.innerText.trim());
      if (sep === 'para') vals.forEach(v => { const p = document.createElement('p'); p.textContent = v; frag.append(p); });
      else { const p = document.createElement('p'); if (sep === 'tab') p.innerHTML = vals.map(esc).join('<span class="wc-tab" contenteditable="false">\t</span>'); else p.textContent = vals.join(sep + ' '); frag.append(p); }
    });
    t.replaceWith(frag);
    History.setLabel('Converter em Texto');
    changed();
  }

  async function formula() {
    const cell = currentCell();
    if (!cell) return;
    const t = cell.closest('table'), g = grid(t), r0 = +cell.dataset.gr, c0 = +cell.dataset.gc;
    const hasAbove = r0 > 0 && g.slice(0, r0).some(r => !isNaN(num(r[c0]?.textContent || 'x')));
    const res = await dialog({ title: 'Fórmula', width: 340, body: `<label>Fórmula:<input id="fx-f" value="=${hasAbove ? 'SUM(ABOVE)' : 'SUM(LEFT)'}"></label><label>Formato numérico:<select id="fx-n"><option value="">Geral</option><option value="0">0</option><option value="0,00">0,00</option><option value="€">#.##0,00 €</option><option value="%">0%</option></select></label><label>Colar função:<select id="fx-p"><option value="">—</option>${['ABS', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'PRODUCT', 'SUM'].map(f => `<option>${f}</option>`).join('')}</select></label>`, onOpen: ov => { $('#fx-p', ov).onchange = e => { if (e.target.value) $('#fx-f', ov).value = `=${e.target.value}(${hasAbove ? 'ABOVE' : 'LEFT'})`; }; }, buttons: [{ label: 'OK', primary: true, value: ov => ({ f: $('#fx-f', ov).value.trim(), n: $('#fx-n', ov).value }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    const m = /^=\s*(\w+)\s*\(\s*(ABOVE|LEFT|BELOW|RIGHT)\s*\)$/i.exec(res.f);
    let value;
    if (m) {
      const fn = m[1].toUpperCase(), dir = m[2].toUpperCase();
      const vals = [];
      if (dir === 'ABOVE') for (let r = 0; r < r0; r++) vals.push(g[r][c0]);
      if (dir === 'BELOW') for (let r = r0 + 1; r < g.length; r++) vals.push(g[r][c0]);
      if (dir === 'LEFT') for (let c = 0; c < c0; c++) vals.push(g[r0][c]);
      if (dir === 'RIGHT') for (let c = c0 + 1; c < g[r0].length; c++) vals.push(g[r0][c]);
      const nums = [...new Set(vals)].filter(Boolean).map(c => num(c.textContent.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, ''))).filter(v => !isNaN(v));
      value = { SUM: nums.reduce((a, b) => a + b, 0), AVERAGE: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0, COUNT: nums.length, MAX: Math.max(...nums), MIN: Math.min(...nums), PRODUCT: nums.reduce((a, b) => a * b, 1), ABS: Math.abs(nums[0] || 0) }[fn];
    } else {
      const expr = res.f.replace(/^=/, '').replace(/,/g, '.');
      if (!/^[\d+\-*/().\s]+$/.test(expr)) return infoBox('Erro de sintaxe na fórmula.', 'warning');
      value = Function(`"use strict";return (${expr})`)();
    }
    const out = res.n === '€' ? value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : res.n === '%' ? Math.round(value) + '%' : res.n === '0' ? Math.round(value).toLocaleString('pt-PT') : res.n === '0,00' ? value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value.toLocaleString('pt-PT');
    cell.innerHTML = `<span class="wc-formula" data-formula="${esc(res.f)}">${esc(out)}</span>`;
    History.setLabel('Fórmula');
    changed();
  }

  function tblSelect(what) {
    const cell = currentCell();
    if (!cell) return;
    const t = cell.closest('table');
    $$('.cell-sel', t).forEach(c => c.classList.remove('cell-sel'));
    const g = grid(t);
    let cells = [];
    if (what === 'cell') cells = [cell];
    if (what === 'row') cells = [...cell.parentElement.cells];
    if (what === 'col') cells = [...new Set(g.map(r => r[+cell.dataset.gc]).filter(Boolean))];
    if (what === 'table') cells = $$('td,th', t);
    cells.forEach(c => c.classList.add('cell-sel'));
    const r = document.createRange();
    r.setStart(cells[0], 0);
    r.setEnd(cells.at(-1), cells.at(-1).childNodes.length);
    setRange(r);
  }
  editor.addEventListener('mousedown', () => $$('#editor .cell-sel').forEach(c => c.classList.remove('cell-sel')));

  async function tableProps(tab) {
    const t = current(), cell = currentCell();
    if (!t) return;
    const pct = t.style.width.endsWith('%') ? parseFloat(t.style.width) : '';
    const res = await dialog({
      title: 'Propriedades da Tabela',
      width: 420,
      body: tabsUI([
        { id: 't', label: 'Tabela', html: `${fieldset('Tamanho', `<label>Largura preferida:<input type="number" id="tp-w" value="${pct || fmt(t.offsetWidth / CM).replace(',', '.')}" step="0.1"> ${sel('tp-wu', [['pct', 'Percentagem'], ['cm', 'Centímetros']], pct ? 'pct' : 'cm')}</label>`)}${fieldset('Alinhamento', `${sel('tp-al', [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']], t.dataset.align || 'left')}<label>Avanço à esquerda:<input type="number" id="tp-ind" step="0.1" value="${pxToCm(getComputedStyle(t).marginLeft)}"> cm</label>`)}${fieldset('Moldagem do texto', `<label class="fcheck"><input type="radio" name="tp-wrap" value="none"${t.style.float ? '' : ' checked'}> Nenhuma</label><label class="fcheck"><input type="radio" name="tp-wrap" value="around"${t.style.float ? ' checked' : ''}> Em redor</label>`)}` },
        { id: 'l', label: 'Linha', html: `<label>Altura especificada:<input type="number" id="tp-rh" step="0.1" value="${cell ? fmt(cell.parentElement.offsetHeight / CM).replace(',', '.') : ''}"> cm</label>${chk('tp-break', 'Permitir quebra de linha nas páginas', true)}${chk('tp-hdr', 'Repetir como linha de cabeçalho no início de cada página', !!t.tHead)}` },
        { id: 'c', label: 'Coluna', html: `<label>Largura preferida:<input type="number" id="tp-cw" step="0.1" value="${cell ? fmt(cell.offsetWidth / CM).replace(',', '.') : ''}"> cm</label>` },
        { id: 'e', label: 'Célula', html: `<label>Alinhamento vertical:${sel('tp-va', [['top', 'Superior'], ['middle', 'Centro'], ['bottom', 'Inferior']], cell ? getComputedStyle(cell).verticalAlign : 'top')}</label><button class="std" id="tp-cm">Opções...</button>` },
      ]),
      onOpen: ov => { wireTabs(ov, tab); $('#tp-cm', ov).onclick = cellMargins; },
      buttons: [{ label: 'OK', primary: true, value: ov => ({ w: num($('#tp-w', ov).value), wu: $('#tp-wu', ov).value, al: $('#tp-al', ov).value, ind: num($('#tp-ind', ov).value) || 0, wrap: $('input[name=tp-wrap]:checked', ov).value, rh: num($('#tp-rh', ov).value), hdr: $('#tp-hdr', ov).checked, cw: num($('#tp-cw', ov).value), va: $('#tp-va', ov).value }) }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    if (res.w > 0) t.style.width = res.wu === 'pct' ? res.w + '%' : res.w + 'cm';
    t.dataset.align = res.al;
    t.style.marginLeft = res.al === 'center' ? 'auto' : res.al === 'right' ? 'auto' : res.ind + 'cm';
    t.style.marginRight = res.al === 'center' ? 'auto' : res.al === 'right' ? '0' : '';
    t.style.float = res.wrap === 'around' ? 'left' : '';
    if (cell && res.rh > 0) cell.parentElement.style.height = res.rh + 'cm';
    if (cell && res.cw > 0) { const g = grid(t); new Set(g.map(r => r[+cell.dataset.gc]).filter(Boolean)).forEach(c => { c.style.width = res.cw + 'cm'; }); t.style.tableLayout = 'fixed'; }
    if (res.hdr !== !!t.tHead) repeatHeader();
    selectedCells().forEach(c => { c.style.verticalAlign = res.va; });
    History.setLabel('Propriedades da Tabela');
    changed();
  }

  /* desenhar / apagar limites */
  let drawMode = null;
  function setDraw(mode) {
    drawMode = drawMode === mode ? null : mode;
    editor.classList.toggle('draw-borders', drawMode === 'draw');
    editor.classList.toggle('erase-borders', drawMode === 'erase');
    $('#btn-drawborder').classList.toggle('active', drawMode === 'draw');
    $('#btn-erase').classList.toggle('active', drawMode === 'erase');
  }
  editor.addEventListener('mousedown', e => {
    if (!drawMode) return;
    const cell = e.target.closest('td,th');
    if (!cell) return;
    e.preventDefault();
    const r = cell.getBoundingClientRect();
    const d = { top: e.clientY - r.top, bottom: r.bottom - e.clientY, left: e.clientX - r.left, right: r.right - e.clientX };
    const side = Object.entries(d).sort((a, b) => a[1] - b[1])[0][0];
    cell.style['border' + cap(side)] = drawMode === 'erase' ? 'none' : `${$('#draw-border-width').value}pt ${$('#draw-border-style').value} ${$('#draw-border-color').value}`;
    History.setLabel(drawMode === 'erase' ? 'Borracha' : 'Desenhar Limites');
    changed();
  }, true);

  function cellBorder(kind) {
    const cells = selectedCells();
    if (!cells.length) return;
    const line = `${$('#draw-border-width').value}pt ${$('#draw-border-style').value} ${$('#draw-border-color').value}`;
    const t = cells[0].closest('table'), g = grid(t);
    let r1 = Infinity, c1 = Infinity, r2 = -1, c2 = -1;
    cells.forEach(c => { r1 = Math.min(r1, +c.dataset.gr); c1 = Math.min(c1, +c.dataset.gc); r2 = Math.max(r2, +c.dataset.gr + c.rowSpan - 1); c2 = Math.max(c2, +c.dataset.gc + c.colSpan - 1); });
    void g;
    cells.forEach(c => {
      const s = c.style, r = +c.dataset.gr, k = +c.dataset.gc, edge = { top: r === r1, bottom: r + c.rowSpan - 1 === r2, left: k === c1, right: k + c.colSpan - 1 === c2 };
      ['top', 'bottom', 'left', 'right'].forEach(side => {
        const prop = 'border' + cap(side);
        if (kind === 'none') s[prop] = 'none';
        else if (kind === 'all') s[prop] = line;
        else if (kind === 'outside') { if (edge[side]) s[prop] = line; }
        else if (kind === 'inside') { if (!edge[side]) s[prop] = line; }
        else if (kind === side && edge[side]) s[prop] = line;
      });
    });
    changed();
  }

  /* campos de tamanho */
  $('#cell-h').addEventListener('change', e => { const c = currentCell(), v = num(e.target.value); if (c && v > 0) { c.parentElement.style.height = v + 'cm'; changed(); } });
  $('#cell-w').addEventListener('change', e => { const c = currentCell(), v = num(e.target.value); if (!c || !(v > 0)) return; const t = c.closest('table'), g = grid(t); new Set(g.map(r => r[+c.dataset.gc]).filter(Boolean)).forEach(x => { x.style.width = v + 'cm'; }); t.style.tableLayout = 'fixed'; changed(); });

  /* sombreado de células */
  let lastCellShade = '#ffff00';
  DD_HOOKS['dd-cellshading'] = dd => {
    if (dd.dataset.built) return;
    dd.innerHTML = $('#dd-shading').innerHTML.replaceAll('data-cmd="shading"', 'data-cmd="cellShading"');
    dd.dataset.built = '1';
  };

  Object.assign(CMD, {
    tableStyle: v => { const t = current(); if (!t) return; applyStyleClass(t, v); History.setLabel('Estilo de Tabela'); changed(); sync(); },
    tableOpSel: opSel, mergeCells: merge, splitCells: splitCellsDialog, splitTable, autofit, distribute, cellAlign, textDirection, cellMargins,
    tableSort: sortTable, repeatHeader, tableToText: toText, formula, tblSelect, tableProps: () => tableProps(), insertCellsDialog,
    tableGridlines: () => { page.classList.toggle('show-tblgrid'); $('#btn-tblgrid').classList.toggle('active', page.classList.contains('show-tblgrid')); },
    drawBorders: () => setDraw('draw'), eraseBorders: () => setDraw('erase'), cellBorder,
    cellShading: c => { if (c === 'custom') return pickColor('cellShading'); if (c) { lastCellShade = c; $('#bar-cellshading').style.background = c; } selectedCells().forEach(x => { x.style.backgroundColor = c || ''; }); changed(); },
    cellShadingLast: () => CMD.cellShading(lastCellShade),
  });

  return { current, currentCell, selectedCells, sync, applyStyleClass, buildGalleries, grid };
})();

/* =========================================================
   Ferramentas de Imagem
   ========================================================= */
const ImageTools = (() => {
  const img = () => selImg;
  const orig = i => { if (!i.dataset.orig) i.dataset.orig = i.getAttribute('src'); return i.dataset.orig; };

  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }

  async function rebuild(i, extra = {}) {
    const src = orig(i);
    const f = i.dataset;
    const filters = [];
    if (+f.bright) filters.push(`brightness(${1 + f.bright / 100})`);
    if (+f.contrast) filters.push(`contrast(${1 + f.contrast / 100})`);
    const rc = { grayscale: 'grayscale(1)', sepia: 'sepia(1)', washout: 'brightness(1.45) contrast(0.45) saturate(0.4)', bw: 'grayscale(1) contrast(12)', blue: 'grayscale(1) sepia(1) hue-rotate(180deg) saturate(2.5)', invert: 'invert(1)' }[f.recolor];
    if (rc) filters.push(rc);
    const crop = f.crop ? f.crop.split(',').map(Number) : [0, 0, 0, 0];
    const im = await loadImage(src);
    const sx = im.naturalWidth * crop[2] / 100, sy = im.naturalHeight * crop[0] / 100;
    const sw = im.naturalWidth * (1 - (crop[2] + crop[3]) / 100), sh = im.naturalHeight * (1 - (crop[0] + crop[1]) / 100);
    const scale = extra.maxW ? Math.min(1, extra.maxW / sw) : 1;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw * scale));
    c.height = Math.max(1, Math.round(sh * scale));
    const ctx = c.getContext('2d');
    ctx.filter = filters.join(' ') || 'none';
    ctx.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const isPng = /^data:image\/png/.test(src) && !extra.jpeg;
    i.src = c.toDataURL(isPng ? 'image/png' : 'image/jpeg', extra.quality || 0.92);
    if (extra.keepOrig === false) i.dataset.orig = i.src;
    positionImgBox();
  }

  const STYLES = {
    simple: { border: '6px solid #fff', boxShadow: '0 0 0 1px #ccc, 2px 3px 6px rgba(0,0,0,.35)', borderRadius: '', transform: '' },
    shadow: { border: 'none', boxShadow: '5px 5px 6px rgba(0,0,0,.45)', borderRadius: '', transform: '' },
    rounded: { border: 'none', boxShadow: '0 4px 8px rgba(0,0,0,.35)', borderRadius: '14px', transform: '' },
    black: { border: '5px double #000', boxShadow: '', borderRadius: '', transform: '' },
    tilt: { border: '6px solid #fff', boxShadow: '2px 4px 8px rgba(0,0,0,.45)', borderRadius: '', transform: 'rotate(-3deg)' },
    oval: { border: '4px solid #fff', boxShadow: '0 3px 8px rgba(0,0,0,.4)', borderRadius: '50%', transform: '' },
    metal: { border: '6px solid #b8b8b8', boxShadow: 'inset 0 0 4px #fff, 0 2px 4px rgba(0,0,0,.4)', borderRadius: '6px', transform: '' },
    reflect: { border: 'none', boxShadow: '', borderRadius: '6px', transform: '', webkitBoxReflect: 'below 2px linear-gradient(transparent 55%, rgba(255,255,255,.35))' },
    soft: { border: 'none', boxShadow: '0 0 12px 6px #fff inset', borderRadius: '10px', transform: '' },
    thick: { border: '10px solid #3b3b3b', boxShadow: '0 3px 6px rgba(0,0,0,.4)', borderRadius: '', transform: '' },
  };
  const NAMES = { simple: 'Moldura Simples, Branca', shadow: 'Rectângulo com Sombra Projectada', rounded: 'Rectângulo Arredondado', black: 'Moldura Dupla, Preta', tilt: 'Rodar, Branco', oval: 'Oval, Branco', metal: 'Moldura Metálica', reflect: 'Rectângulo Arredondado Reflectido', soft: 'Rectângulo com Margens Suaves', thick: 'Moldura Mate Espessa, Preta' };

  function applyStyle(i, key) {
    const s = STYLES[key];
    if (!s) return;
    Object.assign(i.style, { webkitBoxReflect: '', ...s });
    i.dataset.picstyle = key;
  }

  function buildGalleries() {
    const thumb = k => `<button class="picstyle-item" data-cmd="picStyle" data-arg="${k}" data-tip="${NAMES[k]}"><span class="ps-thumb" style="${Object.entries(STYLES[k]).map(([p, v]) => v ? `${p.replace(/[A-Z]/g, m => '-' + m.toLowerCase()).replace('webkit', '-webkit')}:${String(v).replace(/(\d+)px/g, (m, n) => Math.max(1, Math.round(n / 2)) + 'px')}` : '').filter(Boolean).join(';')}"></span></button>`;
    $('#pic-style-gallery').innerHTML = Object.keys(STYLES).map(thumb).join('');
    $('#dd-picstyles').innerHTML = `<div class="pic-grid-dd">${Object.keys(STYLES).map(thumb).join('')}</div>`;
  }

  function sync() {
    const i = img();
    if (!i) return;
    const set = (id, v) => { const el = $('#' + id); if (el && document.activeElement !== el) el.value = v; };
    set('img-w', fmt(i.offsetWidth / CM));
    set('img-h', fmt(i.offsetHeight / CM));
  }

  $('#img-w').addEventListener('change', e => { const i = img(), v = num(e.target.value); if (i && v > 0) { i.style.width = v * CM + 'px'; i.style.height = 'auto'; positionImgBox(); changed(); sync(); } });
  $('#img-h').addEventListener('change', e => { const i = img(), v = num(e.target.value); if (i && v > 0) { const ratio = i.offsetWidth / i.offsetHeight; i.style.width = v * CM * ratio + 'px'; i.style.height = 'auto'; positionImgBox(); changed(); sync(); } });

  function setRotate(i) {
    const r = +i.dataset.rotate || 0, fh = i.dataset.flipH === '1' ? -1 : 1, fv = i.dataset.flipV === '1' ? -1 : 1;
    const base = (STYLES[i.dataset.picstyle]?.transform || '').replace(/rotate\([^)]*\)/, '');
    i.style.transform = `${base} rotate(${r}deg) scale(${fh}, ${fv})`.trim();
    if (!r && fh === 1 && fv === 1 && !base) i.style.transform = '';
    positionImgBox();
  }

  async function wrap(mode) {
    const i = img() || ctxTarget;
    if (!i || i.tagName !== 'IMG') return;
    const s = i.style;
    const er = editor.getBoundingClientRect(), ir = i.getBoundingClientRect(), z = zoom / 100;
    Object.assign(s, { float: '', margin: '', display: '', position: '', left: '', top: '', zIndex: '' });
    if (mode === 'left' || mode === 'right') Object.assign(s, { float: mode, margin: mode === 'left' ? '0 9pt 6pt 0' : '0 0 6pt 9pt' });
    else if (mode === 'topbottom') Object.assign(s, { display: 'block', margin: '6pt auto' });
    else if (mode === 'behind' || mode === 'front') Object.assign(s, { position: 'absolute', left: (ir.left - er.left) / z + 'px', top: (ir.top - er.top) / z + 'px', zIndex: mode === 'behind' ? '-1' : '5' });
    i.dataset.wrap = mode;
    positionImgBox();
    History.setLabel('Moldar Texto');
    changed();
  }

  /* arrastar imagens com posicionamento absoluto */
  editor.addEventListener('mousedown', e => {
    const i = e.target;
    if (i.tagName !== 'IMG' || i.style.position !== 'absolute') return;
    e.preventDefault();
    selectImage(i);
    const sx = e.clientX, sy = e.clientY, l = parseFloat(i.style.left) || 0, t = parseFloat(i.style.top) || 0, z = zoom / 100;
    const move = ev => { i.style.left = l + (ev.clientX - sx) / z + 'px'; i.style.top = t + (ev.clientY - sy) / z + 'px'; positionImgBox(); };
    const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); changed(); };
    addEventListener('mousemove', move);
    addEventListener('mouseup', up);
  });

  /* pega de rotação */
  $('#img-box').addEventListener('mousedown', e => {
    if (e.target.dataset.h !== 'rot' || !selImg) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const i = selImg, r = i.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const move = ev => { let a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90; if (ev.shiftKey) a = Math.round(a / 15) * 15; i.dataset.rotate = Math.round(a); setRotate(i); };
    const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); changed(); };
    addEventListener('mousemove', move);
    addEventListener('mouseup', up);
  }, true);

  async function cropDialog() {
    const i = img();
    if (!i) return infoBox('Seleccione uma imagem.');
    const c = (i.dataset.crop || '0,0,0,0').split(',');
    const res = await dialog({ title: 'Recortar', width: 300, body: `<div class="two"><label>Superior:<input type="number" id="cr-t" value="${c[0]}" min="0" max="90"> %</label><label>Inferior:<input type="number" id="cr-b" value="${c[1]}" min="0" max="90"> %</label><label>Esquerda:<input type="number" id="cr-l" value="${c[2]}" min="0" max="90"> %</label><label>Direita:<input type="number" id="cr-r" value="${c[3]}" min="0" max="90"> %</label></div>`, buttons: [{ label: 'OK', primary: true, value: ov => ['t', 'b', 'l', 'r'].map(k => Math.max(0, Math.min(90, +$('#cr-' + k, ov).value || 0))) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    if (res[0] + res[1] >= 95 || res[2] + res[3] >= 95) return;
    const w = i.offsetWidth;
    const prev = (i.dataset.crop || '0,0,0,0').split(',').map(Number);
    i.dataset.crop = res.join(',');
    await rebuild(i);
    i.style.width = w * (1 - (res[2] + res[3]) / 100) / (1 - (prev[2] + prev[3]) / 100) + 'px';
    History.setLabel('Recortar');
    changed();
  }

  async function sizeDialog() {
    const i = img();
    if (!i) return;
    const res = await dialog({ title: 'Tamanho', width: 320, body: `<div class="two"><label>Altura:<input type="number" id="sz-h" step="0.1" value="${fmt(i.offsetHeight / CM).replace(',', '.')}"> cm</label><label>Largura:<input type="number" id="sz-w" step="0.1" value="${fmt(i.offsetWidth / CM).replace(',', '.')}"> cm</label><label>Rotação:<input type="number" id="sz-r" value="${i.dataset.rotate || 0}"> °</label><label>Escala:<input type="number" id="sz-s" value="100"> %</label></div>${chk('sz-lock', 'Bloquear proporção', true)}<p><small>Tamanho original: ${i.naturalWidth} x ${i.naturalHeight} px</small></p>`, buttons: [{ label: 'Repor', value: 'reset' }, { label: 'Fechar', primary: true, value: ov => ({ h: num($('#sz-h', ov).value), w: num($('#sz-w', ov).value), r: +$('#sz-r', ov).value || 0, s: +$('#sz-s', ov).value || 100, lock: $('#sz-lock', ov).checked }) }] });
    if (!res) return;
    if (res === 'reset') { i.style.width = Math.min(i.naturalWidth, editor.clientWidth) + 'px'; i.style.height = 'auto'; i.dataset.rotate = 0; setRotate(i); return changed(); }
    i.style.width = res.w * CM * res.s / 100 + 'px';
    i.style.height = res.lock ? 'auto' : res.h * CM * res.s / 100 + 'px';
    i.dataset.rotate = res.r;
    setRotate(i);
    changed();
    sync();
  }

  async function compressImages() {
    const all = $$('img', editor);
    if (!all.length) return infoBox('O documento não contém imagens.');
    const res = await dialog({ title: 'Comprimir Imagens', width: 360, body: `${chk('cp-sel', 'Aplicar apenas às imagens seleccionadas', !!img())}<label>Destino:<select id="cp-q"><option value="1.5">Impressão (220 ppp)</option><option value="1" selected>Ecrã (150 ppp)</option><option value="0.7">Correio electrónico (96 ppp)</option></select></label>${chk('cp-crop', 'Eliminar áreas recortadas das imagens', true)}`, buttons: [{ label: 'OK', primary: true, value: ov => ({ sel: $('#cp-sel', ov).checked, q: +$('#cp-q', ov).value }) }, { label: 'Cancelar', value: null }] });
    if (!res) return;
    const list = res.sel && img() ? [img()] : all;
    let before = 0, after = 0;
    for (const i of list) {
      before += i.src.length;
      await rebuild(i, { maxW: i.offsetWidth * 2 * res.q, jpeg: !/^data:image\/png/.test(i.src), quality: 0.8, keepOrig: false });
      after += i.src.length;
    }
    History.setLabel('Comprimir Imagens');
    changed();
    infoBox(`${list.length} imagem(ns) comprimida(s): ${(before / 1365).toFixed(0)} KB → ${(after / 1365).toFixed(0)} KB.`);
  }

  async function changeImage() {
    const i = img();
    if (!i) return;
    const f = await pickAux('image/*');
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { const w = i.offsetWidth; i.src = reader.result; i.dataset.orig = reader.result; ['bright', 'contrast', 'recolor', 'crop'].forEach(k => delete i.dataset[k]); i.style.width = w + 'px'; changed(); positionImgBox(); };
    reader.readAsDataURL(f);
  }

  async function resetImage() {
    const i = img();
    if (!i) return;
    if (i.dataset.orig) i.src = i.dataset.orig;
    ['bright', 'contrast', 'recolor', 'crop', 'rotate', 'flipH', 'flipV', 'picstyle'].forEach(k => delete i.dataset[k]);
    ['border', 'boxShadow', 'borderRadius', 'transform', 'webkitBoxReflect', 'clipPath', 'filter', 'maskImage', 'outline'].forEach(k => { i.style[k] = ''; });
    History.setLabel('Repor Imagem');
    changed();
    positionImgBox();
  }

  DD_HOOKS['dd-picborder'] = dd => {
    if (dd.dataset.built) return;
    dd.innerHTML = $('#dd-forecolor').innerHTML.replaceAll('data-cmd="foreColor"', 'data-cmd="picBorder"').replace('Automático', 'Sem Contorno').replace('data-arg="#000000"', 'data-arg=""') +
      '<div class="dd-sep"></div><div class="dd-title">Espessura</div>' + [0.75, 1.5, 2.25, 3, 4.5, 6].map(w => `<button class="dd-item" data-cmd="picBorderWidth" data-arg="${w}"><span style="display:inline-block;width:60px;border-top:${w}pt solid #000;margin-right:8px"></span>${fmt(w)} pt</button>`).join('');
    dd.dataset.built = '1';
  };

  Object.assign(CMD, {
    picStyle: k => { const i = img(); if (i) { applyStyle(i, k); positionImgBox(); History.setLabel('Estilo de Imagem'); changed(); } },
    picShape: k => { const i = img(); if (!i) return; i.style.borderRadius = { rect: '', round: '14px', ellipse: '50%' }[k] ?? ''; i.style.clipPath = { diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', hexagon: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' }[k] || ''; changed(); },
    picBorder: c => { const i = img(); if (!i) return; if (c === 'custom') return pickColor('picBorder'); i.style.border = c ? `${i.dataset.bw || 1.5}pt solid ${c}` : 'none'; changed(); },
    picBorderWidth: w => { const i = img(); if (!i) return; i.dataset.bw = w; i.style.borderWidth = w + 'pt'; if (!i.style.borderStyle || i.style.borderStyle === 'none') i.style.border = `${w}pt solid #000`; changed(); },
    picEffect: k => { const i = img(); if (!i) return; const st = i.style; ({ none: () => { st.boxShadow = st.webkitBoxReflect = st.maskImage = ''; if (!i.dataset.rotate) st.transform = ''; }, shadow: () => { st.boxShadow = '4px 4px 6px rgba(0,0,0,.45)'; }, reflection: () => { st.webkitBoxReflect = 'below 2px linear-gradient(transparent 55%, rgba(255,255,255,.4))'; }, glow: () => { st.boxShadow = `0 0 10px 4px ${DocStyles.theme().accents[0]}`; }, soft: () => { st.maskImage = 'radial-gradient(ellipse at center, #000 60%, transparent 100%)'; }, '3d': () => { st.transform = 'perspective(400px) rotateY(18deg)'; } })[k]?.(); positionImgBox(); changed(); },
    imgAdjust: v => { const i = img(); if (!i) return; const [k, n] = v.split(':'); i.dataset[k === 'brightness' ? 'bright' : 'contrast'] = n; rebuild(i).then(() => changed()); },
    imgRecolor: v => { const i = img(); if (!i) return; if (v === 'none') delete i.dataset.recolor; else i.dataset.recolor = v; rebuild(i).then(() => changed()); },
    compressImages, changeImage, resetImage, crop: cropDialog, imageSize: sizeDialog,
    imgPosition: p => { if (p === 'center') { const i = img(); if (!i) return; Object.assign(i.style, { float: '', display: 'block', margin: '0 auto 6pt', position: '' }); positionImgBox(); return changed(); } wrap(p); },
    imgWrap: wrap,
    imgAlign: a => { const i = img(); if (!i) return; if (i.style.position === 'absolute') { i.style.left = a === 'left' ? '0' : a === 'right' ? editor.clientWidth - i.offsetWidth + 'px' : (editor.clientWidth - i.offsetWidth) / 2 + 'px'; } else if (i.style.float) i.style.float = a === 'center' ? '' : a; else { const b = blockOf(i); if (b) b.style.textAlign = a; } positionImgBox(); changed(); },
    imgRotate: v => { const i = img(); if (!i) return; if (v === 'flipH') i.dataset.flipH = i.dataset.flipH === '1' ? '0' : '1'; else if (v === 'flipV') i.dataset.flipV = i.dataset.flipV === '1' ? '0' : '1'; else if (v === '0') { i.dataset.rotate = 0; i.dataset.flipH = i.dataset.flipV = '0'; } else i.dataset.rotate = ((+i.dataset.rotate || 0) + +v + 360) % 360; setRotate(i); changed(); },
    zOrder: d => { const i = img(); if (!i) return; if (i.style.position !== 'absolute') { wrap(d === 'front' ? 'front' : 'behind'); return; } i.style.zIndex = d === 'front' ? String((+i.style.zIndex || 0) + 1) : String((+i.style.zIndex || 0) - 1); changed(); },
  });

  return { applyStyle, buildGalleries, sync };
})();

function pickAux(accept) {
  return new Promise(resolve => {
    const inp = $('#aux-input');
    inp.accept = accept;
    inp.value = '';
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.oncancel = () => resolve(null);
    inp.click();
  });
}
window.TableTools = TableTools;
window.ImageTools = ImageTools;
