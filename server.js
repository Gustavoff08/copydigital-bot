// server.js (ESM)

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===== Variáveis de ambiente =====
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN "copydigital123";       // ex.: "copysdigital123"
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;   // token PERMANENTE do System User
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID "7254528202655578"; // ex.: "7254528202655578"

// Checagem básica das envs em produção
if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.warn(
    "⚠️  Faltam variáveis de ambiente. Configure VERIFY_TOKEN, WHATSAPP_TOKEN e PHONE_NUMBER_ID no Render."
  );
}

// ===== Healthcheck =====
app.get("/", (_req, res) => {
  res.status(200).send("Copy Digital Bot up ✅");
});

// ===== Verificação do webhook (GET /webhook) =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso ✅");
    return res.status(200).send(challenge);
  }

  console.log("Falha na verificação do webhook ❌");
  return res.sendStatus(403);
});

// ===== Recepção de mensagens (POST /webhook) =====
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    // A API envia events em value/changes/entry...
    if (body?.object === "whatsapp_business_account") {
      const changes = body.entry?.[0]?.changes?.[0]?.value;

      // Quando há mensagem do usuário
      const msg = changes?.messages?.[0];
      if (msg) {
        const from = msg.from; // número do usuário (com DDI)
        let incomingText = "";

        if (msg.type === "text") {
          incomingText = (msg.text?.body || "").trim();
        } else if (msg.type === "interactive") {
          // se for botão/lista
          incomingText =
            msg.interactive?.button_reply?.title ||
            msg.interactive?.list_reply?.title ||
            "";
        } else {
          incomingText = `[${msg.type}] recebido`;
        }

        console.log("📩 Mensagem recebida:", { from, incomingText });

        // Lógica simples de resposta (ajuste como quiser)
        let reply = `Você disse: ${incomingText}`;
        const lower = incomingText.toLowerCase();

        if (["oi", "olá", "ola", "hello", "hi"].some(w => lower.includes(w))) {
          reply =
            "Oi! 👋 Eu sou o bot da Copy Digital.\n\nEnvie qualquer mensagem que eu repito 🙂";
        }

        await sendMessage(from, reply);
      }

      // Sempre responder 200 em até 10s para o Meta considerar entregue
      return res.sendStatus(200);
    }

    // Eventos que não são do WhatsApp Business
    return res.sendStatus(404);
  } catch (err) {
    console.error("Erro no webhook:", err);
    return res.sendStatus(500);
  }
});

// ===== Função para enviar mensagem pelo WhatsApp =====
async function sendMessage(to, message) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message },
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("❌ Erro ao enviar mensagem:", json);
    } else {
      console.log("✅ Mensagem enviada:", json);
    }
    return json;
  } catch (e) {
    console.error("❌ Falha no fetch (envio):", e);
    throw e;
  }
}

// ===== Inicialização =====
app.listen(PORT, () => {
  console.log(`Copy Digital Bot rodando na porta ${PORT} ▶️`);
});
