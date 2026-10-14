# Nexora Word

Editor de texto completo no browser, com interface inspirada no Office 2007 e assistente de IA integrado — tudo em **HTML/CSS/JavaScript puro**, sem dependências nem build.

## 🌐 Demo online

**https://nexora-word.onrender.com**

## Funcionalidades

- **Friso estilo Office 2007** com separadores contextuais (Tabela, Imagem, Cabeçalho/Rodapé), mini barra, KeyTips e SuperTooltips
- **Paginação real** — folhas separadas, cabeçalho/rodapé por página, números de página, números de linha
- **.docx nativo** — leitura e escrita OOXML sem bibliotecas externas (ZIP próprio)
- **Revisão completa** — Controlar Alterações, comentários em balões, comparar documentos
- **Ortografia pt-PT própria** (verificador Hunspell leve), gramática básica, Correcção Automática
- **Referências** — citações, bibliografia, legendas, índices · **Correspondência** — impressão em série, envelopes, etiquetas
- **Vistas** — Impressão, Web, Rascunho, Destaque, Leitura em Ecrã Inteiro, Mapa do Documento, miniaturas, dividir, **Modo Foco**
- **WordArt, SmartArt, gráficos, equações** (MathML↔OMML), marcas d'água, temas do documento
- **Histórico próprio** de Anular/Refazer + gravação de macros

## Nexora IA (Groq)

- **Assistente IA** — chat com histórico sobre o documento, com streaming
- Reescrever (com tons), Corrigir, Resumir, Expandir, Encurtar, Continuar
- **Copiloto** — sugestões de continuação em texto fantasma (Tab aceita)
- **Ditado por voz** — transcrição Whisper
- **Ctrl+Espaço** — pede à IA inline, sem sair do cursor
- Gerar documentos, tabelas, SmartArt e cartas de impressão em série por descrição
- Traduzir, analisar o documento, legendas automáticas, comando por linguagem natural, ler em voz alta

> Nota: a app chama `api.groq.com` directamente do browser. A chave configurável fica em `localStorage` (Rever → Nexora IA → Configurar).

## Correr localmente

```bash
python -m http.server 8077
```

Abrir `http://localhost:8077` — não há nada para instalar.

## Deploy

Inclui `render.yaml` — basta ligar o repo ao [Render](https://render.com) como *Blueprint* e fica online como site estático.

## Estrutura

`index.html` + `css/style.css` + 18 módulos em `js/` (ver `AGENTS.md` para arquitectura e convenções).
