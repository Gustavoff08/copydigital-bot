// server.js
// Copia Digital Bot — WhatsApp Business API (token permanente)

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===== Variáveis de ambiente =====
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;         // ex.: "copydigital123"
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;     // token PERMANENTE (System User)
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;   // ex.: "7254528202655578"

if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.warn(
    "⚠️ Faltam variáveis de ambiente. Configure VERIFY_TOKEN, WHATSAPP_TOKEN e PHONE_NUMBER_ID no Render."
  );
}

// ===== Healthcheck =====
app.get("/", (_req, res) => {
  res.status(200).send("Copy Digital Bot up ✅");
});

// ===== Verificação do webhook (GET) =====
app.get("/webhook", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ WEBHOOK_VERIFIED");
      return res.status(200).send(challenge); // devolve o 9999 do Meta
    }
    return res.sendStatus(403);
  } catch (e) {
    console.error("❌ Erro na verificação do webhook:", e);
    return res.sendStatus(500);
  }
});

// ===== Recebimento de mensagens (POST) =====
app.post("/webhook", async (req, res) => {
  // Confirma o recebimento para o Meta o mais rápido possível
  res.sendStatus(200);

  try {
    // Log bruto do evento (útil para depuração)
    console.log("📩 Evento recebido:", JSON.stringify(req.body, null, 2));

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || !messages[0]) return; // nada a processar

    const msg = messages[0];
    const from = msg.from; // número do cliente (sem +)
    let userText = "";

    // Tipos comuns de mensagem
    if (msg.type === "text") {
      userText = msg.text?.body?.trim() || "";
    } else if (msg.type === "interactive") {
      const inter = msg.interactive;
      userText =
        inter?.button_reply?.title ||
        inter?.list_reply?.title ||
        inter?.nfm_reply?.response_json ||
        "";
    } else if (msg.type === "reaction") {
      userText = `Reagiu com: ${msg.reaction?.emoji || ""}`;
    } else {
      userText = `[${msg.type}]`;
    }

    console.log(`💬 De ${from}: ${userText}`);

    // Resposta simples: ecoa o que o usuário mandou
    const resposta =
      userText && userText !== "[unsupported]"
        ? `Você disse: ${userText}`
        : "Oi! 👋 Recebi sua mensagem. Como posso ajudar?";

    await sendText(from, resposta);
  } catch (e) {
    console.error("❌ Erro processando mensagem:", e);
  }
});

// ===== Helper: enviar texto =====
async function sendText(to, text) {
  try {
    const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

    const body = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("❌ Erro ao enviar mensagem:", r.status, err);
    } else {
      const ok = await r.json();
      console.log("✅ Mensagem enviada:", JSON.stringify(ok));
    }
  } catch (e) {
    console.error("❌ Falha no fetch de envio:", e);
  }
}

// ===== Start =====
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
