const express = require('express');
const app = express();

const VERIFY_TOKEN   = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Healthcheck
app.get('/', (req, res) => res.status(200).send('Copy Digital Bot up ✅'));

// Verificação do webhook (Setup no Meta → Webhooks)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso.');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Recebe mensagens do WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const messages = value?.messages;
    if (messages && messages[0]) {
      const msg = messages[0];
      const from = msg.from;                            // número do remetente (DDI+DDD+Número)
      const text = msg.text?.body || '';                // texto recebido
      console.log(`Mensagem de ${from}: ${text}`);

      // === sua lógica de resposta ===
      const reply = (text || '').trim().toLowerCase() === 'oi'
        ? 'Oi! 👋 Aqui é o bot da Copy Digital. Como posso ajudar?'
        : `Você disse: "${text}"`;

      await sendText(from, reply);
    }

    // SEMPRE responda 200 rápido para não gerar retries do Meta
    res.sendStatus(200);
  } catch (e) {
    console.error('ERRO no webhook:', e);
    res.sendStatus(500);
  }
});

// Função helper: envia texto via Graph API
async function sendText(to, message) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message }
  };

  // Node 18+ tem fetch global
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('Falha no envio:', r.status, data);
    throw new Error(`Graph error: ${r.status}`);
  }
  console.log('Enviado com sucesso:', data);
}

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});
