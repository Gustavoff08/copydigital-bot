import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// Tokens do Meta
const VERIFY_TOKEN = "seu_verify_token";
const PAGE_ACCESS_TOKEN = "seu_page_access_token";

// Memória simples (vai zerar quando reiniciar o servidor)
const sessions = {};

// Endpoint de verificação
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Endpoint de mensagens
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages && messages[0]) {
      const msg = messages[0];
      const from = msg.from; // número do usuário
      const text = msg.text?.body;

      // Recupera ou cria sessão
      if (!sessions[from]) {
        sessions[from] = { stage: "inicio" };
      }

      let reply = "";

      // Fluxo básico
      if (sessions[from].stage === "inicio") {
        reply = "Oi! Eu sou o atendimento da Copy Digital 😊 Qual o seu nome?";
        sessions[from].stage = "perguntar_nome";
      } else if (sessions[from].stage === "perguntar_nome") {
        sessions[from].nome = text;
        reply = `Prazer, ${text}! Como posso te ajudar hoje?`;
        sessions[from].stage = "menu";
      } else if (sessions[from].stage === "menu") {
        reply = "Temos estas opções:\n1️⃣ Tráfego pago\n2️⃣ Landing Pages\n3️⃣ Automações\n\nDigite o número da opção.";
        sessions[from].stage = "esperando_opcao";
      } else if (sessions[from].stage === "esperando_opcao") {
        if (text === "1") reply = "✅ Ótimo! Vou te explicar sobre gestão de tráfego pago...";
        else if (text === "2") reply = "✅ Legal! Nossas landing pages são otimizadas para conversão...";
        else if (text === "3") reply = "✅ Show! Criamos automações para economizar seu tempo...";
        else reply = "❌ Não entendi. Digite 1, 2 ou 3.";
      }

      // Envia a resposta via API do WhatsApp
      await axios.post(
        `https://graph.facebook.com/v17.0/${value.metadata.phone_number_id}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          text: { body: reply },
        },
        { headers: { Authorization: `Bearer ${PAGE_ACCESS_TOKEN}` } }
      );
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.listen(3000, () => console.log("Webhook rodando na porta 3000"));
