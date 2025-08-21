# Copy Digital Bot

Bot de atendimento da Copy Digital integrado ao WhatsApp Business API e (opcionalmente) ao OpenAI Assistants API.

## Como usar
1. Crie variáveis de ambiente (no Render) usando `.env.example` como referência.
2. Faça deploy como **Web Service** (`node server.js`).
3. No Meta (WhatsApp > Webhooks), configure:
   - URL de callback: `https://SEU-APP.onrender.com/webhook`
   - Verify Token: `copydigital123` (ou outro que você definir)
   - Assine o campo: `messages`

## Teste
Envie mensagem para o número de teste do WhatsApp (na tela da Meta). O bot responde com uma saudação.
Quando tiver créditos na OpenAI, descomente o código do Assistente no `server.js` e adicione `OPENAI_API_KEY` + `ASSISTANT_ID`.
