# Nexora Word

Aplicação web estática (HTML/CSS/JS puro, sem build nem dependências). UI em português (pt-PT). Aspecto inspirado no Office 2007, marca Nexora.

## Estrutura

- `index.html` — estrutura (barra de título, menu Office, friso gerado, réguas, página, barra de estado, menus pendentes, painéis, diálogos)
- `css/style.css` — visual tipo friso; temas Azul/Prateado/Preto via variáveis CSS em `body[data-theme]`
- `js/icons.js`, `js/icons2.js` — ícones SVG (`ICONS`), usados com `<i class="ic" data-icon="nome">`
- `js/zip.js` — escritor/leitor ZIP "stored" para `.docx`
- `js/ribbon.js` — gera os separadores/grupos/botões do friso e os separadores contextuais (`.ctx-set`)
- `js/app.js` — núcleo: DOM, `settings`/`prefs`, comandos `CMD`, edição (`execCommand`), ficheiros, autosave, réguas, `dialog()` genérico
- `js/styles.js` — `DocStyles`: estilos de parágrafo/carácter editáveis, temas do documento, CSS gerado
- `js/history.js` — `History` (anular/refazer próprio, tudo anulável) e `Macros`
- `js/paginate.js` — `Pager`: paginação real em folhas `.sheet`, cabeçalho/rodapé por página, campos Página/NumPáginas, números de linha, quebras
- `js/docx.js` — `DocxIO`: leitura/escrita OOXML nativa (sem mammoth nem altChunk)
- `js/ui.js` — SuperTooltips, mini barra, pré-visualização dinâmica, KeyTips, `TaskPane`, `ContextTabs`, `MessageBar`, `StatusBar`
- `js/dialogs.js` — caixas Tipo de Letra, Parágrafo, Tabulações, Configurar Página, Limites e Sombreado, Propriedades, Imprimir, Opções…
- `js/tables.js` — `TableTools`/`ImageTools` (separadores contextuais, estilos de tabela, limites)
- `js/insert2.js` — `WordArt`, `SmartArt`, `Charts`, `Equations` (MathML↔OMML), `QuickParts`, campos, números de página
- `js/references.js` — `References`: citações/bibliografia, legendas, índices, notas de rodapé/fim
- `js/mail.js` — `MailMerge`: impressão em série (CSV), envelopes, etiquetas
- `js/review.js` — `Review`: Controlar Alterações (`.tc-ins`/`.tc-del`), comentários/balões, comparar, sinónimos
- `js/spell.js` — `Spell` (ortografia pt-PT própria) e `AutoCorrect`
- `js/ai.js` — `AI`: assistente Nexora IA (Groq API gratuita; chave em `prefs.groqKey`, chamada directa a api.groq.com)
- `js/views.js` — `Views`: Esquema de Impressão/Web/Rascunho/Destaque, Leitura em Ecrã Inteiro, Mapa do Documento, miniaturas, dividir janela
- `js/ai.js` — `AI` (Nexora IA): chat com histórico, reescrever/corrigir/resumir/expandir/encurtar/continuar (+tons), ditado por voz (Whisper), copiloto com texto fantasma (Tab aceita), tradução, gerar documento/tabela/SmartArt, legendas automáticas, propriedades automáticas, análise do documento, resposta a comentários, carta de impressão em série, comando por linguagem natural (whitelist em `NL_OPS`), ler em voz alta, caixa inline Ctrl+Espaço (`.ai-inline`), respostas em streaming (SSE, `stream:true`). API Groq (`api.groq.com`); chave em `prefs.groqKey` (localStorage), modelo em `prefs.aiModel`. A chave predefinida em `DEFAULT_KEY` é só para uso local — remover se o projecto for publicado
- `js/boot.js` — arranque + régua interactiva; expõe os módulos em `window` para testes

## Executar
```
python -m http.server 8077
```
Abrir http://localhost:8077

## Convenções

- Comandos do friso/menus: `data-cmd`/`data-arg` despachados pelo objecto global `CMD` (`window.CMD`).
- Comandos novos registam-se com `Object.assign(CMD, {...})` no módulo respectivo.
- Funções referenciadas directamente no objecto `CMD` em `app.js` têm de ser declarações `function` (não `const`), por causa da TDZ.
- Raízes editáveis: `#editor`, `#doc-header`, `#doc-footer`.
- Modelos de documento: objecto `TEMPLATES` em `app.js` (`newDoc` abre galeria). Modo Foco: `CMD.focusMode` em `views.js` (`body.focus-mode`, Esc sai).
- `data-cmd` em clones de vistas (leitura, miniaturas, divisão) mantêm os `id`s — remover ids quebra os selectores CSS (`#editor` etc.).

## Verificar

- `node --check js/<ficheiro>.js` (sintaxe de cada módulo)
- Teste headless: Chrome + puppeteer-core (harness em `%TEMP%\wc-test`); verificar `ERRORS: none` e contagens de `.sheet`, `.ctx-set.show`, `.tc-ins`.
- `.docx` de terceiros e gerados pela app são lidos/escristos nativamente por `DocxIO` (sem rede).
