// server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;           // ex: copysuporte
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;       // token do meta
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;     // id do número
const LEAD_WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL || ""; // opcional (Zapier/Make/CRM)

// ============ Sessões em memória (para testes) ============
const sessions = {}; // { [from]: { step, nome, email, servico } }

// --------- helpers ---------
async function sendWhatsAppText(to, message) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });
}

function isValidEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

async function postLeadToWebhook(lead) {
  if (!LEAD_WEBHOOK_URL) return;
  try {
    await fetch(LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
  } catch (e) {
    console.error("Falha ao enviar lead para webhook:", e.message);
  }
}

function menuTexto(nome) {
  return (
    `Perfeito, ${nome}! Agora escolha uma opção:\n\n` +
    `1️⃣ Tráfego Pago\n` +
    `2️⃣ Landing Pages\n` +
    `3️⃣ Automações\n\n` +
    `Digite apenas o número da opção. (ou escreva *reiniciar* para começar de novo)`
  );
}

// ============ Webhook VERIFY ============
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso!");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ============ Webhook RECEIVER ============
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (!body.object) return res.sendStatus(404);

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from; // número do usuário
    const textRaw = message.text?.body || "";
    const text = textRaw.trim();

    // cria sessão se necessário
    if (!sessions[from]) sessions[from] = { step: 0 };

    // comandos universais
    const lower = text.toLowerCase();
    if (["menu", "opções", "opcoes"].includes(lower)) {
      sessions[from].step = 3;
      await sendWhatsAppText(from, menuTexto(sessions[from].nome || "por favor"));
      return res.sendStatus(200);
    }
    if (["reiniciar", "resetar", "começar"].includes(lower)) {
      sessions[from] = { step: 0 };
      await sendWhatsAppText(
        from,
        "Vamos começar de novo! 👇\nQual é o seu *nome*?"
      );
      return res.sendStatus(200);
    }
    if (["ajuda", "help"].includes(lower)) {
      await sendWhatsAppText(
        from,
        "Posso te ajudar com:\n• *menu* – mostra as opções\n• *reiniciar* – recomeça o atendimento"
      );
      return res.sendStatus(200);
    }

    const session = sessions[from];

    // ========== FLUXO ==========
    if (session.step === 0) {
      await sendWhatsAppText(
        from,
        "Olá 👋! Eu sou o atendimento da *Copy Digital*.\nPara começarmos, qual é o seu *nome*?"
      );
      session.step = 1;
      return res.sendStatus(200);
    }

    if (session.step === 1) {
      // salva nome
      session.nome = text;
      await sendWhatsAppText(
        from,
        `Prazer, *${session.nome}*! Agora, pode me informar seu *e-mail*?`
      );
      session.step = 2;
      return res.sendStatus(200);
    }

    if (session.step === 2) {
      // valida e-mail
      if (!isValidEmail(text)) {
        await sendWhatsAppText(
          from,
          "Hmm… esse e-mail não parece válido. Tenta assim: *nome@empresa.com*"
        );
        return res.sendStatus(200);
      }
      session.email = text;
      await sendWhatsAppText(from, menuTexto(session.nome));
      session.step = 3;
      return res.sendStatus(200);
    }

    if (session.step === 3) {
      // escolha do serviço
      if (!["1", "2", "3"].includes(text)) {
        await sendWhatsAppText(from, "Digite *1*, *2* ou *3* para escolher uma opção.");
        return res.sendStatus(200);
      }

      const mapa = {
        "1": "Tráfego Pago",
        "2": "Landing Pages",
        "3": "Automações",
      };
      session.servico = mapa[text];

      // confirma e encerra
      await sendWhatsAppText(
        from,
        `Ótimo! ✅ Anotei seus dados:\n\n` +
          `👤 Nome: *${session.nome}*\n` +
          `✉️ E-mail: *${session.email}*\n` +
          `🧭 Interesse: *${session.servico}*\n\n` +
          `Nosso time vai te chamar em breve. Obrigado! 🚀`
      );

      // envia para webhook/CRM se existir
      await postLeadToWebhook({
        origem: "WhatsApp Copy Digital",
        numero: from,
        nome: session.nome,
        email: session.email,
        servico: session.servico,
        timestamp: new Date().toISOString(),
      });

      // pode manter informações para próximos contatos:
      session.step = 4;
      return res.sendStatus(200);
    }

    // após finalizado, se usuário mandar algo
    if (session.step >= 4) {
      await sendWhatsAppText(
        from,
        "Se precisar de algo, digite *menu* para ver opções ou *reiniciar* para começar de novo. 😉"
      );
      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error("Erro no webhook:", e);
    return res.sendStatus(200);
  }
});

// ============ Start ============
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
