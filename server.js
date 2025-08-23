// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());

// ===== Vars de ambiente =====
const VERIFY_TOKEN   = process.env.VERIFY_TOKEN "copydigital123";       // ex.: copydigital123
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN "EAAKf0evy6agBPTBzr2ecxgccTPPl7bvi74AJZAypYSkPWeoacvHOwAXIdJEOCDswnGBpZBeYno7vYp0wygf235iAC7rWWeiOfpbEbryZBBZCt8sOwZC6KNsVC56ZCXMVzew23rkSTOWsmVKG9TDyjxoYyvl9MuCPgMGPIrUFJkHsKmo06nPyS013rZApe8VqARsOAZDZD";     // token PERMANENTE (EA....) do System User
const PHONE_NUMBER_ID= process.env.PHONE_NUMBER_ID"725458220655578";    // 725458220655578

// Confere se vars existem (ajuda muito nos logs)
if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.log("⚠️ Faltam variáveis de ambiente:",
    { has_VERIFY_TOKEN: !!VERIFY_TOKEN, has_WHATSAPP_TOKEN: !!WHATSAPP_TOKEN, has_PHONE_NUMBER_ID: !!PHONE_NUMBER_ID }
  );
}

// ===== Webhook verify (GET) =====
app.get("/webhook", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado com sucesso.");
      return res.status(200).send(challenge);
    }
    console.log("❌ Webhook verification falhou.", { mode, tokenOk: token === VERIFY_TOKEN });
    return res.sendStatus(403);
  } catch (err) {
    console.error("❌ [GET /webhook] erro:", err);
    return res.sendStatus(500);
  }
});

// ===== Recebimento (POST) =====
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📩 Evento recebido:", JSON.stringify(body));

    // Estrutura padrão do webhook
    const change = body?.entry?.[0]?.changes?.[0];
    const msg = change?.value?.messages?.[0];
    const from = msg?.from;                // telefone do remetente
    const text = msg?.text?.body || "";    // texto recebido

    // Só responde a mensagens de texto
    if (from && text) {
      let reply;
      if (/^oi$|^ol[áa]$/i.test(text.trim())) {
        reply = "Olá! 👋 Eu sou o atendimento da Copy Digital. Para começar, pode me dizer seu nome?";
      } else if (/^menu$|^op(ç|c)oes$/i.test(text.trim())) {
        reply = "Escolha uma opção:\n1️⃣ Tráfego Pago\n2️⃣ Landing Pages\n3️⃣ Automações";
      } else {
        reply = `Recebi: "${text}". Digite "menu" para ver as opções.`;
      }

      await sendMessage(from, reply);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ [POST /webhook] erro:", err);
    return res.sendStatus(500);
  }
});

// ===== Envio de mensagem =====
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

    const text = await r.text();
    if (!r.ok) {
      console.error("❌ Falha ao enviar mensagem:", r.status, text);
    } else {
      console.log("✅ Mensagem enviada:", text);
    }
  } catch (e) {
    console.error("❌ Erro no fetch da Graph:", e);
  }
}

// Healthcheck simples (opcional)
app.get("/", (_req, res) => res.status(200).send("OK"));

// Porta do Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot rodando na porta ${PORT}`));
