// server.js
// Bot WhatsApp – Copy Digital
// by você ;)  - pronto pra usar no Render

const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// ====== VARIÁVEIS DE AMBIENTE ======
const VERIFY_TOKEN = process.env.VERIFY_TOKEN "copydigital123";        // ex: "copydigital123"
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN "EAAKf0evy6agBPTBzr2ecxgccTPPl7bvi74AJZAypYSkPWeoacvHOwAXIdJEOCDswnGBpZBeYno7vYp0wygf235iAC7rWWeiOfpbEbryZBBZCt8sOwZC6KNsVC56ZCXMVzew23rkSTOWsmVKG9TDyjxoYyvl9MuCPgMGPIrUFJkHsKmo06nPyS013rZApe8VqARsOAZDZD";    // System User token (permanente)
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID "725458220655578";  // ex: "725458220655578"

if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.log("[AVISO] Faltam variáveis de ambiente: VERIFY_TOKEN, WHATSAPP_TOKEN, PHONE_NUMBER_ID");
}

// ====== HELPER: ENVIAR TEXTO ======
async function sendText(to, text) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("[ERRO] Envio texto:", resp.status, err);
  } else {
    console.log("[OK] Texto enviado para", to);
  }
}

// ====== HELPER: ENVIAR MENU (LIST) ======
async function sendMenu(to) {
  const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "Copy Digital" },
      body: {
        text:
          "Escolha uma opção abaixo 👇\n\n" +
          "1️⃣ Tráfego Pago\n2️⃣ Landing Pages\n3️⃣ Automações",
      },
      footer: { text: "Equipe Copy Digital" },
      action: {
        button: "Ver opções",
        sections: [
          {
            title: "Serviços",
            rows: [
              { id: "trafego", title: "Tráfego Pago", description: "Gestão de anúncios" },
              { id: "landing", title: "Landing Pages", description: "Páginas que convertem" },
              { id: "automacoes", title: "Automações", description: "Bots e integrações" },
            ],
          },
        ],
      },
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("[ERRO] Envio menu:", resp.status, err);
  } else {
    console.log("[OK] Menu enviado para", to);
  }
}

// ====== WEBHOOK – VERIFICAÇÃO (GET) ======
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[OK] Webhook verificado");
    return res.status(200).send(challenge);
  }

  console.log("[ERRO] Falha na verificação do webhook");
  return res.sendStatus(403);
});

// ====== WEBHOOK – RECEBER MENSAGENS (POST) ======
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body?.object === "whatsapp_business_account") {
      const changes = body.entry?.[0]?.changes?.[0]?.value;
      const messages = changes?.messages;

      if (messages && messages.length > 0) {
        const msg = messages[0];
        const from = msg.from; // número do usuário

        // Texto enviado
        const text = msg.text?.body?.trim() || "";

        // Respostas de lista/botão interativo
        const listReplyId = msg.interactive?.list_reply?.id;
        const buttonReplyId = msg.interactive?.button_reply?.id;

        console.log("Mensagem recebida de", from, ":", text || listReplyId || buttonReplyId || "[interativo]");

        // Regras simples:
        if (listReplyId) {
          // Usuário escolheu uma opção do menu
          switch (listReplyId) {
            case "trafego":
              await sendText(from, "Perfeito! Vamos falar de Tráfego Pago. Qual é o seu objetivo principal?");
              break;
            case "landing":
              await sendText(from, "Show! Landing Pages: prefere uma de captura ou de vendas?");
              break;
            case "automacoes":
              await sendText(from, "Ótimo! Em quais canais você quer automatizar (WhatsApp, Email, etc.)?");
              break;
            default:
              await sendText(from, "Opção recebida. Em que posso ajudar?");
          }
        } else if (buttonReplyId) {
          await sendText(from, "Recebi seu clique. Já vou te direcionar! 😉");
        } else {
          // Texto livre
          const lower = text.toLowerCase();
          if (["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite"].some(w => lower.includes(w))) {
            await sendText(from, "Olá 👋 Tudo bem? Eu sou o assistente da Copy Digital.");
            await sendMenu(from);
          } else {
            await sendText(from, `Recebi sua mensagem: “${text}”`);
            await sendMenu(from);
          }
        }
      }

      return res.sendStatus(200);
    }

    // não é evento do WhatsApp
    return res.sendStatus(404);
  } catch (e) {
    console.error("[ERRO] webhook:", e);
    return res.sendStatus(500);
  }
});

// ====== HEALTHCHECK ======
app.get("/", (_req, res) => res.status(200).send("OK"));

// ====== START ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot rodando na porta ${PORT}`));
