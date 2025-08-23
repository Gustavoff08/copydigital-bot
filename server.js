// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());

// ===== CONFIG DIRETA (APENAS PARA TESTE) =====
// ⚠️ Em produção, mova para variáveis de ambiente!
const VERIFY_TOKEN    = "copydigital123"; // o mesmo que você colocou no campo "Verificar token" no Meta
const WHATSAPP_TOKEN  = "EAAKf0evy6agBPfc3BxZAtG8QAaGbdeSZAr3FKwgb4ZCZBrNmwqvJMcU34uqSpF7fbYSOOh0JusLFi5ZCWAwJuPFgnzwF8KmnSY96iPWZA1nlEdodj7su08VoXa4P5sRZAVxi70CXJZBT2DfNcAzwigZCI7di1ysTeiVkUGxOSZC5iXWmsjAFDIivFZC5zd6iEdm6fB9TwZDZD";
const PHONE_NUMBER_ID = "725452820655578";  // ID do número

if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.error("⚠️ Faltou configuração:", { VERIFY_TOKEN: !!VERIFY_TOKEN, WHATSAPP_TOKEN: !!WHATSAPP_TOKEN, PHONE_NUMBER_ID: !!PHONE_NUMBER_ID });
}

// ===== VERIFICAÇÃO DO WEBHOOK =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Falha na verificação do webhook");
    res.sendStatus(403);
  }
});

// ===== RECEBIMENTO DE MENSAGENS =====
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📩 Webhook recebido:", JSON.stringify(body));

    const change = body?.entry?.[0]?.changes?.[0];
    const msg = change?.value?.messages?.[0];
    const from = msg?.from;
    const text = msg?.text?.body || "";

    if (from && text) {
      let reply;

      if (/^oi$|^ol[áa]$/i.test(text.trim())) {
        reply = "Olá 👋 Eu sou o bot da Copy Digital. Qual seu nome?";
      } else if (/menu/i.test(text.trim())) {
        reply = "📌 Menu:\n1️⃣ Tráfego Pago\n2️⃣ Landing Pages\n3️⃣ Automações";
      } else {
        reply = `Você disse: "${text}"`;
      }

      await sendMessage(from, reply);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Erro no POST /webhook:", e);
    res.sendStatus(500);
  }
});

// ===== ENVIO DE MENSAGEM =====
async function sendMessage(to, message) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    text: { body: message }
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await r.text();
    if (!r.ok) {
      console.error("❌ Erro ao enviar:", r.status, result);
    } else {
      console.log("✅ Enviado:", result);
    }
  } catch (e) {
    console.error("❌ Erro no fetch:", e);
  }
}

// ===== HEALTHCHECK =====
app.get("/", (_req, res) => res.status(200).send("Bot online 🚀"));

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
