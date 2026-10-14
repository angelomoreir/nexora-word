'use strict';
/* =========================================================
   .docx nativo (Office Open XML / WordprocessingML)
   Escrita: parágrafos, estilos, runs, listas (numbering.xml),
   tabelas (gridSpan/vMerge), imagens, hiperligações, marcadores,
   campos, tabulações, quebras, cabeçalhos/rodapés (1.ª página),
   comentários, notas de rodapé/fim, revisões (w:ins/w:del),
   propriedades, cor/limites de página, colunas, números de linha.
   Leitura: o inverso, sem bibliotecas externas.
   ========================================================= */
const DocxIO = (() => {
  const NS = {
    w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
    pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    v: 'urn:schemas-microsoft-com:vml',
    o: 'urn:schemas-microsoft-com:office:office',
    m: 'http://schemas.openxmlformats.org/officeDocument/2006/math',
  };
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const ROOT_NS = Object.entries(NS).map(([k, v]) => `xmlns:${k}="${v}"`).join(' ');

  const x = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const hex = c => {
    if (!c) return null;
    if (c.startsWith('#')) return c.slice(1, 7).toUpperCase().padStart(6, '0');
    const m = c.match(/\d+(\.\d+)?/g);
    if (!m || (m.length > 3 && +m[3] === 0)) return null;
    return m.slice(0, 3).map(v => Math.round(+v).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const px2tw = px => Math.round(px * 15);
  const isTransparent = c => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);

  /* =========================================================
     ESCRITA
     ========================================================= */
  async function write() {
    const ctx = {
      rels: [], media: [], nums: [], abstracts: new Map(), comments: [], footnotes: [], endnotes: [],
      revId: 1, bmId: 1, docPrId: 1, probes: new Map(), headers: [],
    };
    const addRel = (type, target, ext) => {
      const id = 'rId' + (ctx.rels.length + 10);
      ctx.rels.push({ id, type, target, ext });
      return id;
    };
    ctx.addRel = addRel;

    // contentor de amostras para conhecer o estilo-base de cada parágrafo
    const probeBox = document.createElement('div');
    probeBox.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;width:500px';
    editor.append(probeBox);
    ctx.probe = key => {
      if (ctx.probes.has(key)) return ctx.probes.get(key);
      const m = DocStyles.metaOf(key);
      const el = document.createElement(m.tag || 'p');
      if (m.cls) el.className = m.cls;
      el.textContent = 'x';
      probeBox.append(el);
      const cs = getComputedStyle(el);
      const snap = { fontFamily: cs.fontFamily, fontSize: cs.fontSize, color: cs.color, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, textAlign: cs.textAlign, marginTop: cs.marginTop, marginBottom: cs.marginBottom, marginLeft: cs.marginLeft, marginRight: cs.marginRight, lineHeight: cs.lineHeight, textIndent: cs.textIndent, fontVariant: cs.fontVariantCaps, letterSpacing: cs.letterSpacing };
      ctx.probes.set(key, snap);
      return snap;
    };

    let body;
    try {
      Pager.clearPushes();
      body = await containerXml(editor, ctx, { skip: el => el === probeBox || el.matches('.footnotes, .endnotes') });
      // cabeçalhos e rodapés
      const hf = async (html, kind, type) => {
        if (!html || !html.replace(/<br>/g, '').trim()) return '';
        const tmp = document.createElement('div');
        tmp.className = 'hf';
        tmp.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;display:block;width:500px';
        tmp.innerHTML = html;
        editor.append(tmp);
        const inner = await containerXml(tmp, ctx, {});
        tmp.remove();
        const n = ctx.headers.length + 1;
        const file = `${kind}${n}.xml`;
        ctx.headers.push({ file, kind, xml: `${XML}<w:${kind === 'header' ? 'hdr' : 'ftr'} ${ROOT_NS}>${inner || '<w:p/>'}</w:${kind === 'header' ? 'hdr' : 'ftr'}>` });
        const id = addRel(`${REL}/${kind}`, file);
        return `<w:${kind}Reference w:type="${type}" r:id="${id}"/>`;
      };
      ctx.hfRefs = (await hf(header.innerHTML, 'header', 'default')) + (settings.differentFirst ? await hf(settings.firstHeader || '<p></p>', 'header', 'first') : '');
      ctx.ftRefs = (await hf(footer.innerHTML, 'footer', 'default')) + (settings.differentFirst ? await hf(settings.firstFooter || '<p></p>', 'footer', 'first') : '');
    } finally {
      probeBox.remove();
      Pager.schedule(0);
    }

    const files = [];
    const add = (name, data) => files.push({ name, data });
    add('word/document.xml', `${XML}<w:document ${ROOT_NS}>${settings.pageColor ? `<w:background w:color="${hex(settings.pageColor)}"/>` : ''}<w:body>${body}${sectPr(ctx)}</w:body></w:document>`);
    add('word/styles.xml', stylesXml());
    add('word/numbering.xml', numberingXml(ctx));
    add('word/settings.xml', settingsXml());
    add('word/footnotes.xml', notesXml('footnote', ctx.footnotes));
    add('word/endnotes.xml', notesXml('endnote', ctx.endnotes));
    add('word/comments.xml', `${XML}<w:comments ${ROOT_NS}>${ctx.comments.join('')}</w:comments>`);
    add('word/fontTable.xml', `${XML}<w:fonts ${ROOT_NS}>${[...new Set([DocStyles.theme().major, DocStyles.theme().minor, 'Calibri', 'Cambria', 'Times New Roman'])].map(f => `<w:font w:name="${x(f)}"/>`).join('')}</w:fonts>`);
    ctx.headers.forEach(h => add('word/' + h.file, h.xml));
    ctx.media.forEach(m => add('word/media/' + m.name, m.data));

    const fixed = [
      ['rId1', 'styles', 'styles.xml'], ['rId2', 'numbering', 'numbering.xml'], ['rId3', 'settings', 'settings.xml'],
      ['rId4', 'footnotes', 'footnotes.xml'], ['rId5', 'endnotes', 'endnotes.xml'], ['rId6', 'comments', 'comments.xml'], ['rId7', 'fontTable', 'fontTable.xml'],
    ];
    add('word/_rels/document.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fixed.map(([id, t, f]) => `<Relationship Id="${id}" Type="${REL}/${t}" Target="${f}"/>`).join('')}${ctx.rels.map(r => `<Relationship Id="${r.id}" Type="${r.type}" Target="${x(r.target)}"${r.ext ? ' TargetMode="External"' : ''}/>`).join('')}</Relationships>`);
    const p = settings.props || {}, now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    add('docProps/core.xml', `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(p.title || '')}</dc:title><dc:subject>${x(p.subject || '')}</dc:subject><dc:creator>${x(p.author || prefs.user)}</dc:creator><cp:keywords>${x(p.keywords || '')}</cp:keywords><dc:description>${x(p.comments || '')}</dc:description><cp:lastModifiedBy>${x(prefs.user)}</cp:lastModifiedBy><cp:category>${x(p.category || '')}</cp:category><dcterms:created xsi:type="dcterms:W3CDTF">${p.created || now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
    const stats = docStats();
    add('docProps/app.xml', `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Nexora Word</Application><AppVersion>12.0000</AppVersion><Pages>${stats.pages}</Pages><Words>${stats.words}</Words><Characters>${stats.charsNoSpace}</Characters><Company>${x(p.company || '')}</Company></Properties>`);
    add('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>`);
    const ov = (part, type) => `<Override PartName="/${part}" ContentType="${type}"/>`;
    add('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="bmp" ContentType="image/bmp"/>${ov('word/document.xml', CT + '.document.main+xml')}${ov('word/styles.xml', CT + '.styles+xml')}${ov('word/numbering.xml', CT + '.numbering+xml')}${ov('word/settings.xml', CT + '.settings+xml')}${ov('word/footnotes.xml', CT + '.footnotes+xml')}${ov('word/endnotes.xml', CT + '.endnotes+xml')}${ov('word/comments.xml', CT + '.comments+xml')}${ov('word/fontTable.xml', CT + '.fontTable+xml')}${ctx.headers.map(h => ov('word/' + h.file, `${CT}.${h.kind}+xml`)).join('')}${ov('docProps/core.xml', 'application/vnd.openxmlformats-package.core-properties+xml')}${ov('docProps/app.xml', 'application/vnd.openxmlformats-officedocument.extended-properties+xml')}</Types>`);
    files.unshift(files.pop());
    return ZIP.create(files, FORMATS.docx.mime);
  }

  /* ---------- Estrutura de blocos ---------- */
  const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'TABLE', 'DIV', 'HR', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'FIGURE', 'FIGCAPTION', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'DL', 'DT', 'DD', 'ADDRESS']);
  const isBlock = n => n.nodeType === 1 && BLOCK_TAGS.has(n.tagName);

  async function containerXml(el, ctx, opts, list = null) {
    let out = '', pending = [];
    const flush = async () => {
      if (pending.some(n => n.nodeType === 1 || n.nodeValue.trim())) out += await paraXml(el, ctx, pending, null);
      pending = [];
    };
    for (const n of [...el.childNodes]) {
      if (n.nodeType === 8) continue;
      if (n.nodeType === 1 && opts.skip?.(n)) continue;
      if (n.nodeType === 1 && getComputedStyle(n).display === 'none' && !n.classList.contains('hidden-text')) continue;
      if (!isBlock(n)) { pending.push(n); continue; }
      await flush();
      out += await blockXml(n, ctx, opts, list);
    }
    await flush();
    return out;
  }

  async function blockXml(n, ctx, opts, list) {
    const t = n.tagName;
    if (t === 'HR') {
      if (n.matches('.page-break, .section-break')) return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      if (n.matches('.col-break')) return '<w:p><w:r><w:br w:type="column"/></w:r></w:p>';
      if (n.matches('.section-cont')) return '';
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="A0A0A0"/></w:pBdr></w:pPr></w:p>';
    }
    if (t === 'UL' || t === 'OL') {
      const level = list ? list.level + 1 : 0;
      const top = list ? list.top : n;
      let numId = list?.numId;
      if (!list || level === 0) numId = numFor(n, ctx);
      let out = '';
      for (const li of n.children) out += await liXml(li, ctx, opts, { level, numId, top });
      return out;
    }
    if (t === 'TABLE') return tableXml(n, ctx, opts);
    if (t === 'LI') return liXml(n, ctx, opts, list || { level: 0, numId: numFor(n.parentElement, ctx), top: n.parentElement });
    if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'DT', 'DD', 'FIGCAPTION', 'ADDRESS'].includes(t) && ![...n.children].some(isBlock)) return paraXml(n, ctx, [...n.childNodes], null);
    return containerXml(n, ctx, opts, list);
  }

  async function liXml(li, ctx, opts, list) {
    const inline = [], after = [];
    for (const c of li.childNodes) (c.nodeType === 1 && isBlock(c) ? after : inline).push(c);
    let out = '';
    const firstBlock = after.find(c => c.tagName === 'P');
    if (inline.some(n => n.nodeType === 1 || n.nodeValue.trim()) || !firstBlock) out += await paraXml(li, ctx, inline, list);
    for (const c of after) {
      if (c.tagName === 'UL' || c.tagName === 'OL') out += await blockXml(c, ctx, opts, list);
      else if (c === firstBlock && !inline.some(n => n.nodeType === 1 || n.nodeValue.trim())) out += await paraXml(c, ctx, [...c.childNodes], list);
      else out += await blockXml(c, ctx, opts, null);
    }
    return out;
  }

  /* ---------- Numeração ---------- */
  const FMT = { disc: 'bullet', circle: 'bullet', square: 'bullet', none: 'none', decimal: 'decimal', 'lower-alpha': 'lowerLetter', 'upper-alpha': 'upperLetter', 'lower-latin': 'lowerLetter', 'upper-latin': 'upperLetter', 'lower-roman': 'lowerRoman', 'upper-roman': 'upperRoman' };
  function numFor(list, ctx) {
    const cs = getComputedStyle(list);
    const kind = list.classList.contains('ml-legal') ? 'legal' : list.classList.contains('ml-outline') ? 'outline' : list.tagName === 'UL' ? `bullet:${cs.listStyleType}` : `num:${cs.listStyleType}`;
    if (!ctx.abstracts.has(kind)) ctx.abstracts.set(kind, ctx.abstracts.size);
    const numId = ctx.nums.length + 1;
    ctx.nums.push({ numId, abs: ctx.abstracts.get(kind), start: list.getAttribute('start') });
    return numId;
  }

  function numberingXml(ctx) {
    const bullets = ['•', 'o', '▪'];
    const lvls = kind => Array.from({ length: 9 }, (_, i) => {
      let fmt = 'decimal', text = `%${i + 1}.`, font = '';
      if (kind.startsWith('bullet')) {
        const st = kind.split(':')[1];
        fmt = st === 'none' ? 'none' : 'bullet';
        text = st === 'none' ? '' : i === 0 ? ({ disc: '•', circle: 'o', square: '▪' }[st] || '•') : bullets[i % 3];
        font = text === 'o' ? '<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr>' : '';
      } else if (kind === 'legal') {
        text = Array.from({ length: i + 1 }, (_, k) => `%${k + 1}`).join('.') + '.';
      } else if (kind === 'outline') {
        fmt = ['decimal', 'lowerLetter', 'lowerRoman'][i % 3];
        text = `%${i + 1})`;
      } else {
        const st = kind.split(':')[1];
        fmt = i === 0 ? (FMT[st] || 'decimal') : ['lowerLetter', 'lowerRoman', 'decimal'][(i - 1) % 3];
        if (fmt === 'none') text = '';
        if (fmt === 'lowerLetter' && i === 0) text = '%1)';
      }
      return `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${x(text)}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr>${font}</w:lvl>`;
    }).join('');
    const abs = [...ctx.abstracts.entries()].map(([kind, id]) => `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="${kind === 'legal' || kind === 'outline' ? 'multilevel' : 'hybridMultilevel'}"/>${lvls(kind)}</w:abstractNum>`).join('');
    const nums = ctx.nums.map(n => `<w:num w:numId="${n.numId}"><w:abstractNumId w:val="${n.abs}"/>${n.start ? `<w:lvlOverride w:ilvl="0"><w:startOverride w:val="${+n.start}"/></w:lvlOverride>` : ''}</w:num>`).join('');
    return `${XML}<w:numbering ${ROOT_NS}>${abs}${nums}</w:numbering>`;
  }

  /* ---------- Parágrafos ---------- */
  async function paraXml(block, ctx, nodes, list) {
    const styleKey = list ? 'listpara' : block.matches?.('p, h1, h2, h3, h4') ? DocStyles.keyOfBlock(block) : 'normal';
    const base = ctx.probe(styleKey === 'listpara' && !list ? 'listpara' : styleKey);
    const cs = getComputedStyle(block);
    const isPara = block.matches?.('p, h1, h2, h3, h4, h5, h6, li, pre, dt, dd');
    let ppr = '';
    if (styleKey !== 'normal') ppr += `<w:pStyle w:val="${DocStyles.metaOf(styleKey).id}"/>`;
    if (block.dataset?.keepNext === '1') ppr += '<w:keepNext/>';
    if (block.dataset?.keepLines === '1') ppr += '<w:keepLines/>';
    if (block.dataset?.pbBefore === '1') ppr += '<w:pageBreakBefore/>';
    if (list) ppr += `<w:numPr><w:ilvl w:val="${list.level}"/><w:numId w:val="${list.numId}"/></w:numPr>`;
    if (isPara) {
      const bdr = ['top', 'left', 'bottom', 'right'].map(side => {
        const st = block.style[`border${cap(side)}Style`];
        if (!st || st === 'none') return '';
        const w = parseFloat(cs[`border${cap(side)}Width`]) || 1;
        const val = { solid: 'single', double: 'double', dotted: 'dotted', dashed: 'dashed' }[cs[`border${cap(side)}Style`]] || 'single';
        return `<w:${side} w:val="${val}" w:sz="${Math.max(2, Math.round(w * 0.75 * 8))}" w:space="1" w:color="${hex(cs[`border${cap(side)}Color`]) || '000000'}"/>`;
      }).join('');
      if (bdr) ppr += `<w:pBdr>${bdr}</w:pBdr>`;
      if (block.style.backgroundColor && !isTransparent(cs.backgroundColor)) ppr += `<w:shd w:val="clear" w:color="auto" w:fill="${hex(cs.backgroundColor)}"/>`;
      if (block.dataset?.tabs) {
        const tabs = block.dataset.tabs.split(',').filter(Boolean).map(t => { const [k, v] = t.includes(':') ? t.split(':') : ['L', t]; return `<w:tab w:val="${{ L: 'left', R: 'right', C: 'center' }[k] || 'left'}" w:pos="${Math.round(num(v) / 2.54 * 1440)}"/>`; }).join('');
        ppr += `<w:tabs>${tabs}</w:tabs>`;
      }
      const sp = [];
      if (cs.marginTop !== base.marginTop && !block.classList.contains('pg-push')) sp.push(`w:before="${px2tw(parseFloat(cs.marginTop))}"`);
      if (cs.marginBottom !== base.marginBottom) sp.push(`w:after="${px2tw(parseFloat(cs.marginBottom))}"`);
      const lh = block.style.lineHeight;
      if (lh && /^[\d.]+$/.test(lh)) sp.push(`w:line="${Math.round(+lh * 240)}" w:lineRule="auto"`);
      else if (lh && cs.lineHeight.endsWith('px')) sp.push(`w:line="${px2tw(parseFloat(cs.lineHeight))}" w:lineRule="${block.dataset.lineRule === 'atLeast' ? 'atLeast' : 'exact'}"`);
      if (sp.length) ppr += `<w:spacing ${sp.join(' ')}/>`;
      const ind = [];
      if (!list && cs.marginLeft !== base.marginLeft) ind.push(`w:left="${px2tw(parseFloat(cs.marginLeft))}"`);
      if (cs.marginRight !== base.marginRight) ind.push(`w:right="${px2tw(parseFloat(cs.marginRight))}"`);
      const ti = parseFloat(cs.textIndent);
      if (ti > 0) ind.push(`w:firstLine="${px2tw(ti)}"`);
      else if (ti < 0) ind.push(`w:hanging="${px2tw(-ti)}"`);
      if (ind.length) ppr += `<w:ind ${ind.join(' ')}/>`;
      const al = { center: 'center', right: 'right', end: 'right', justify: 'both' }[cs.textAlign];
      if (cs.textAlign !== base.textAlign && al) ppr += `<w:jc w:val="${al}"/>`;
      else if (cs.textAlign !== base.textAlign && (cs.textAlign === 'left' || cs.textAlign === 'start')) ppr += '<w:jc w:val="left"/>';
    } else {
      const al = { center: 'center', right: 'right', end: 'right', justify: 'both' }[cs.textAlign];
      if (al) ppr += `<w:jc w:val="${al}"/>`;
    }
    let runs = '';
    for (const n of nodes) runs += await inlineXml(n, ctx, base, {});
    if (block.classList?.contains('caption') && !runs) runs = '';
    return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${runs}</w:p>`;
  }

  /* ---------- Runs ---------- */
  function rPr(el, base) {
    const cs = getComputedStyle(el);
    const out = [];
    const ck = DocStyles.keyOfChar(el);
    if (ck) out.push(`<w:rStyle w:val="${DocStyles.metaOf(ck).id}"/>`);
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    if (cs.fontFamily !== base.fontFamily && fam) out.push(`<w:rFonts w:ascii="${x(fam)}" w:hAnsi="${x(fam)}" w:cs="${x(fam)}"/>`);
    const bold = +cs.fontWeight >= 600 || cs.fontWeight === 'bold', bBold = +base.fontWeight >= 600 || base.fontWeight === 'bold';
    if (bold !== bBold) out.push(bold ? '<w:b/>' : '<w:b w:val="0"/>');
    const it = cs.fontStyle === 'italic' || cs.fontStyle === 'oblique';
    if (it !== (base.fontStyle === 'italic')) out.push(it ? '<w:i/>' : '<w:i w:val="0"/>');
    if (cs.textTransform === 'uppercase') out.push('<w:caps/>');
    if (cs.fontVariantCaps === 'small-caps' && base.fontVariant !== 'small-caps') out.push('<w:smallCaps/>');
    // decorações não são herdadas: percorrer ascendentes até ao bloco
    let u = null, strike = false, dstrike = false, vAlign = null, shd = null, n = el;
    while (n && n.nodeType === 1 && !n.matches(BLOCKS + ',td,th,#editor,.hf')) {
      const s = getComputedStyle(n);
      if (s.textDecorationLine.includes('underline') && !u) u = { solid: 'single', double: 'double', dotted: 'dotted', dashed: 'dash', wavy: 'wave' }[s.textDecorationStyle] || 'single';
      if (s.textDecorationLine.includes('line-through')) { if (s.textDecorationStyle === 'double') dstrike = true; else strike = true; }
      if (!vAlign && (s.verticalAlign === 'sub' || s.verticalAlign === 'super')) vAlign = s.verticalAlign === 'sub' ? 'subscript' : 'superscript';
      if (!shd && !isTransparent(s.backgroundColor) && !n.matches('.comment, .tc-ins, .tc-del, .wc-field')) shd = hex(s.backgroundColor);
      n = n.parentElement;
    }
    if (strike) out.push('<w:strike/>');
    if (dstrike) out.push('<w:dstrike/>');
    if (el.closest('.fx-outline')) out.push('<w:outline/>');
    if (el.closest('.fx-shadow')) out.push('<w:shadow/>');
    if (el.closest('.fx-emboss')) out.push('<w:emboss/>');
    if (el.closest('.fx-imprint')) out.push('<w:imprint/>');
    if (el.closest('.hidden-text')) out.push('<w:vanish/>');
    const col = hex(cs.color);
    if (cs.color !== base.color && col) out.push(`<w:color w:val="${col}"/>`);
    if (cs.letterSpacing !== base.letterSpacing && cs.letterSpacing !== 'normal') out.push(`<w:spacing w:val="${px2tw(parseFloat(cs.letterSpacing))}"/>`);
    const sz = Math.round(parseFloat(cs.fontSize) * 0.75 * 2);
    if (cs.fontSize !== base.fontSize && !vAlign) out.push(`<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`);
    if (u) out.push(`<w:u w:val="${u}"/>`);
    if (shd) out.push(`<w:shd w:val="clear" w:color="auto" w:fill="${shd}"/>`);
    if (vAlign) out.push(`<w:vertAlign w:val="${vAlign}"/>`);
    return out.length ? `<w:rPr>${out.join('')}</w:rPr>` : '';
  }

  const textRun = (text, pr, del) => {
    const parts = text.replace(/\u200B/g, '').split('\n');
    return parts.map((t, i) => `${i ? '<w:r><w:br/></w:r>' : ''}${t ? `<w:r>${pr}<w:${del ? 'delText' : 't'} xml:space="preserve">${x(t)}</w:${del ? 'delText' : 't'}></w:r>` : ''}`).join('');
  };
  const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

  async function inlineXml(n, ctx, base, st) {
    if (n.nodeType === 3) {
      const t = n.nodeValue.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, m => m);
      if (!t) return '';
      const parent = n.parentElement;
      return textRun(t, rPr(parent, base), st.del);
    }
    if (n.nodeType !== 1) return '';
    const el = n, tag = el.tagName;
    const kids = async (s = st) => { let o = ''; for (const c of el.childNodes) o += await inlineXml(c, ctx, base, s); return o; };
    if (tag === 'BR') return '<w:r><w:br/></w:r>';
    if (el.classList.contains('equation')) { const m = el.querySelector('math'); return m ? `<m:oMath>${Equations.toOmml(m)}</m:oMath>` : ''; }
    if (el.classList.contains('wc-preview')) return kids();
    if (el.classList.contains('wc-tab')) return '<w:r><w:tab/></w:r>';
    if (el.classList.contains('wc-field')) {
      const f = el.dataset.field;
      return `<w:fldSimple w:instr=" ${x(f)} ${f === 'DATE' ? '\\@ &quot;dd/MM/yyyy&quot; ' : ''}">${textRun(el.textContent || '1', rPr(el, base))}</w:fldSimple>`;
    }
    if (el.classList.contains('mm-field')) return `<w:fldSimple w:instr=" MERGEFIELD ${x(el.dataset.field)} ">${textRun('«' + el.dataset.field + '»', rPr(el, base))}</w:fldSimple>`;
    if (tag === 'IMG') return imageXml(el, ctx);
    if (tag === 'SUP' && el.classList.contains('fn-ref')) return noteRef('footnote', el, ctx);
    if (tag === 'SUP' && el.classList.contains('en-ref')) return noteRef('endnote', el, ctx);
    if (tag === 'A' && el.getAttribute('href')) {
      const href = el.getAttribute('href');
      const inner = await kids();
      if (href.startsWith('#')) return `<w:hyperlink w:anchor="${x(href.slice(1))}">${inner}</w:hyperlink>`;
      const id = ctx.addRel(`${REL}/hyperlink`, href, true);
      return `<w:hyperlink r:id="${id}">${inner}</w:hyperlink>`;
    }
    if (tag === 'A' && (el.id || el.name)) {
      const id = ctx.bmId++;
      return `<w:bookmarkStart w:id="${id}" w:name="${x(el.id || el.name)}"/>${await kids()}<w:bookmarkEnd w:id="${id}"/>`;
    }
    if (el.classList.contains('tc-ins') || tag === 'INS') {
      return `<w:ins w:id="${ctx.revId++}" w:author="${x(el.dataset.author || prefs.user)}" w:date="${x(el.dataset.date || nowIso())}">${await kids()}</w:ins>`;
    }
    if (el.classList.contains('tc-del') || tag === 'DEL') {
      return `<w:del w:id="${ctx.revId++}" w:author="${x(el.dataset.author || prefs.user)}" w:date="${x(el.dataset.date || nowIso())}">${await kids({ ...st, del: true })}</w:del>`;
    }
    if (el.classList.contains('comment')) {
      const id = ctx.comments.length;
      const text = el.dataset.text || (el.title || '').replace(/^[^:]*:\s*/, '');
      ctx.comments.push(`<w:comment w:id="${id}" w:author="${x(el.dataset.author || prefs.user)}" w:date="${x(el.dataset.date || nowIso())}" w:initials="${x(el.dataset.initials || prefs.initials)}"><w:p><w:r><w:annotationRef/></w:r><w:r><w:t xml:space="preserve">${x(text)}</w:t></w:r></w:p></w:comment>`);
      return `<w:commentRangeStart w:id="${id}"/>${await kids()}<w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r>`;
    }
    if (isBlock(el)) return kids();
    return kids();
  }

  function noteRef(kind, el, ctx) {
    const list = kind === 'footnote' ? ctx.footnotes : ctx.endnotes;
    const id = list.length + 1;
    const box = $(kind === 'footnote' ? '.footnotes' : '.endnotes', editor);
    const n = el.textContent.trim();
    const p = box && [...box.children].find(c => c.querySelector('sup')?.textContent.trim() === n);
    const text = p ? p.textContent.replace(/^\s*\S+\s*/, '').trim() : '';
    list.push(`<w:${kind} w:id="${id}"><w:p><w:pPr><w:pStyle w:val="${kind === 'footnote' ? 'FootnoteText' : 'EndnoteText'}"/></w:pPr><w:r><w:rPr><w:rStyle w:val="${kind === 'footnote' ? 'FootnoteReference' : 'EndnoteReference'}"/></w:rPr><w:${kind}Ref/></w:r><w:r><w:t xml:space="preserve"> ${x(text)}</w:t></w:r></w:p></w:${kind}>`);
    return `<w:r><w:rPr><w:rStyle w:val="${kind === 'footnote' ? 'FootnoteReference' : 'EndnoteReference'}"/></w:rPr><w:${kind}Reference w:id="${id}"/></w:r>`;
  }

  function notesXml(kind, list) {
    return `${XML}<w:${kind}s ${ROOT_NS}><w:${kind} w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:${kind}><w:${kind} w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:${kind}>${list.join('')}</w:${kind}s>`;
  }

  async function imageBytes(img) {
    const src = img.getAttribute('src') || '';
    let m = /^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/i.exec(src);
    if (!m) {
      // SVG ou imagem externa: rasterizar através de canvas
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width || 100;
        c.height = img.naturalHeight || img.height || 100;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        m = /^data:image\/(png);base64,(.*)$/.exec(c.toDataURL('image/png'));
      } catch { return null; }
    }
    if (!m) return null;
    const bin = atob(m[2]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { ext: m[1].toLowerCase().replace('jpg', 'jpeg'), bytes };
  }

  async function imageXml(img, ctx) {
    const data = await imageBytes(img);
    if (!data) return '';
    const name = `image${ctx.media.length + 1}.${data.ext}`;
    ctx.media.push({ name, data: data.bytes });
    const rid = ctx.addRel(`${REL}/image`, 'media/' + name);
    const w = img.offsetWidth || img.naturalWidth || 100, h = img.offsetHeight || img.naturalHeight || 100;
    const cx = Math.round(w * 9525), cy = Math.round(h * 9525), id = ctx.docPrId++;
    const graphic = `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm${img.dataset.rotate ? ` rot="${Math.round(+img.dataset.rotate * 60000)}"` : ''}><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${img.style.borderStyle && img.style.borderStyle !== 'none' ? `<a:ln w="${Math.round((parseFloat(getComputedStyle(img).borderTopWidth) || 1) * 9525)}"><a:solidFill><a:srgbClr val="${hex(getComputedStyle(img).borderTopColor) || '000000'}"/></a:solidFill></a:ln>` : ''}</pic:spPr></pic:pic></a:graphicData></a:graphic>`;
    const fl = img.style.float;
    if (fl === 'left' || fl === 'right') {
      return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:align>${fl}</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="${id}" name="Imagem ${id}"/><wp:cNvGraphicFramePr/>${graphic}</wp:anchor></w:drawing></w:r>`;
    }
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Imagem ${id}" descr="${x(img.alt || '')}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>${graphic}</wp:inline></w:drawing></w:r>`;
  }

  /* ---------- Tabelas ---------- */
  async function tableXml(t, ctx, opts) {
    const rows = [...t.rows];
    if (!rows.length) return '';
    // grelha: largura das colunas a partir da linha com mais células
    const ref = rows.reduce((a, r) => ([...r.cells].reduce((s, c) => s + (c.colSpan || 1), 0) > [...a.cells].reduce((s, c) => s + (c.colSpan || 1), 0) ? r : a), rows[0]);
    const cols = [];
    [...ref.cells].forEach(c => { const span = c.colSpan || 1; for (let i = 0; i < span; i++) cols.push(px2tw(c.offsetWidth / span)); });
    const cs = getComputedStyle(t);
    const firstCell = t.querySelector('td,th');
    const ccs = firstCell ? getComputedStyle(firstCell) : null;
    const borderless = ccs && (ccs.borderTopStyle === 'none' || parseFloat(ccs.borderTopWidth) === 0);
    const bcol = (ccs && hex(ccs.borderTopColor)) || '000000';
    const bsz = ccs ? Math.max(2, Math.round(parseFloat(ccs.borderTopWidth) * 0.75 * 8)) : 4;
    const b = side => `<w:${side} w:val="${borderless ? 'nil' : 'single'}" w:sz="${bsz}" w:space="0" w:color="${bcol}"/>`;
    const widthPct = t.style.width && t.style.width.endsWith('%') ? Math.round(parseFloat(t.style.width) * 50) : (cs.width && t.offsetWidth >= editor.clientWidth - 2 ? 5000 : 0);
    let out = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>${widthPct ? `<w:tblW w:w="${widthPct}" w:type="pct"/>` : `<w:tblW w:w="${px2tw(t.offsetWidth)}" w:type="dxa"/>`}${{ center: '<w:jc w:val="center"/>', right: '<w:jc w:val="right"/>' }[t.dataset.align] || ''}<w:tblBorders>${b('top')}${b('left')}${b('bottom')}${b('right')}${b('insideH')}${b('insideV')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid>${cols.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
    // modelo de ocupação para rowspan -> vMerge
    const occupied = [];
    for (let ri = 0; ri < rows.length; ri++) {
      const tr = rows[ri];
      occupied[ri] ??= [];
      const trPr = (tr.parentElement.tagName === 'THEAD' ? '<w:tblHeader/>' : '') + (tr.style.height ? `<w:trHeight w:val="${px2tw(tr.offsetHeight)}"/>` : '');
      out += `<w:tr>${trPr ? `<w:trPr>${tr.style.height ? `<w:trHeight w:val="${px2tw(tr.offsetHeight)}"/>` : ''}${tr.parentElement.tagName === 'THEAD' ? '<w:tblHeader/>' : ''}</w:trPr>` : ''}`;
      let col = 0;
      const emitContinuations = () => {
        while (occupied[ri][col]) {
          const o = occupied[ri][col];
          out += `<w:tc><w:tcPr><w:tcW w:w="${o.w}" w:type="dxa"/>${o.span > 1 ? `<w:gridSpan w:val="${o.span}"/>` : ''}<w:vMerge/></w:tcPr><w:p/></w:tc>`;
          col += o.span;
        }
      };
      for (const cell of tr.cells) {
        emitContinuations();
        const span = cell.colSpan || 1, rs = cell.rowSpan || 1;
        const w = cols.slice(col, col + span).reduce((s, v) => s + v, 0) || px2tw(cell.offsetWidth);
        const c = getComputedStyle(cell);
        let tcPr = `<w:tcW w:w="${w}" w:type="dxa"/>`;
        if (span > 1) tcPr += `<w:gridSpan w:val="${span}"/>`;
        if (rs > 1) {
          tcPr += '<w:vMerge w:val="restart"/>';
          for (let k = 1; k < rs; k++) { occupied[ri + k] ??= []; occupied[ri + k][col] = { w, span }; }
        }
        const bd = ['top', 'left', 'bottom', 'right'].map(side => {
          const st = c[`border${cap(side)}Style`], wd = parseFloat(c[`border${cap(side)}Width`]);
          if (st === 'none' || !wd) return `<w:${side} w:val="nil"/>`;
          return `<w:${side} w:val="${{ double: 'double', dotted: 'dotted', dashed: 'dashed' }[st] || 'single'}" w:sz="${Math.max(2, Math.round(wd * 0.75 * 8))}" w:space="0" w:color="${hex(c[`border${cap(side)}Color`]) || '000000'}"/>`;
        }).join('');
        tcPr += `<w:tcBorders>${bd}</w:tcBorders>`;
        if (!isTransparent(c.backgroundColor)) tcPr += `<w:shd w:val="clear" w:color="auto" w:fill="${hex(c.backgroundColor)}"/>`;
        const va = { middle: 'center', bottom: 'bottom' }[c.verticalAlign];
        if (va) tcPr += `<w:vAlign w:val="${va}"/>`;
        const inner = await containerXml(cell, ctx, opts);
        out += `<w:tc><w:tcPr>${tcPr}</w:tcPr>${inner || '<w:p/>'}</w:tc>`;
        col += span;
      }
      emitContinuations();
      out += '</w:tr>';
    }
    return out + '</w:tbl><w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';
  }

  /* ---------- Secção, estilos e definições ---------- */
  function sectPr(ctx) {
    const [w, h] = pageDims(), m = settings.margins;
    const tw = mm => Math.round(mm / 25.4 * 1440), ct = cm => Math.round(cm / 2.54 * 1440);
    const pb = settings.pageBorder ? (() => {
      const val = { double: 'double', single: 'single', dotted: 'dotted', dashed: 'dashed', thick: 'thick' }[settings.pageBorderStyle || 'double'] || 'double';
      const col = hex(settings.pageBorderColor || '#1F497D');
      return `<w:pgBorders w:offsetFrom="page">${['top', 'left', 'bottom', 'right'].map(s => `<w:${s} w:val="${val}" w:sz="6" w:space="24" w:color="${col}"/>`).join('')}</w:pgBorders>`;
    })() : '';
    const ln = settings.lineNumbers && settings.lineNumbers !== 'none' ? `<w:lnNumType w:countBy="1" w:restart="${settings.lineNumbers === 'page' ? 'newPage' : 'continuous'}"/>` : '';
    const pn = settings.pageStart && settings.pageStart !== 1 ? `<w:pgNumType w:start="${settings.pageStart}"/>` : '';
    return `<w:sectPr>${ctx.hfRefs || ''}${ctx.ftRefs || ''}<w:pgSz w:w="${tw(w)}" w:h="${tw(h)}"${settings.landscape ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${ct(m.t)}" w:right="${ct(m.r)}" w:bottom="${ct(m.b)}" w:left="${ct(m.l)}" w:header="708" w:footer="708" w:gutter="0"/>${pb}${ln}${pn}<w:cols w:space="708"${settings.columns > 1 ? ` w:num="${settings.columns}"${settings.colLine ? ' w:sep="1"' : ''}` : ''}/>${settings.differentFirst ? '<w:titlePg/>' : ''}<w:docGrid w:linePitch="360"/></w:sectPr>`;
  }

  function stylesXml() {
    const d = DocStyles.defs();
    const rpr = s => {
      const o = [];
      if (s.font) o.push(`<w:rFonts w:ascii="${x(s.font)}" w:hAnsi="${x(s.font)}" w:cs="${x(s.font)}"/>`);
      if (s.bold !== undefined) o.push(s.bold ? '<w:b/><w:bCs/>' : '<w:b w:val="0"/>');
      if (s.italic !== undefined) o.push(s.italic ? '<w:i/><w:iCs/>' : '<w:i w:val="0"/>');
      if (s.smallCaps) o.push('<w:smallCaps/>');
      if (s.color) o.push(`<w:color w:val="${hex(s.color)}"/>`);
      if (s.letter) o.push(`<w:spacing w:val="${Math.round(s.letter * 20)}"/>`);
      if (s.size) o.push(`<w:sz w:val="${s.size * 2}"/><w:szCs w:val="${s.size * 2}"/>`);
      if (s.underline) o.push('<w:u w:val="single"/>');
      return o.length ? `<w:rPr>${o.join('')}</w:rPr>` : '';
    };
    const ppr = s => {
      const o = [];
      if (s.keepNext) o.push('<w:keepNext/><w:keepLines/>');
      if (s.borderBottom) o.push(`<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="${hex(s.borderBottom)}"/></w:pBdr>`);
      if (s.shading) o.push(`<w:shd w:val="clear" w:color="auto" w:fill="${hex(s.shading)}"/>`);
      const sp = [];
      if (s.before !== undefined) sp.push(`w:before="${Math.round(s.before * 20)}"`);
      if (s.after !== undefined) sp.push(`w:after="${Math.round(s.after * 20)}"`);
      if (s.line !== undefined) sp.push(`w:line="${Math.round(s.line * 240)}" w:lineRule="auto"`);
      if (sp.length) o.push(`<w:spacing ${sp.join(' ')}/>`);
      if (s.indLeft !== undefined || s.indRight !== undefined) o.push(`<w:ind${s.indLeft !== undefined ? ` w:left="${Math.round(s.indLeft * 20)}"` : ''}${s.indRight !== undefined ? ` w:right="${Math.round(s.indRight * 20)}"` : ''}/>`);
      if (s.align) o.push(`<w:jc w:val="${{ center: 'center', right: 'right', justify: 'both', left: 'left' }[s.align]}"/>`);
      if (s.outline !== undefined) o.push(`<w:outlineLvl w:val="${s.outline}"/>`);
      return o.length ? `<w:pPr>${o.join('')}</w:pPr>` : '';
    };
    let styles = '';
    for (const [k, s] of Object.entries(d)) {
      const m = DocStyles.metaOf(k, s);
      const type = s.type === 'c' ? 'character' : 'paragraph';
      styles += `<w:style w:type="${type}"${k === 'normal' ? ' w:default="1"' : ''} w:styleId="${m.id}"${s.custom ? ' w:customStyle="1"' : ''}><w:name w:val="${x(s.custom ? s.name : m.w)}"/>${k !== 'normal' && type === 'paragraph' ? '<w:basedOn w:val="Normal"/><w:next w:val="Normal"/>' : ''}<w:qFormat/>${type === 'paragraph' ? ppr(s) : ''}${rpr(s)}</w:style>`;
    }
    styles += '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>';
    styles += '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>';
    styles += '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr></w:style>';
    styles += '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0000FF"/><w:u w:val="single"/></w:rPr></w:style>';
    styles += '<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:style><w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>';
    styles += '<w:style w:type="paragraph" w:styleId="EndnoteText"><w:name w:val="endnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:style><w:style w:type="character" w:styleId="EndnoteReference"><w:name w:val="endnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>';
    const n = d.normal;
    return `${XML}<w:styles ${ROOT_NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${x(n.font)}" w:eastAsia="${x(n.font)}" w:hAnsi="${x(n.font)}" w:cs="Times New Roman"/><w:sz w:val="${n.size * 2}"/><w:szCs w:val="${n.size * 2}"/><w:lang w:val="pt-PT" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="${n.after * 20}" w:line="${Math.round(n.line * 240)}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${styles}</w:styles>`;
  }

  function settingsXml() {
    return `${XML}<w:settings ${ROOT_NS}><w:zoom w:percent="${zoom}"/>${settings.pageColor ? '<w:displayBackgroundShape/>' : ''}${settings.trackChanges ? '<w:trackRevisions/>' : ''}${settings.protect ? '<w:documentProtection w:edit="readOnly" w:enforcement="1"/>' : ''}<w:defaultTabStop w:val="708"/>${settings.hyphenate ? '<w:autoHyphenation/>' : ''}<w:characterSpacingControl w:val="doNotCompress"/><w:footnotePr><w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr><w:endnotePr><w:endnote w:id="-1"/><w:endnote w:id="0"/></w:endnotePr><w:compat/></w:settings>`;
  }

  /* =========================================================
     LEITURA
     ========================================================= */
  const W = NS.w;
  const kids = (el, name) => el ? [...el.children].filter(c => c.localName === name) : [];
  const kid = (el, name) => el ? [...el.children].find(c => c.localName === name) || null : null;
  const att = (el, name) => el ? (el.getAttributeNS(W, name) ?? el.getAttribute('w:' + name) ?? el.getAttribute(name)) : null;
  const onOff = el => !!el && !['0', 'false', 'off'].includes(att(el, 'val'));
  const parseXml = bytes => new DOMParser().parseFromString(typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes), 'application/xml');
  const HL = { yellow: '#FFFF00', green: '#00FF00', cyan: '#00FFFF', magenta: '#FF00FF', blue: '#0000FF', red: '#FF0000', darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000', darkGray: '#808080', lightGray: '#C0C0C0', black: '#000000', white: '#FFFFFF' };

  async function read(buf) {
    const files = await ZIP.read(buf);
    const text = n => files[n] ? new TextDecoder().decode(files[n]) : null;
    if (files['word/afchunk.htm']) return { altChunk: text('word/afchunk.htm') };
    const ctRoot = parseXml(text('[Content_Types].xml') || '<x/>');
    const mainOv = [...ctRoot.getElementsByTagName('Override')].find(o => /document\.main\+xml|template\.main\+xml|macroEnabled\.main\+xml/.test(o.getAttribute('ContentType')));
    const mainPath = (mainOv?.getAttribute('PartName') || '/word/document.xml').replace(/^\//, '');
    const dir = mainPath.replace(/[^/]+$/, '');
    const relsOf = part => {
      const p = part.replace(/([^/]+)$/, '_rels/$1.rels');
      const doc = parseXml(text(p) || '<Relationships/>');
      const map = {};
      for (const r of doc.getElementsByTagName('Relationship')) map[r.getAttribute('Id')] = { type: r.getAttribute('Type'), target: r.getAttribute('Target'), ext: r.getAttribute('TargetMode') === 'External' };
      return map;
    };
    const resolve = (base, target) => {
      if (target.startsWith('/')) return target.slice(1);
      const parts = (base + target).split('/');
      const out = [];
      for (const p of parts) { if (p === '..') out.pop(); else if (p !== '.') out.push(p); }
      return out.join('/');
    };
    const docRels = relsOf(mainPath);
    const relTarget = type => Object.values(docRels).find(r => r.type.endsWith('/' + type));

    // estilos
    const styleMap = {};
    const stylesPath = relTarget('styles');
    let defaultsR = null, defaultsP = null;
    if (stylesPath) {
      const sd = parseXml(text(resolve(dir, stylesPath.target)));
      const dd = sd.getElementsByTagNameNS(W, 'docDefaults')[0];
      defaultsR = kid(kid(dd, 'rPrDefault'), 'rPr');
      defaultsP = kid(kid(dd, 'pPrDefault'), 'pPr');
      for (const s of sd.getElementsByTagNameNS(W, 'style')) {
        styleMap[att(s, 'styleId')] = { name: (att(kid(s, 'name'), 'val') || '').toLowerCase(), type: att(s, 'type'), basedOn: att(kid(s, 'basedOn'), 'val'), rPr: kid(s, 'rPr'), pPr: kid(s, 'pPr') };
      }
    }
    const NAME2KEY = {};
    for (const [k, m] of Object.entries(DocStyles.META)) NAME2KEY[m.w.toLowerCase()] = k;
    Object.assign(NAME2KEY, { 'título 1': 'h1', 'título 2': 'h2', 'título 3': 'h3', 'cabeçalho 1': 'h1', 'cabeçalho 2': 'h2', 'cabeçalho 3': 'h3', 'título': 'title', 'subtítulo': 'subtitle', 'citação': 'quote', 'sem espaçamento': 'nospacing', 'parágrafo da lista': 'listpara', 'legenda': 'caption' });
    const keyOfStyle = id => {
      let s = styleMap[id], guard = 0;
      while (s && guard++ < 10) {
        const k = NAME2KEY[s.name];
        if (k) return k;
        s = styleMap[s.basedOn];
      }
      return null;
    };
    const chain = id => { const out = []; let s = styleMap[id], g = 0; while (s && g++ < 12) { out.unshift(s); s = styleMap[s.basedOn]; } return out; };

    // numeração
    const numMap = {};
    const numPath = relTarget('numbering');
    if (numPath) {
      const nd = parseXml(text(resolve(dir, numPath.target)));
      const abs = {};
      for (const a of nd.getElementsByTagNameNS(W, 'abstractNum')) {
        abs[att(a, 'abstractNumId')] = kids(a, 'lvl').map(l => ({ fmt: att(kid(l, 'numFmt'), 'val') || 'decimal', text: att(kid(l, 'lvlText'), 'val') || '', start: +(att(kid(l, 'start'), 'val') || 1) }));
      }
      for (const n of nd.getElementsByTagNameNS(W, 'num')) {
        const levels = abs[att(kid(n, 'abstractNumId'), 'val')] || [];
        const so = kid(kid(n, 'lvlOverride'), 'startOverride');
        numMap[att(n, 'numId')] = { levels, start: so ? +att(so, 'val') : null };
      }
    }

    // comentários e notas
    const comments = {};
    const cPath = relTarget('comments');
    if (cPath) {
      const cd = parseXml(text(resolve(dir, cPath.target)));
      for (const c of cd.getElementsByTagNameNS(W, 'comment')) comments[att(c, 'id')] = { author: att(c, 'author') || '', date: att(c, 'date') || '', initials: att(c, 'initials') || '', text: c.textContent.trim() };
    }
    const notes = { footnote: {}, endnote: {} };
    for (const kind of ['footnote', 'endnote']) {
      const p = relTarget(kind + 's');
      if (!p) continue;
      const nd = parseXml(text(resolve(dir, p.target)));
      for (const f of nd.getElementsByTagNameNS(W, kind)) if (!att(f, 'type') || att(f, 'type') === 'normal') notes[kind][att(f, 'id')] = f.textContent.trim();
    }

    const media = async (rels, base, rid) => {
      const r = rels[rid];
      if (!r || r.ext) return null;
      const path = resolve(base, r.target), data = files[path];
      if (!data) return null;
      const ext = path.split('.').pop().toLowerCase();
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml' }[ext];
      if (!mime) return null;
      let bin = '';
      for (let i = 0; i < data.length; i += 0x8000) bin += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000));
      return `data:${mime};base64,${btoa(bin)}`;
    };

    const state = { fn: [], en: [], fields: [] };
    const conv = (rels, base) => ({ rels, base, styleMap, keyOfStyle, chain, defaultsR, defaultsP, numMap, comments, notes, media, state });

    const docXml = parseXml(text(mainPath));
    const bodyEl = docXml.getElementsByTagNameNS(W, 'body')[0];
    const html = await bodyToHtml(bodyEl, conv(docRels, dir));
    let extra = '';
    if (state.fn.length) extra += `<div class="footnotes">${state.fn.map(f => `<p><sup>${f.n}</sup> ${esc(f.text)}</p>`).join('')}</div>`;
    if (state.en.length) extra += `<div class="endnotes">${state.en.map(f => `<p><sup>${f.n}</sup> ${esc(f.text)}</p>`).join('')}</div>`;

    // secção final
    const sect = kids(bodyEl, 'sectPr').at(-1) || [...bodyEl.getElementsByTagNameNS(W, 'sectPr')].at(-1);
    const s = {};
    let headerHtml = '', footerHtml = '';
    if (sect) {
      const pg = kid(sect, 'pgSz'), mg = kid(sect, 'pgMar');
      if (pg) {
        let w = +att(pg, 'w') / 1440 * 25.4, h = +att(pg, 'h') / 1440 * 25.4;
        const land = att(pg, 'orient') === 'landscape' || w > h;
        if (land) [w, h] = [h, w];
        s.landscape = land;
        const match = Object.entries(PAGE_SIZES).find(([, [pw, ph]]) => Math.abs(pw - w) < 2 && Math.abs(ph - h) < 2);
        if (match) s.size = match[0];
        else { PAGE_SIZES.Personalizado = [Math.round(w * 10) / 10, Math.round(h * 10) / 10]; s.size = 'Personalizado'; s.customSize = PAGE_SIZES.Personalizado; }
      }
      if (mg) s.margins = { t: Math.abs(+att(mg, 'top')) / 1440 * 2.54, b: Math.abs(+att(mg, 'bottom')) / 1440 * 2.54, l: +att(mg, 'left') / 1440 * 2.54, r: +att(mg, 'right') / 1440 * 2.54 };
      if (s.margins) for (const k in s.margins) s.margins[k] = Math.round(s.margins[k] * 100) / 100;
      const cols = kid(sect, 'cols');
      if (cols && +att(cols, 'num') > 1) { s.columns = +att(cols, 'num'); s.colLine = ['1', 'true', 'on'].includes(att(cols, 'sep')); }
      if (kid(sect, 'titlePg') && onOff(kid(sect, 'titlePg'))) s.differentFirst = true;
      const pn = kid(sect, 'pgNumType');
      if (pn && att(pn, 'start')) s.pageStart = +att(pn, 'start');
      const ln = kid(sect, 'lnNumType');
      if (ln) s.lineNumbers = att(ln, 'restart') === 'newPage' ? 'page' : 'continuous';
      if (kid(sect, 'pgBorders')) { s.pageBorder = true; const t = kid(kid(sect, 'pgBorders'), 'top'); s.pageBorderStyle = att(t, 'val') === 'double' ? 'double' : 'single'; s.pageBorderColor = '#' + (att(t, 'color') || '1F497D').replace('auto', '000000'); }
      for (const kind of ['header', 'footer']) {
        for (const ref of kids(sect, kind + 'Reference')) {
          const r = docRels[ref.getAttributeNS(NS.r, 'id') || ref.getAttribute('r:id')];
          if (!r) continue;
          const path = resolve(dir, r.target);
          const hd = parseXml(text(path));
          const h = await bodyToHtml(hd.documentElement, conv(relsOf(path), path.replace(/[^/]+$/, '')));
          const type = att(ref, 'type') || 'default';
          if (type === 'default') { if (kind === 'header') headerHtml = h; else footerHtml = h; }
          else if (type === 'first') s[kind === 'header' ? 'firstHeader' : 'firstFooter'] = h;
        }
      }
    }
    const bg = docXml.getElementsByTagNameNS(W, 'background')[0];
    if (bg && att(bg, 'color') && att(bg, 'color') !== 'auto') s.pageColor = '#' + att(bg, 'color');
    const stPath = relTarget('settings');
    if (stPath) {
      const sx = parseXml(text(resolve(dir, stPath.target)));
      if (sx.getElementsByTagNameNS(W, 'trackRevisions').length) s.trackChanges = true;
      if (sx.getElementsByTagNameNS(W, 'autoHyphenation').length) s.hyphenate = true;
    }
    // propriedades
    const core = text('docProps/core.xml');
    if (core) {
      const cd = parseXml(core);
      const g = n => cd.getElementsByTagName(n)[0]?.textContent || '';
      s.props = { title: g('dc:title'), subject: g('dc:subject'), author: g('dc:creator'), keywords: g('cp:keywords'), comments: g('dc:description'), category: g('cp:category'), created: g('dcterms:created') };
    }
    return { html: html + extra, header: headerHtml, footer: footerHtml, settings: s };
  }

  /* ---------- Conversão XML -> HTML ---------- */
  async function bodyToHtml(root, c) {
    let out = '';
    const listStack = [];
    const closeLists = (to = 0) => { while (listStack.length > to) out += `</li></${listStack.pop().tag}>`; };
    const items = [];
    const walk = el => {
      for (const n of el.children) {
        if (n.localName === 'sdt') walk(kid(n, 'sdtContent') || n);
        else if (n.localName === 'customXml' || n.localName === 'smartTag') walk(n);
        else if (n.localName === 'p' || n.localName === 'tbl') items.push(n);
      }
    };
    walk(root);
    for (const n of items) {
      if (n.localName === 'tbl') { closeLists(); out += await tblToHtml(n, c); continue; }
      const pPr = kid(n, 'pPr');
      const styleId = att(kid(pPr, 'pStyle'), 'val');
      let numPr = kid(pPr, 'numPr');
      if (!numPr && styleId) for (const s of c.chain(styleId)) { const np = kid(s.pPr, 'numPr'); if (np) { numPr = np; break; } }
      const numId = att(kid(numPr, 'numId'), 'val');
      const { html, pageBreakBefore, breaks } = await pToHtml(n, c, !!(numPr && numId && numId !== '0'));
      if (numPr && numId && numId !== '0' && c.numMap[numId]) {
        const lvl = +(att(kid(numPr, 'ilvl'), 'val') || 0);
        const def = c.numMap[numId].levels[lvl] || { fmt: 'decimal' };
        const tag = def.fmt === 'bullet' ? 'ul' : 'ol';
        const lst = { bullet: 'disc', decimal: 'decimal', lowerLetter: 'lower-alpha', upperLetter: 'upper-alpha', lowerRoman: 'lower-roman', upperRoman: 'upper-roman', none: 'none' }[def.fmt] || 'decimal';
        while (listStack.length > lvl + 1) out += `</li></${listStack.pop().tag}>`;
        const top = listStack[listStack.length - 1];
        if (listStack.length === lvl + 1 && (top.numId !== numId || top.tag !== tag)) { out += `</li></${listStack.pop().tag}>`; }
        if (listStack.length === lvl + 1) out += '</li><li>';
        while (listStack.length < lvl + 1) {
          const start = listStack.length === 0 && c.numMap[numId].start ? ` start="${c.numMap[numId].start}"` : '';
          out += `<${tag} style="list-style-type:${lst}"${start}><li>`;
          listStack.push({ tag, numId });
        }
        out += html.replace(/^<p([^>]*)>/, '<span$1>').replace(/<\/p>$/, '</span>');
      } else {
        closeLists();
        if (pageBreakBefore) out += '<hr class="page-break">';
        out += html;
      }
      for (let i = 0; i < breaks; i++) { closeLists(); out += '<hr class="page-break">'; }
    }
    closeLists();
    return out;
  }

  function effectiveP(pPr, c) {
    const styleId = att(kid(pPr, 'pStyle'), 'val') || 'Normal';
    const key = c.keyOfStyle(styleId) || (styleMap(c, styleId)?.type === 'paragraph' ? null : 'normal');
    return { styleId, key };
  }
  const styleMap = (c, id) => c.styleMap[id];

  function collectR(rPrList) {
    const r = {};
    for (const rp of rPrList) {
      if (!rp) continue;
      for (const e of rp.children) {
        const n = e.localName, v = att(e, 'val');
        if (n === 'rFonts') r.font = att(e, 'ascii') || att(e, 'hAnsi') || r.font;
        else if (n === 'b') r.bold = onOff(e);
        else if (n === 'i') r.italic = onOff(e);
        else if (n === 'u') r.u = v && v !== 'none' ? v : null;
        else if (n === 'strike') r.strike = onOff(e);
        else if (n === 'dstrike') r.dstrike = onOff(e);
        else if (n === 'caps') r.caps = onOff(e);
        else if (n === 'smallCaps') r.smallCaps = onOff(e);
        else if (n === 'vanish') r.hidden = onOff(e);
        else if (n === 'color') r.color = v && v !== 'auto' ? '#' + v : null;
        else if (n === 'sz') r.size = +v / 2;
        else if (n === 'highlight') r.bg = HL[v] || null;
        else if (n === 'shd') { const f = att(e, 'fill'); if (f && f !== 'auto') r.bg = '#' + f; }
        else if (n === 'vertAlign') r.va = v;
        else if (n === 'spacing') r.letter = +v / 20;
        else if (n === 'outline') r.outline = onOff(e);
        else if (n === 'shadow') r.shadow = onOff(e);
        else if (n === 'emboss') r.emboss = onOff(e);
        else if (n === 'imprint') r.imprint = onOff(e);
        else if (n === 'rStyle') r.rStyle = v;
      }
    }
    return r;
  }

  function runCss(r, base) {
    const s = [];
    if (r.font && r.font !== base.font) s.push(`font-family:'${r.font}'`);
    if (r.size && r.size !== base.size) s.push(`font-size:${r.size}pt`);
    if (r.color && base.color?.toUpperCase() !== r.color.toUpperCase()) s.push(`color:${r.color}`);
    if (r.bold !== undefined && !!r.bold !== !!base.bold) s.push(`font-weight:${r.bold ? 'bold' : 'normal'}`);
    if (r.italic !== undefined && !!r.italic !== !!base.italic) s.push(`font-style:${r.italic ? 'italic' : 'normal'}`);
    const deco = [];
    if (r.u) deco.push('underline');
    if (r.strike || r.dstrike) deco.push('line-through');
    if (deco.length) s.push(`text-decoration:${deco.join(' ')}${r.dstrike ? ' double' : ''}${r.u && { double: 1, dotted: 1, dash: 1, wave: 1 }[r.u] ? ' ' + { double: 'double', dotted: 'dotted', dash: 'dashed', wave: 'wavy' }[r.u] : ''}`);
    if (r.caps) s.push('text-transform:uppercase');
    if (r.smallCaps && !base.smallCaps) s.push('font-variant:small-caps');
    if (r.bg) s.push(`background-color:${r.bg}`);
    if (r.letter) s.push(`letter-spacing:${r.letter}pt`);
    return s.join(';');
  }

  async function pToHtml(p, c, inList) {
    const pPr = kid(p, 'pPr');
    const { styleId, key } = effectiveP(pPr, c);
    const defs = DocStyles.defs();
    const ourKey = key && defs[key] ? key : 'normal';
    const meta = DocStyles.metaOf(ourKey);
    // propriedades efectivas: predefinições + cadeia de estilos (apenas para estilos não mapeados) + directas
    const chain = c.chain(styleId);
    const mapped = !!key;
    // estilos mapeados (Cabeçalho 1, Título...) usam a definição da aplicação; o Normal e os
    // estilos desconhecidos herdam as propriedades do documento (ex.: Times New Roman 12)
    const useChain = !mapped || ourKey === 'normal';
    const base = { ...defs.normal, ...(ourKey !== 'normal' ? defs[ourKey] : {}) };
    const pStyleR = mapped && ourKey !== 'normal' ? {} : collectR([c.defaultsR, ...(useChain ? chain.map(s => s.rPr) : [])]);
    const css = [];
    const pp = [...(useChain ? [c.defaultsP, ...chain.map(s => s.pPr)] : []), pPr].filter(Boolean);
    let pageBreakBefore = false, keepNext = false, tabs = '';
    for (const e of pp.flatMap(x => [...x.children])) {
      const n = e.localName;
      if (n === 'jc') { const v = att(e, 'val'); css.push(`text-align:${{ center: 'center', right: 'right', end: 'right', both: 'justify', distribute: 'justify' }[v] || 'left'}`); }
      else if (n === 'ind') {
        const l = att(e, 'left') ?? att(e, 'start'), r = att(e, 'right') ?? att(e, 'end'), f = att(e, 'firstLine'), h = att(e, 'hanging');
        if (l !== null && !inList) css.push(`margin-left:${(+l / 20).toFixed(1)}pt`);
        if (r !== null) css.push(`margin-right:${(+r / 20).toFixed(1)}pt`);
        if (f !== null && !inList) css.push(`text-indent:${(+f / 20).toFixed(1)}pt`);
        if (h !== null && !inList) css.push(`text-indent:-${(+h / 20).toFixed(1)}pt`);
      } else if (n === 'spacing') {
        const b = att(e, 'before'), a = att(e, 'after'), l = att(e, 'line'), rule = att(e, 'lineRule');
        const set = (prop, v) => { for (let i = css.length - 1; i >= 0; i--) if (css[i].startsWith(prop + ':')) css.splice(i, 1); if (v !== null) css.push(`${prop}:${v}`); };
        if (b !== null) set('margin-top', +b / 20 === (base.before ?? 0) ? null : `${+b / 20}pt`);
        if (a !== null) set('margin-bottom', +a / 20 === (base.after ?? 10) ? null : `${+a / 20}pt`);
        if (l !== null) {
          const v = !rule || rule === 'auto' ? +(+l / 240).toFixed(2) : null;
          set('line-height', v !== null ? (Math.abs(v - (base.line ?? 1.15)) < 0.01 ? null : v) : `${+l / 20}pt`);
        }
      } else if (n === 'shd') { const f = att(e, 'fill'); if (f && f !== 'auto') css.push(`background-color:#${f}`); }
      else if (n === 'pBdr') {
        for (const side of e.children) {
          const v = att(side, 'val');
          if (!v || v === 'nil' || v === 'none') continue;
          const sideName = { top: 'top', bottom: 'bottom', left: 'left', right: 'right', start: 'left', end: 'right' }[side.localName];
          if (sideName) css.push(`border-${sideName}:${Math.max(0.5, +(att(side, 'sz') || 4) / 8)}pt ${v === 'double' ? 'double' : v === 'dotted' ? 'dotted' : v.startsWith('dash') ? 'dashed' : 'solid'} #${(att(side, 'color') || '000000').replace('auto', '000000')};padding-${sideName}:${Math.min(4, +(att(side, 'space') || 1))}pt`);
        }
      } else if (n === 'pageBreakBefore' && onOff(e)) pageBreakBefore = true;
      else if (n === 'keepNext' && onOff(e)) keepNext = true;
      else if (n === 'tabs') tabs = kids(e, 'tab').filter(t => att(t, 'val') !== 'clear').map(t => `${{ right: 'R', center: 'C' }[att(t, 'val')] || 'L'}:${(+att(t, 'pos') / 1440 * 2.54).toFixed(2)}`).join(',');
    }
    // conteúdo
    const st = { breaks: 0, field: null };
    const inner = await runsToHtml(p, c, pStyleR, base, st);
    const attrs = [];
    if (meta.cls) attrs.push(`class="${meta.cls}"`);
    if (css.length) attrs.push(`style="${css.join(';')}"`);
    if (keepNext && !/^h\d/.test(meta.tag || '')) attrs.push('data-keep-next="1"');
    if (tabs) attrs.push(`data-tabs="${tabs}"`);
    const tag = inList ? 'p' : (meta.tag || 'p');
    return { html: `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${inner || '<br>'}</${tag}>`, pageBreakBefore, breaks: st.breaks };
  }

  async function runsToHtml(el, c, pStyleR, base, st, wrap = {}) {
    let out = '';
    for (const n of el.children) {
      const name = n.localName;
      if (name === 'r') out += await runToHtml(n, c, pStyleR, base, st, wrap);
      else if (name === 'hyperlink') {
        const rid = n.getAttributeNS(NS.r, 'id') || n.getAttribute('r:id');
        const anchor = att(n, 'anchor');
        const href = rid && c.rels[rid] ? c.rels[rid].target : anchor ? '#' + anchor : '';
        const inner = await runsToHtml(n, c, pStyleR, base, st, wrap);
        out += href && !/^\s*(javascript|vbscript|data):/i.test(href) ? `<a href="${esc(href)}">${inner}</a>` : inner;
      } else if (name === 'ins' || name === 'moveTo') out += `<ins class="tc-ins" data-author="${esc(att(n, 'author') || '')}" data-date="${esc(att(n, 'date') || '')}">${await runsToHtml(n, c, pStyleR, base, st, wrap)}</ins>`;
      else if (name === 'del' || name === 'moveFrom') out += `<del class="tc-del" data-author="${esc(att(n, 'author') || '')}" data-date="${esc(att(n, 'date') || '')}">${await runsToHtml(n, c, pStyleR, base, st, { ...wrap, del: true })}</del>`;
      else if (name === 'fldSimple') {
        const instr = (att(n, 'instr') || '').trim().split(/\s+/)[0].toUpperCase();
        if (['PAGE', 'NUMPAGES', 'DATE', 'TIME', 'AUTHOR', 'TITLE', 'FILENAME'].includes(instr)) out += `<span class="wc-field" data-field="${instr}" contenteditable="false">${esc(n.textContent)}</span>`;
        else if (instr === 'MERGEFIELD') { const f = (att(n, 'instr') || '').trim().split(/\s+/)[1]; out += `<span class="mm-field" data-field="${esc(f)}" contenteditable="false">«${esc(f)}»</span>`; }
        else out += await runsToHtml(n, c, pStyleR, base, st, wrap);
      } else if (name === 'smartTag' || name === 'sdt' || name === 'sdtContent' || name === 'customXml') out += await runsToHtml(kid(n, 'sdtContent') || n, c, pStyleR, base, st, wrap);
      else if (name === 'bookmarkStart') { const nm = att(n, 'name'); if (nm && !nm.startsWith('_GoBack')) out += `<a id="${esc(nm)}" name="${esc(nm)}"></a>`; }
      else if (name === 'commentRangeStart') { const cm = c.comments[att(n, 'id')]; if (cm) out += `<!--cs:${att(n, 'id')}-->`; }
      else if (name === 'commentRangeEnd') out += `<!--ce:${att(n, 'id')}-->`;
      else if (name === 'oMath') out += Equations.html(Equations.fromOmml(n)).replace('&nbsp;', '');
      else if (name === 'oMathPara') for (const om of n.children) { if (om.localName === 'oMath') out += Equations.html(Equations.fromOmml(om)).replace('&nbsp;', ''); }
    }
    // transformar marcadores de comentário em spans
    return out.replace(/<!--cs:(\d+)-->([\s\S]*?)<!--ce:\1-->/g, (m, id, inner) => {
      const cm = c.comments[id];
      return `<span class="comment" data-text="${esc(cm.text)}" data-author="${esc(cm.author)}" data-initials="${esc(cm.initials)}" data-date="${esc(cm.date)}" title="${esc(cm.author)}: ${esc(cm.text)}">${inner}</span>`;
    }).replace(/<!--c[se]:\d+-->/g, '');
  }

  async function runToHtml(r, c, pStyleR, base, st, wrap) {
    const rPr = kid(r, 'rPr');
    const rs = att(kid(rPr, 'rStyle'), 'val');
    const charKey = rs ? c.keyOfStyle(rs) : null;
    const rsChain = rs && !charKey ? c.chain(rs).map(s => s.rPr) : [];
    const props = collectR([...rsChain, rPr]);
    const merged = { ...pStyleR, ...props };
    const baseCmp = { font: base.font, size: base.size, color: base.color, bold: base.bold, italic: base.italic, smallCaps: base.smallCaps };
    let css = runCss(merged, baseCmp);
    let out = '';
    for (const e of r.children) {
      const n = e.localName;
      if (n === 't' || n === 'delText') out += esc(e.textContent);
      else if (n === 'tab') out += '<span class="wc-tab" contenteditable="false">\t</span>';
      else if (n === 'br' || n === 'cr') {
        const t = att(e, 'type');
        if (t === 'page') { st.breaks++; } else if (t === 'column') out += ''; else out += '<br>';
      } else if (n === 'noBreakHyphen') out += '‑';
      else if (n === 'softHyphen') out += '&shy;';
      else if (n === 'sym') { const ch = att(e, 'char'); if (ch) out += `&#x${ch.replace(/^F0/i, '')};`; }
      else if (n === 'fldChar') {
        const t = att(e, 'fldCharType');
        if (t === 'begin') st.field = { instr: '', phase: 'instr' };
        else if (t === 'separate' && st.field) st.field.phase = 'result';
        else if (t === 'end' && st.field) {
          const f = st.field.instr.trim().split(/\s+/)[0].toUpperCase();
          if (['PAGE', 'NUMPAGES'].includes(f)) out += `<span class="wc-field" data-field="${f}" contenteditable="false">1</span>`;
          st.field = null;
        }
      } else if (n === 'instrText' && st.field) st.field.instr += e.textContent;
      else if (n === 'drawing' || n === 'pict' || n === 'object') {
        const blip = e.getElementsByTagNameNS(NS.a, 'blip')[0];
        const rid = blip ? (blip.getAttributeNS(NS.r, 'embed') || blip.getAttribute('r:embed')) : (e.getElementsByTagNameNS(NS.v, 'imagedata')[0]?.getAttributeNS(NS.r, 'id'));
        const src = rid ? await c.media(c.rels, c.base, rid) : null;
        if (src) {
          const ext = e.getElementsByTagNameNS(NS.wp, 'extent')[0];
          const w = ext ? Math.round(+ext.getAttribute('cx') / 9525) : null;
          const anchor = e.getElementsByTagNameNS(NS.wp, 'anchor')[0];
          const align = anchor?.getElementsByTagNameNS(NS.wp, 'align')[0]?.textContent;
          const fl = anchor ? (align === 'right' ? 'float:right;margin:0 0 6pt 9pt' : 'float:left;margin:0 9pt 6pt 0') : '';
          out += `<img src="${src}" style="${w ? `width:${w}px;` : ''}${fl}" alt="">`;
        } else {
          const txt = e.getElementsByTagNameNS(W, 'txbxContent')[0];
          if (txt) out += `<span class="textbox">${esc(txt.textContent)}</span>`;
        }
      } else if (n === 'footnoteReference' || n === 'endnoteReference') {
        const kind = n.startsWith('foot') ? 'footnote' : 'endnote';
        const arr = kind === 'footnote' ? c.state.fn : c.state.en;
        const label = kind === 'footnote' ? arr.length + 1 : toRoman(arr.length + 1);
        arr.push({ n: label, text: c.notes[kind][att(e, 'id')] || '' });
        out += `<sup class="${kind === 'footnote' ? 'fn-ref' : 'en-ref'}">${label}</sup>`;
      }
    }
    if (st.field?.phase === 'instr') return '';
    if (!out) return '';
    if (props.va === 'superscript') out = `<sup>${out}</sup>`;
    else if (props.va === 'subscript') out = `<sub>${out}</sub>`;
    const cls = [];
    if (charKey) cls.push(DocStyles.metaOf(charKey).cls);
    if (merged.hidden) cls.push('hidden-text');
    if (merged.outline) cls.push('fx-outline');
    if (merged.shadow) cls.push('fx-shadow');
    if (merged.emboss) cls.push('fx-emboss');
    if (merged.imprint) cls.push('fx-imprint');
    if (css || cls.length) out = `<span${cls.length ? ` class="${cls.join(' ')}"` : ''}${css ? ` style="${css}"` : ''}>${out}</span>`;
    return out;
  }

  async function tblToHtml(tbl, c) {
    const rows = kids(tbl, 'tr');
    const grid = kids(kid(tbl, 'tblGrid'), 'gridCol').map(g => +att(g, 'w') / 15);
    const total = grid.reduce((s, v) => s + v, 0);
    const tblPr = kid(tbl, 'tblPr');
    const bdr = kid(tblPr, 'tblBorders');
    const styleId = att(kid(tblPr, 'tblStyle'), 'val');
    const styleBorders = styleId && c.styleMap[styleId] ? true : false;
    const noBorders = bdr ? [...bdr.children].every(b => ['nil', 'none'].includes(att(b, 'val'))) : !styleBorders;
    const vm = [];
    const cellsHtml = [];
    for (let ri = 0; ri < rows.length; ri++) {
      const row = [];
      let col = 0;
      for (const tc of kids(rows[ri], 'tc')) {
        const tcPr = kid(tc, 'tcPr');
        const span = +(att(kid(tcPr, 'gridSpan'), 'val') || 1);
        const vMerge = kid(tcPr, 'vMerge');
        const vmVal = vMerge ? att(vMerge, 'val') || 'continue' : null;
        if (vmVal === 'continue' && vm[col]) { vm[col].rs++; col += span; continue; }
        const shd = att(kid(tcPr, 'shd'), 'fill');
        const va = att(kid(tcPr, 'vAlign'), 'val');
        const w = grid.slice(col, col + span).reduce((s, v) => s + v, 0);
        let bcss = noBorders ? 'border:none;' : '';
        for (const side of kids(kid(tcPr, 'tcBorders'), 'top').concat(kids(kid(tcPr, 'tcBorders'), 'bottom'), kids(kid(tcPr, 'tcBorders'), 'left'), kids(kid(tcPr, 'tcBorders'), 'right'), kids(kid(tcPr, 'tcBorders'), 'start'), kids(kid(tcPr, 'tcBorders'), 'end'))) {
          const sn = { start: 'left', end: 'right' }[side.localName] || side.localName, v = att(side, 'val');
          bcss += !v || v === 'nil' || v === 'none' ? `border-${sn}:none;` : `border-${sn}:${Math.max(0.5, +(att(side, 'sz') || 4) / 8)}pt ${v === 'double' ? 'double' : v === 'dotted' ? 'dotted' : v.startsWith('dash') ? 'dashed' : 'solid'} #${(att(side, 'color') || '000000').replace('auto', '000000')};`;
        }
        const cell = { span, rs: 1, html: await bodyToHtml(tc, c), css: `${total ? `width:${(w / total * 100).toFixed(1)}%;` : ''}${shd && shd !== 'auto' ? `background-color:#${shd};` : ''}${va ? `vertical-align:${va === 'center' ? 'middle' : va};` : ''}${bcss}` };
        if (vmVal === 'restart') vm[col] = cell; else vm[col] = null;
        row.push(cell);
        col += span;
      }
      cellsHtml.push(row);
    }
    const body = cellsHtml.map(r => `<tr>${r.map(cl => `<td${cl.span > 1 ? ` colspan="${cl.span}"` : ''}${cl.rs > 1 ? ` rowspan="${cl.rs}"` : ''} style="${cl.css}">${cl.html || '<br>'}</td>`).join('')}</tr>`).join('');
    return `<table border="1" cellspacing="0" cellpadding="0"><tbody>${body}</tbody></table>`;
  }

  return { write, read };
})();

function toRoman(n) {
  const map = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}
