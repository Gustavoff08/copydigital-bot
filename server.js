// server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Armazena sessões dos usuários
const userSessions = {};

// Função para enviar mensagem no WhatsApp
async function sendWhatsAppText(to, message) {
  const url = "https://graph.facebook.com/v21.0/" + process.env.PHONE_NUMBER_ID + "/messages";

  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: message }
    })
  });
}

// Webhook de verificação do Meta
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verificado com sucesso!");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Webhook para receber mensagens
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
      const from = message.from; // Número do usuário
      const text = message.text?.body;

      if (!userSessions[from]) {
        userSessions[from] = { step: 0 };
      }

      const session = userSessions[from];

      if (session.step === 0) {
        await sendWhatsAppText(from, "Olá 👋! Eu sou o atendimento da *Copy Digital*. Para começarmos, qual é o seu *nome*?");
        session.step = 1;
      } 
      else if (session.step === 1) {
        session.nome = text;
        await sendWhatsAppText(from, `Prazer, ${session.nome}! Agora, pode me informar seu *e-mail*?`);
        session.step = 2;
      } 
      else if (session.step === 2) {
        session.email = text;
        await sendWhatsAppText(from, `Perfeito ✅! Anotei seus dados:\n\n📌 Nome: ${session.nome}\n📌 E-mail: ${session.email}\n\nEm breve, nossa equipe entrará em contato! 🚀`);
        session.step = 3;
      }
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
