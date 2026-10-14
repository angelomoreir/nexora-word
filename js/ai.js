'use strict';
/* =========================================================
   Nexora IA — assistente de escrita com Groq (tier gratuito).
   A chave fica em prefs.groqKey (localStorage); chamadas para
   https://api.groq.com/openai/v1/chat/completions e
   /audio/transcriptions (Whisper).
   ========================================================= */
const AI = (() => {
  const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  const AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
  const MODELS = [
    ['openai/gpt-oss-120b', 'GPT-OSS 120B (melhor qualidade)'],
    ['openai/gpt-oss-20b', 'GPT-OSS 20B (mais rápido)'],
    ['qwen/qwen3.8-27b', 'Qwen 3.8 27B'],
  ];
  const SYS = 'És o assistente de escrita do Nexora Word, um processador de texto. Responde sempre em português de Portugal (pt-PT), salvo instrução em contrário. Responde apenas com o resultado pedido, sem explicações nem comentários.';
  const SYS_HTML = SYS + ' Quando pedirem HTML, responde só com HTML válido, sem markdown nem cercas de código.';

  const DEFAULT_KEY = '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';
  prefs.groqKey ??= DEFAULT_KEY;
  const key = () => (prefs.groqKey || '').trim();
  const model = () => prefs.aiModel || MODELS[0][0];

  async function setup() {
    const res = await dialog({
      title: 'Nexora IA — Configurar Groq',
      width: 440,
      body: `<div class="msg"><i class="ic" data-icon="ai"></i><div>O Nexora IA usa a API gratuita da <b>Groq</b>.<br><br>1. Cria uma conta gratuita em <b>console.groq.com</b><br>2. Em <b>API Keys → Create API Key</b>, gera uma chave<br>3. Cola-a aqui em baixo (fica guardada apenas neste computador)</div></div>
        <label>Chave da API (gsk_…):<input id="ai-key" type="password" value="${esc(key())}" autocomplete="off"></label>
        <label>Modelo:${sel('ai-model', MODELS, model())}</label>`,
      buttons: [{ label: 'Guardar', primary: true, value: ov => ({ k: $('#ai-key', ov).value.trim(), m: $('#ai-model', ov).value }) }, { label: 'Cancelar', value: null }],
    });
    if (!res) return false;
    prefs.groqKey = res.k;
    prefs.aiModel = res.m;
    savePrefs();
    if (res.k) infoBox('Nexora IA configurado. A chave fica guardada apenas neste computador.');
    return !!res.k;
  }

  async function ask(user, sys = SYS, maxTok = 2048, history = null, onDelta = null) {
    if (!key() && !(await setup())) return null;
    const messages = [{ role: 'system', content: sys }, ...(history || []), { role: 'user', content: user }];
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key() },
        body: JSON.stringify({ model: model(), temperature: 0.4, max_tokens: maxTok, stream: !!onDelta, messages }),
      });
    } catch { throw new Error('Sem ligação à API da Groq. Verifica a Internet.'); }
    if (res.status === 401 || res.status === 403) { prefs.groqKey = ''; savePrefs(); throw new Error('A chave da API foi recusada. Configura o Nexora IA novamente.'); }
    if (res.status === 429) throw new Error('Limite do tier gratuito da Groq atingido. Espera um momento e tenta de novo.');
    if (!res.ok) throw new Error('Erro da API Groq (' + res.status + ').');
    if (onDelta) {
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = '', acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim();
          if (d === '[DONE]') break;
          try { acc += JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch { /* linha parcial */ }
        }
        onDelta(acc);
      }
      if (!acc.trim()) throw new Error('A IA não devolveu resposta.');
      return acc.trim();
    }
    const j = await res.json();
    const t = j.choices?.[0]?.message?.content?.trim();
    if (!t) throw new Error('A IA não devolveu resposta.');
    return t;
  }

  const stripFences = t => t.replace(/^\s*```(?:html|json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const parseJson = t => {
    const s = stripFences(t);
    const i = s.search(/[{[]/);
    const j = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (i < 0 || j <= i) throw new Error('Resposta sem JSON.');
    return JSON.parse(s.slice(i, j + 1));
  };

  /* ---------- Texto seleccionado ---------- */
  function selText() {
    const r = currentRange();
    if (!r || !inDoc(r.startContainer)) return null;
    return r;
  }
  const ctxText = (r, around = 800) => {
    const doc = editor.innerText;
    const sel = r.toString();
    const i = doc.indexOf(sel);
    if (i < 0) return doc.slice(0, 4000);
    return doc.slice(Math.max(0, i - around), i) + '⟦' + sel + '⟧' + doc.slice(i + sel.length, i + sel.length + around);
  };
  const ctxBefore = (n = 600) => {
    const r = currentRange();
    if (!r) return '';
    const pre = document.createRange();
    pre.selectNodeContents(editor); pre.setEnd(r.startContainer, r.startOffset);
    return pre.toString().slice(-n);
  };
  const ctxAfter = (n = 200) => {
    const r = currentRange();
    if (!r) return '';
    const post = document.createRange();
    post.selectNodeContents(editor); post.setStart(r.endContainer, r.endOffset);
    return post.toString().slice(0, n);
  };

  const busy = body => body.innerHTML = `<div class="ai-busy">A pensar<span class="ai-dots"><i>.</i><i>.</i><i>.</i></span></div>`;
  const err = (body, e) => body.innerHTML = `<div class="cb-hint" style="color:#b00020">${esc(e.message)}</div>`;

  /* Substitui a selecção (ou insere no cursor) com texto da IA. */
  function applyResult(range, text) {
    if (range) setRange(range);
    editor.focus();
    const author = settings.trackChanges ? ' data-author="Nexora IA"' : '';
    const tag = settings.trackChanges ? 'ins' : 'span';
    exec('insertHTML', `<${tag}${author}${settings.trackChanges ? ' class="tc-ins"' : ''}>${esc(text).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</${tag}>`);
  }
  const insHtml = html => { editor.focus(); exec('insertHTML', sanitize(html)); };

  /* Pré-visualização ao hover: aplica a sugestão temporariamente. */
  let pv = null;
  function previewOn(range, html) {
    if (pv || !range || range.collapsed) return;
    setRange(range);
    const r = getSelection().rangeCount ? getSelection().getRangeAt(0) : null;
    if (!r || r.collapsed) return;
    const frag = r.extractContents();
    const span = document.createElement('span');
    span.className = 'ai-pv';
    span.innerHTML = html;
    r.insertNode(span);
    pv = { frag, span, nodes: [...frag.childNodes] };
  }
  function previewOff() {
    if (!pv) return;
    const { frag, span, nodes } = pv; pv = null;
    span.replaceWith(frag);
    if (nodes.length) {
      const r = document.createRange();
      r.setStartBefore(nodes[0]); r.setEndAfter(nodes[nodes.length - 1]);
      setRange(r);
    }
  }

  function showResult(body, label, out, range) {
    body.innerHTML = `${label ? `<div class="cb-hint"><b>${esc(label)}</b></div>` : ''}<div class="ai-out">${esc(out).replace(/\n/g, '<br>')}</div>
      <div class="ai-actions">
        <button class="std" id="ai-ins">Inserir</button>
        ${range && !range.collapsed ? '<button class="std primary" id="ai-rep" title="Mantém o rato sobre o botão para pré-visualizar">Substituir Selecção</button>' : '<button class="std primary" id="ai-rep">Inserir no Documento</button>'}
        <button class="std" id="ai-copy">Copiar</button>
      </div>`;
    const rep = $('#ai-rep', body);
    const insert = () => { previewOff(); applyResult(range, out); TaskPane.close(); editor.focus(); };
    rep?.addEventListener('click', insert);
    if (range && !range.collapsed) {
      rep?.addEventListener('mouseenter', () => previewOn(range, esc(out).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')));
      rep?.addEventListener('mouseleave', previewOff);
    }
    $('#ai-ins', body)?.addEventListener('click', () => { previewOff(); applyResult(null, out); editor.focus(); });
    $('#ai-copy', body)?.addEventListener('click', () => navigator.clipboard?.writeText(out));
  }

  async function run(label, promptOf, opts = {}) {
    const r = selText();
    const sel = r && !r.collapsed ? r.toString().trim() : '';
    if (opts.needsSel !== false && !sel && opts.allowEmpty !== true) {
      return infoBox('Selecciona primeiro o texto que queres ' + label.toLowerCase() + '.', 'info');
    }
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      let first = true;
      const out = await ask(promptOf(sel, r), SYS, 2048, null, acc => {
        if (first) { first = false; body.innerHTML = `${label ? `<div class="cb-hint"><b>${esc(label)}</b></div>` : ''}<div class="ai-out" id="ai-live"></div>`; }
        const live = $('#ai-live', body);
        if (live) { live.innerHTML = esc(acc).replace(/\n/g, '<br>'); live.scrollTop = live.scrollHeight; }
      });
      if (!out) { TaskPane.close(); return; }
      showResult(body, label, out, r);
    } catch (e) { TaskPane.close(); infoBox(esc(e.message), 'warning'); }
  }

  /* ---------- Painel do Assistente (chat com histórico) ---------- */
  let chat = [];
  function pane() {
    const body = TaskPane.open('ai', 'Nexora IA', `
      <div class="cb-hint">Conversa com o Nexora IA sobre a selecção ou o documento — "reescreve mais formal", "que dados faltam?", "propõe um título". O histórico mantém-se enquanto o painel estiver aberto.</div>
      <div class="ai-chat" id="ai-chat"></div>
      <textarea id="ai-q" style="height:56px" placeholder="Escreve a tua instrução…"></textarea>
      <button class="std primary" id="ai-go" style="width:100%">Enviar</button>
      <div class="ai-quick">
        <button class="std" data-ai="rewrite">Reescrever</button>
        <button class="std" data-ai="fix">Corrigir</button>
        <button class="std" data-ai="expand">Expandir</button>
        <button class="std" data-ai="shorten">Encurtar</button>
        <button class="std" data-ai="summarize">Resumir</button>
        <button class="std" data-ai="continue">Continuar</button>
      </div>`, { width: 280 });
    const chatEl = $('#ai-chat', body);
    const render = () => {
      chatEl.innerHTML = chat.map(m => `<div class="ai-msg ${m.role}">${esc(m.content).replace(/\n/g, '<br>')}${m.role === 'assistant' ? ' <a href="#" class="ai-msg-ins" data-i="">inserir</a>' : ''}</div>`).join('');
      $$('.ai-msg-ins', chatEl).forEach((a, i) => {
        const msgs = chat.filter(m => m.role === 'assistant');
        a.onclick = e => { e.preventDefault(); applyResult(null, msgs[i].content); };
      });
      chatEl.scrollTop = chatEl.scrollHeight;
    };
    render();
    const go = async q => {
      chat.push({ role: 'user', content: q });
      render();
      chat.push({ role: 'assistant', content: '…' });
      render();
      try {
        const r = selText();
        const ctx = r && !r.collapsed ? `Texto seleccionado (entre ⟦ ⟧):\n\n${ctxText(r)}` : `Documento:\n\n${editor.innerText.slice(0, 5000)}`;
        const history = chat.slice(0, -2).slice(-8);
        const out = await ask(q, SYS, 2048, [...history, { role: 'user', content: ctx }], acc => {
          chat[chat.length - 1].content = acc;
          render();
        });
        chat.pop();
        if (out === null) return;
        chat.push({ role: 'assistant', content: out });
      } catch (e) { chat.pop(); chat.push({ role: 'assistant', content: '⚠ ' + e.message }); }
      render();
    };
    $('#ai-go', body).addEventListener('click', () => { const q = $('#ai-q', body).value.trim(); if (q) { $('#ai-q', body).value = ''; go(q); } });
    $('#ai-q', body).addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#ai-go', body).click(); } });
    $$('.ai-quick button', body).forEach(b => b.addEventListener('click', () => go(ACTIONS[b.dataset.ai])));
  }

  /* ---------- Ditado por voz (Whisper) ---------- */
  let rec = null, chunks = [];
  async function dictate() {
    if (rec) { rec.stop(); return; }
    if (!key() && !(await setup())) return;
    if (!navigator.mediaDevices?.getUserMedia) return infoBox('Este browser não suporta gravação de áudio.');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { return infoBox('Sem acesso ao microfone. Permite o acesso e tenta de novo.', 'warning'); }
    chunks = [];
    rec = new MediaRecorder(stream);
    const mime = rec.mimeType || 'audio/webm';
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      rec = null;
      const blob = new Blob(chunks, { type: mime });
      MessageBar.show('Nexora IA: a transcrever o áudio…');
      try {
        const fd = new FormData();
        fd.append('file', blob, 'ditado.webm');
        fd.append('model', 'whisper-large-v3');
        fd.append('language', 'pt');
        const res = await fetch(AUDIO_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + key() }, body: fd });
        if (!res.ok) throw new Error('Erro de transcrição (' + res.status + ').');
        const j = await res.json();
        MessageBar.hide();
        const t = (j.text || '').trim();
        if (t) { editor.focus(); exec('insertText', t + ' '); History.setLabel('Ditado por Voz'); changed(); }
        else infoBox('Não foi detectada fala no áudio.');
      } catch (e) { MessageBar.hide(); infoBox(esc(e.message), 'warning'); }
    };
    rec.start();
    MessageBar.show('<b>A gravar…</b> Fala normalmente. O áudio é transcrito com o Whisper da Groq.', 'Parar e Transcrever', () => dictate());
  }

  /* ---------- Copiloto (texto fantasma) ---------- */
  const copilot = { on: false, timer: 0, el: null, text: '', busy: false, last: 0 };
  function hideGhost() { copilot.el?.remove(); copilot.el = null; copilot.text = ''; }
  function showGhost(text) {
    hideGhost();
    const r = currentRange();
    if (!r || !r.collapsed || !inDoc(r.startContainer)) return;
    const marker = document.createElement('span');
    marker.textContent = '​';
    r.insertNode(marker);
    const rect = marker.getBoundingClientRect();
    marker.remove();
    if (!rect || (!rect.top && !rect.left)) return;
    const el = document.createElement('div');
    el.className = 'ai-ghost';
    el.textContent = text;
    el.style.left = rect.left + 'px';
    el.style.top = rect.top + 'px';
    document.body.append(el);
    copilot.el = el;
    copilot.text = text;
  }
  async function suggest() {
    if (!copilot.on || copilot.busy || Date.now() - copilot.last < 3000) return;
    const r = currentRange();
    if (!r || !r.collapsed || !inDoc(r.startContainer)) return;
    const before = ctxBefore(500);
    if (before.trim().length < 10) return;
    copilot.busy = true; copilot.last = Date.now();
    try {
      const out = await ask(`Continua este texto com no máximo 12 palavras, sem repetir o que já está escrito. Responde só com a continuação:\n\n«${before}»`, SYS, 400);
      if (out && copilot.on && currentRange()?.collapsed) showGhost(out.split('\n')[0].trim());
    } catch { /* silencioso — o copiloto não interrompe */ }
    copilot.busy = false;
  }
  editor.addEventListener('input', () => {
    if (!copilot.on) return;
    hideGhost();
    clearTimeout(copilot.timer);
    copilot.timer = setTimeout(suggest, 1400);
  });
  editor.addEventListener('keydown', e => {
    if (!copilot.el) return;
    if (e.key === 'Tab') { e.preventDefault(); const t = copilot.text; hideGhost(); exec('insertText', t); History.setLabel('Sugestão Nexora IA'); changed(); }
    else if (e.key === 'Escape' || e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') hideGhost();
  }, true);
  editor.addEventListener('blur', hideGhost);
  document.addEventListener('scroll', hideGhost, true);
  function copilotToggle() {
    copilot.on = !copilot.on;
    if (!copilot.on) hideGhost();
    $('#btn-aicopilot')?.classList.toggle('active', copilot.on);
    infoBox(copilot.on ? 'Copiloto activado. Faz uma pausa a escrever e a IA sugere a continuação — <b>Tab</b> aceita, <b>Esc</b> ignora.' : 'Copiloto desactivado.');
  }

  /* ---------- Ler em voz alta ---------- */
  function readAloud() {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); MessageBar.hide(); return; }
    const sel = selText();
    const txt = (sel && !sel.collapsed ? sel.toString() : editor.innerText).trim().slice(0, 6000);
    if (!txt) return infoBox('Não há texto para ler.');
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'pt-PT';
    const v = speechSynthesis.getVoices().find(v => v.lang?.startsWith('pt'));
    if (v) u.voice = v;
    u.onend = u.onerror = () => MessageBar.hide();
    speechSynthesis.speak(u);
    MessageBar.show('Nexora Word está a ler o documento em voz alta.', 'Parar', () => { speechSynthesis.cancel(); MessageBar.hide(); });
  }

  /* ---------- Geração de conteúdo ---------- */
  async function generate() {
    const res = await dialog({
      title: 'Gerar Documento com Nexora IA', width: 460,
      body: `<div class="cb-hint">Descreve o documento que queres (assunto, estrutura, extensão). A IA gera texto já formatado com estilos.</div>
        <label>Descrição:<textarea id="ag-d" style="height:80px" placeholder="Ex.: relatório trimestral de vendas com introdução, 3 secções e conclusão"></textarea></label>
        ${chk('ag-r', 'Substituir o conteúdo actual do documento', !editor.innerText.trim())}`,
      buttons: [{ label: 'Gerar', primary: true, value: ov => ({ d: $('#ag-d', ov).value.trim(), r: $('#ag-r', ov).checked }) }, { label: 'Cancelar', value: null }],
    });
    if (!res || !res.d) return;
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      const out = await ask(`Gera o seguinte documento em HTML usando apenas <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>:\n\n${res.d}`, SYS_HTML, 4000);
      if (!out) { TaskPane.close(); return; }
      TaskPane.close();
      editor.focus();
      if (res.r) exec('selectAll');
      insHtml(stripFences(out) + '<p><br></p>');
      History.setLabel('Gerar Documento com IA');
    } catch (e) { TaskPane.close(); infoBox(esc(e.message), 'warning'); }
  }

  async function aiTable() {
    const res = await dialog({
      title: 'Tabela com Nexora IA', width: 420,
      body: '<label>Descreve a tabela:<textarea id="at-d" style="height:70px" placeholder="Ex.: comparar 3 planos de subscrição (nome, preço, limites)"></textarea></label>',
      buttons: [{ label: 'Gerar', primary: true, value: ov => $('#at-d', ov).value.trim() }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      const out = await ask(`Gera uma tabela HTML para o seguinte pedido. Usa <table>, primeira linha com <th>, dados plausíveis se não forem dados no pedido:\n\n${res}`, SYS_HTML, 1500);
      if (!out) { TaskPane.close(); return; }
      TaskPane.close();
      let html = stripFences(out);
      if (!/<table/i.test(html)) html = `<table><tr><td>${esc(out).replace(/\n/g, '</td></tr><tr><td>')}</td></tr></table>`;
      html = html.replace(/<table/i, '<table border="1" cellspacing="0" cellpadding="4" data-new="1"');
      insHtml(html + '<p><br></p>');
      History.setLabel('Inserir Tabela (IA)');
    } catch (e) { TaskPane.close(); infoBox(esc(e.message), 'warning'); }
  }

  async function aiSmartArt() {
    const res = await dialog({
      title: 'SmartArt com Nexora IA', width: 420,
      body: '<label>Descreve o diagrama:<textarea id="as-d" style="height:70px" placeholder="Ex.: funil de vendas com 4 fases"></textarea></label>',
      buttons: [{ label: 'Gerar', primary: true, value: ov => $('#as-d', ov).value.trim() }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      const out = await ask(`Gera um gráfico SmartArt para: ${res}. Responde só com JSON {"layout":"list|process|cycle|hierarchy|pyramid|radial","items":[{"text":"rótulo curto","level":0}]}. Máximo 6 formas; para "hierarchy" usa level 1 e 2 para subníveis.`, SYS, 600);
      if (!out) { TaskPane.close(); return; }
      TaskPane.close();
      const spec = parseJson(out);
      spec.colorful = true;
      const { canvas } = SmartArt.render(spec);
      insertOrReplace(canvasToImg(canvas, Math.min(editor.clientWidth, 520), 'smartart', spec, 'SmartArt'), null);
      History.setLabel('Inserir SmartArt (IA)');
    } catch (e) { TaskPane.close(); infoBox(esc('Não foi possível gerar o diagrama: ' + e.message), 'warning'); }
  }

  /* ---------- Tradução ---------- */
  async function translateAI() {
    const r = selText();
    const selTxt = r && !r.collapsed ? r.toString().trim() : '';
    if (!selTxt) return infoBox('Selecciona o texto que pretendes traduzir.');
    const lang = await dialog({
      title: 'Traduzir com Nexora IA', width: 300,
      body: `<label>Traduzir para:${sel('tr-l', ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Holandês', 'Português do Brasil'], 'Inglês')}</label>`,
      buttons: [{ label: 'Traduzir', primary: true, value: ov => $('#tr-l', ov).value }, { label: 'Cancelar', value: null }],
    });
    if (!lang) return;
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      const out = await ask(`Traduz o seguinte texto para ${lang}. Responde só com a tradução:\n\n«${selTxt}»`, SYS, 3000);
      if (!out) { TaskPane.close(); return; }
      showResult(body, 'Tradução para ' + lang, out, r);
    } catch (e) { TaskPane.close(); infoBox(esc(e.message), 'warning'); }
  }

  /* ---------- Continuar lista ---------- */
  async function listContinue() {
    const r = selText();
    const list = nodeEl(r?.startContainer)?.closest('ul, ol');
    if (!list) return infoBox('Coloca o cursor dentro de uma lista para a continuar.');
    const items = $$('li', list).map(li => li.innerText.trim()).filter(Boolean);
    try {
      const out = await ask(`Continua esta lista com mais 3 itens no mesmo estilo, um por linha, sem numeração nem marcas:\n\n${items.slice(-8).join('\n')}`, SYS, 300);
      if (!out) return;
      const html = out.split('\n').map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean).slice(0, 3).map(l => `<li>${esc(l)}</li>`).join('');
      if (html) { list.insertAdjacentHTML('beforeend', html); History.setLabel('Continuar Lista (IA)'); changed(); }
    } catch (e) { infoBox(esc(e.message), 'warning'); }
  }

  /* ---------- Propriedades automáticas ---------- */
  async function docProps() {
    const txt = editor.innerText.trim();
    if (!txt) return infoBox('O documento está vazio.');
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      const out = await ask(`Analisa este documento e responde só com JSON {"title":"…","subject":"…","keywords":"a, b, c","description":"resumo de 1-2 frases"}:\n\n${txt.slice(0, 5000)}`, SYS, 600);
      if (!out) { TaskPane.close(); return; }
      const p = parseJson(out);
      settings.props = { ...(settings.props || {}), title: p.title || '', subject: p.subject || '', keywords: p.keywords || '', description: p.description || '' };
      changed();
      body.innerHTML = `<div class="cb-hint"><b>Propriedades preenchidas:</b></div><div class="ai-out"><b>Título:</b> ${esc(p.title || '—')}<br><b>Assunto:</b> ${esc(p.subject || '—')}<br><b>Palavras-chave:</b> ${esc(p.keywords || '—')}<br><b>Comentários:</b> ${esc(p.description || '—')}</div><div class="ai-actions"><button class="std" id="ai-props">Ver Propriedades…</button></div>`;
      $('#ai-props', body).onclick = () => CMD.properties?.();
    } catch (e) { TaskPane.close(); infoBox(esc('Não foi possível analisar: ' + e.message), 'warning'); }
  }

  /* ---------- Análise do documento ---------- */
  function analyze() {
    const txt = editor.innerText.trim();
    if (!txt) return infoBox('O documento está vazio.');
    run('Análise do Documento', () => `Analisa o documento seguinte e aponta problemas: inconsistências (datas, números, nomes), contradições, termos usados sem definição, frases confusas. Lista os problemas encontrados, um por linha; se estiver tudo bem, diz "Não foram encontrados problemas.":\n\n«${txt.slice(0, 6000)}»`, { needsSel: false, allowEmpty: true });
  }

  /* ---------- Legendas automáticas ---------- */
  async function captions() {
    const targets = $$('img, table', editor).filter(el => !el.closest('.caption') && !el.parentElement?.classList.contains('caption'));
    if (!targets.length) return infoBox('O documento não tem imagens nem tabelas para legendar.');
    const todo = targets.filter(el => {
      const sib = el.tagName === 'TABLE' ? el : blockOf(el) || el;
      return ![sib.nextElementSibling, sib.previousElementSibling].some(s => s?.classList?.contains('caption'));
    });
    if (!todo.length) return infoBox('Todas as imagens e tabelas já têm legenda.');
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      const ctxs = todo.slice(0, 10).map((el, i) => {
        const around = el.parentElement?.innerText || el.closest('p')?.innerText || '';
        return `${i + 1}. ${el.tagName === 'TABLE' ? 'Tabela' : 'Figura'} (alt: "${el.alt || ''}", contexto: "${around.slice(0, 160)}")`;
      }).join('\n');
      const out = await ask(`Gera legendas curtas (até 12 palavras cada) para os seguintes elementos. Responde só JSON [{"i":1,"t":"texto da legenda"},…]:\n\n${ctxs}\n\nContexto do documento: ${editor.innerText.slice(0, 800)}`, SYS, 800);
      if (!out) { TaskPane.close(); return; }
      TaskPane.close();
      const list = parseJson(out);
      let n = 0;
      for (const c of list) {
        const el = todo[c.i - 1];
        if (!el || !c.t) continue;
        const label = el.tagName === 'TABLE' ? 'Tabela' : 'Figura';
        const anchor = el.tagName === 'TABLE' ? el : blockOf(el) || el;
        anchor.insertAdjacentHTML('afterend', `<p class="caption" data-label="${label}">${label} <span class="wc-seq" data-seq="${label}" contenteditable="false">${$$('p.caption[data-label="' + label + '"]', editor).length + 1}</span>: ${esc(c.t)}</p>`);
        n++;
      }
      if (n) { History.setLabel('Legendas Automáticas (IA)'); changed(); infoBox(`${n} legenda(s) inserida(s).`); }
      else infoBox('A IA não gerou legendas.');
    } catch (e) { TaskPane.close(); infoBox(esc('Não foi possível gerar legendas: ' + e.message), 'warning'); }
  }

  /* ---------- Responder a comentário ---------- */
  async function commentReply() {
    const c = nodeEl(currentRange()?.startContainer)?.closest('.comment') || $$('.comment', editor)[0];
    if (!c) return infoBox('O documento não tem comentários.');
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      const out = await ask(`Texto comentado: «${c.innerText}»\nComentário: «${c.dataset.text || ''}»\n\nEscreve uma resposta útil e curta ao comentário (sugestão ou esclarecimento).`, SYS, 500);
      if (!out) { TaskPane.close(); return; }
      body.innerHTML = `<div class="cb-hint"><b>Resposta sugerida ao comentário:</b></div><div class="ai-out">${esc(out)}</div><div class="ai-actions"><button class="std primary" id="ai-cr">Adicionar ao Comentário</button><button class="std" id="ai-cr-copy">Copiar</button></div>`;
      $('#ai-cr', body).onclick = () => {
        c.dataset.text = (c.dataset.text || '') + '\n— Nexora IA: ' + out;
        c.title = (c.title || '') + '\nNexora IA: ' + out;
        Review.layoutBalloons();
        changed();
        TaskPane.close();
        infoBox('Resposta adicionada ao comentário.');
      };
      $('#ai-cr-copy', body).onclick = () => navigator.clipboard?.writeText(out);
    } catch (e) { TaskPane.close(); infoBox(esc(e.message), 'warning'); }
  }

  /* ---------- Carta de impressão em série ---------- */
  async function mergeLetter() {
    const m = MailMerge.mm();
    if (!m.fields?.length) return infoBox('Selecciona primeiro os destinatários (Correspondência → Seleccionar Destinatários).');
    const res = await dialog({
      title: 'Carta de Impressão em Série com IA', width: 460,
      body: `<div class="cb-hint">Campos disponíveis: <b>${m.fields.map(esc).join(', ')}</b>. A IA escreve a carta e insere os campos de união.</div><label>Descreve a carta:<textarea id="ml-d" style="height:70px" placeholder="Ex.: aviso de renovação de contrato, tom cordial"></textarea></label>`,
      buttons: [{ label: 'Gerar', primary: true, value: ov => $('#ml-d', ov).value.trim() }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    const body = TaskPane.open('ai', 'Nexora IA', '', { width: 260 });
    busy(body);
    try {
      const out = await ask(`Escreve o corpo de uma carta de impressão em série. Usa os marcadores ${m.fields.map(f => '«' + f + '»').join(', ')} exactamente onde os dados devem aparecer. ${res}. Devolve só o texto da carta.`, SYS, 2500);
      if (!out) { TaskPane.close(); return; }
      TaskPane.close();
      const html = esc(out)
        .replace(/«\s*([^»]+?)\s*»/g, (_, f) => m.fields.some(x => x.toLowerCase() === f.toLowerCase()) ? `<span class="mm-field" data-field="${esc(m.fields.find(x => x.toLowerCase() === f.toLowerCase()))}" contenteditable="false">«${esc(f)}»</span>` : `«${esc(f)}»`)
        .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
      insHtml('<p>' + html + '</p>');
      History.setLabel('Carta de Impressão em Série (IA)');
    } catch (e) { TaskPane.close(); infoBox(esc(e.message), 'warning'); }
  }

  /* ---------- Comando por linguagem natural ---------- */
  const NL_OPS = {
    bold: null, italic: null, underline: null, strikeThrough: null, subscript: null, superscript: null,
    clearFormat: null, selectAll: null, pageBreak: null, grow: null, shrink: null,
    justifyLeft: null, justifyCenter: null, justifyRight: null, justifyFull: null, indent: null, outdent: null,
    insertUnorderedList: null, insertOrderedList: null,
    foreColor: 'cor CSS ex. "#c00000" ou "blue"', fontName: 'nome do tipo de letra ex. "Calibri"', fontSize: 'tamanho em pontos ex. "14"',
    highlight: null, style: 'normal|h1|h2|h3|title|subtitle|quote', lineSpacing: 'espaçamento ex. "1.5"',
    changeCase: 'upper|lower|capitalize|sentence|toggle',
  };
  async function nlCommand() {
    const res = await dialog({
      title: 'Nexora IA — Comando por Texto', width: 440,
      body: `<div class="cb-hint">Escreve o que queres fazer no documento ou na selecção — ex.: "põe isto a negrito e azul", "centra e aumenta para 18", "lista com marcas".</div>
        <label>Instrução:<input id="nl-c" placeholder="põe os títulos a azul escuro"></label>`,
      buttons: [{ label: 'Executar', primary: true, value: ov => $('#nl-c', ov).value.trim() }, { label: 'Cancelar', value: null }],
    });
    if (!res) return;
    const opsList = Object.entries(NL_OPS).map(([c, a]) => a ? `${c}(arg: ${a})` : c).join(', ');
    try {
      const out = await ask(`Converte a instrução num array JSON de acções [{"cmd":"…","arg":"…"}]. Comandos permitidos (sem arg salvo indicação): ${opsList}. Responde só com o JSON. Instrução: "${res}"`, SYS, 400);
      if (!out) return;
      const ops = parseJson(out);
      let done = 0;
      for (const op of (Array.isArray(ops) ? ops : [ops])) {
        if (op && NL_OPS.hasOwnProperty(op.cmd) && CMD[op.cmd]) { CMD[op.cmd](op.arg); done++; }
      }
      infoBox(done ? `${done} acção(ões) executada(s).` : 'A IA não devolveu acções válidas.', done ? 'info' : 'warning');
    } catch (e) { infoBox(esc(e.message), 'warning'); }
  }

  /* ---------- Caixa inline (Ctrl+Espaço) ---------- */
  let inlineEl = null;
  const closeInline = () => { inlineEl?.remove(); inlineEl = null; };
  const caretRect = () => {
    const r = currentRange(); if (!r) return null;
    const m = document.createElement('span'); m.textContent = '​';
    r.insertNode(m); const rect = m.getBoundingClientRect(); m.remove();
    return rect;
  };
  function inlinePrompt() {
    if (inlineEl) return closeInline();
    const r = selText() || currentRange();
    if (!r) return;
    const rect = caretRect(); if (!rect) return;
    const saved = r.cloneRange();
    inlineEl = document.createElement('div');
    inlineEl.className = 'ai-inline';
    inlineEl.tabIndex = -1;
    inlineEl.innerHTML = `<input id="ai-in-q" placeholder="Pede ao Nexora IA… (Enter executa, Esc fecha)"><div class="ai-in-out hidden"></div>`;
    inlineEl.style.left = Math.min(Math.max(8, rect.left), innerWidth - 310) + 'px';
    inlineEl.style.top = Math.min(rect.bottom + 6, innerHeight - 200) + 'px';
    document.body.append(inlineEl);
    const inp = $('#ai-in-q', inlineEl);
    inp.focus();
    inp.addEventListener('keydown', async e => {
      e.stopPropagation();
      if (e.key === 'Escape') return closeInline();
      if (e.key !== 'Enter' || !inp.value.trim()) return;
      const q = inp.value.trim();
      const outEl = $('.ai-in-out', inlineEl);
      outEl.classList.remove('hidden');
      outEl.textContent = 'A pensar…';
      inp.disabled = true;
      try {
        const sel = saved && !saved.collapsed ? saved.toString().trim() : '';
        const prompt = sel
          ? `Texto seleccionado:\n«${sel}»\n\nInstrução: ${q}. Responde só com o resultado.`
          : `Contexto do documento:\n«${editor.innerText.slice(0, 2000)}»\n\nInstrução: ${q}. Responde só com o texto a inserir no documento, sem explicações.`;
        const out = await ask(prompt, SYS, 1500, null, acc => { outEl.innerHTML = esc(acc).replace(/\n/g, '<br>'); });
        if (!out) return closeInline();
        outEl.innerHTML = esc(out).replace(/\n/g, '<br>') + `<div class="ai-actions"><button class="std primary" id="ai-in-ok">Inserir (Enter)</button><button class="std" id="ai-in-esc">Fechar (Esc)</button></div>`;
        $('#ai-in-ok', inlineEl).onclick = () => { applyResult(saved, out); closeInline(); };
        $('#ai-in-esc', inlineEl).onclick = closeInline;
        inlineEl.addEventListener('keydown', e2 => {
          e2.stopPropagation();
          if (e2.key === 'Enter') { applyResult(saved, out); closeInline(); }
          if (e2.key === 'Escape') closeInline();
        });
        inlineEl.focus();
      } catch (e2) { outEl.innerHTML = `<span style="color:#b00020">${esc(e2.message)}</span>`; inp.disabled = false; }
    });
  }
  editor.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === ' ' || e.code === 'Space')) { e.preventDefault(); inlinePrompt(); }
  });
  document.addEventListener('mousedown', e => { if (inlineEl && !inlineEl.contains(e.target)) closeInline(); });

  /* ---------- Comandos ---------- */
  const ACTIONS = {
    rewrite: 'Reescreve o texto seguinte, mantendo o significado mas melhorando a clareza e o estilo. Responde só com o texto reescrito.',
    fix: 'Corrige a ortografia e a gramática do texto seguinte. Responde só com o texto corrigido.',
    expand: 'Expande o texto seguinte, desenvolvendo as ideias com mais detalhe, mantendo o mesmo estilo e registo.',
    shorten: 'Encurta o texto seguinte, mantendo as ideias principais. Responde só com o texto encurtado.',
    summarize: 'Resume o texto seguinte de forma clara e concisa.',
    continue: 'Continua o texto seguinte de forma natural, mantendo o estilo e o assunto. Escreve 2 a 4 frases de continuação.',
  };
  const TONES = {
    formal: 'Reescreve o texto seguinte num registo formal e profissional. Responde só com o texto.',
    informal: 'Reescreve o texto seguinte num registo informal e próximo. Responde só com o texto.',
    concise: 'Reescreve o texto seguinte de forma muito mais concisa. Responde só com o texto.',
    persuasive: 'Reescreve o texto seguinte de forma persuasiva e convincente. Responde só com o texto.',
    simple: 'Reescreve o texto seguinte em linguagem simples, acessível a qualquer leitor. Responde só com o texto.',
  };
  const LABELS = { rewrite: 'Reescrever', fix: 'Corrigir', expand: 'Expandir', shorten: 'Encurtar', summarize: 'Resumir', continue: 'Continuar' };
  const act = k => () => run(LABELS[k], sel => ACTIONS[k] + '\n\n«' + sel + '»');

  Object.assign(CMD, {
    aiSetup: setup, aiPane: pane,
    aiRewrite: act('rewrite'), aiFix: act('fix'), aiExpand: act('expand'),
    aiShorten: act('shorten'), aiSummarize: act('summarize'), aiContinue: act('continue'),
    aiTone: t => run('Reescrever (' + t + ')', sel => TONES[t] + '\n\n«' + sel + '»'),
    aiDictate: dictate, aiCopilot: copilotToggle, aiReadAloud: readAloud,
    aiGenerate: generate, aiTable, aiSmartArt, aiTranslate: translateAI,
    aiListContinue: listContinue, aiDocProps: docProps, aiAnalyze: analyze,
    aiCaptions: captions, aiCommentReply: commentReply, aiMergeLetter: mergeLetter,
    aiCommand: nlCommand, aiInline: inlinePrompt,
  });

  return { ask, pane, key };
})();
