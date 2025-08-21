// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'copydigital123';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN "EAAKf0evy6agBPAjsA8n9j5LmOivtlfEJwQ5yOCLzv2TveOnSSGvOjXvjv046qoS7eXWmhWYy64YMzqE6Fd82mr1O5npbIRVxocNHqnR2ZBN8RyZBZAxAvJLNZCXKYMHhiXjnS90akVzgZAGVoTZAZAKkrEe7ldc3GXYnmg4hmY0oZCpktXt1RqYcHyVoWZC23K2Sc9vIydBEAAWzZCcwpcRi9fj402jMsZBUiMxpuyPnBHjFE30WTRJE0IUhNKfnNtaZAQZDZD
";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID "725458220655578";

const sessions = new Map();

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function reply(to, text) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry && req.body.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const message = change && change.value && change.value.messages && change.value.messages[0];

    if (!message || message.type !== 'text') {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = (message.text && message.text.body || '').trim();
    const s = sessions.get(from) || { step: 'ask_name' };

    if (s.step === 'ask_name') {
      await reply(from, 'Ola! Eu sou o atendimento da Copy Digital. Para comecar, pode me dizer seu nome?');
      s.step = 'wait_name';
      sessions.set(from, s);
      return res.sendStatus(200);
    }

    if (s.step === 'wait_name') {
      s.name = text;
      s.step = 'menu';
      sessions.set(from, s);
      const menu =
        'Prazer, ' + s.name + '! Agora me diga, como posso te ajudar hoje?\n\n' +
        '1) Trafego Pago\n' +
        '2) Landing Pages\n' +
        '3) Automacoes\n\n' +
        'Responda com 1, 2 ou 3.';
      await reply(from, menu);
      return res.sendStatus(200);
    }

    if (s.step === 'menu') {
      if (text === '1') {
        await reply(from, 'Perfeito! Vou te conectar com o time de Trafego Pago.');
      } else if (text === '2') {
        await reply(from, 'Beleza! Vou acionar o time de Landing Pages.');
      } else if (text === '3') {
        await reply(from, 'Show! Vamos falar sobre Automacoes.');
      } else {
        await reply(from, 'Por favor, responda apenas com 1, 2 ou 3.');
      }
      return res.sendStatus(200);
    }

    sessions.delete(from);
    return res.sendStatus(200);
  } catch (e) {
    console.error('webhook error:', e);
    return res.sendStatus(200);
  }
});

app.get('/', (_req, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log('WhatsApp bot rodando na porta', PORT);
});
