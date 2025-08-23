const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express().use(bodyParser.json());

// Configurações
const VERIFY_TOKEN = "copydigital123"; // use a mesma string na verificação do webhook no Meta
const WHATSAPP_TOKEN = "EAAKf0evy6agBPTBzr2ecxgccTPPl7bvi74AJZAypYSkPWeoacvHOwAXIdJEOCDswnGBpZBeYno7vYp0wygf235iAC7rWWeiOfpbEbryZBBZCt8sOwZC6KNsVC56ZCXMVzew23rkSTOWsmVKG9TDyjxoYyvl9MuCPgMGPIrUFJkHsKmo06nPyS013rZApe8VqARsOAZDZD";
const PHONE_NUMBER_ID = "725458220655578";

// Sessões simples em memória
const sessions = new Map();

// Função para enviar mensagens
async function sendMessage(to, message) {
  await fetch(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
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

// Rota de verificação (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Rota para receber mensagens (POST)
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const phone_number = body.entry[0].changes[0].value.metadata.display_phone_number;
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // Número do usuário
      const msg_body = message.text ? message.text.body.trim().toLowerCase() : "";

      console.log(`Mensagem recebida de ${from}: ${msg_body}`);

      if (!sessions.has(from)) {
        sessions.set(from, { step: "menu" });
        await sendMessage(from, 
          "👋 Olá! Seja bem-vindo.\n\nEscolha uma das opções abaixo:\n\n1️⃣ Tráfego Pago\n2️⃣ Landing Pages\n3️⃣ Automações"
        );
      } else {
        const session = sessions.get(from);

        if (session.step === "menu") {
          if (msg_body === "1") {
            await sendMessage(from, "🚀 Tráfego Pago:\nAjudamos sua empresa a atrair clientes com campanhas no Google, Meta e TikTok Ads.");
          } else if (msg_body === "2") {
            await sendMessage(from, "💻 Landing Pages:\nCriamos páginas de alta conversão para aumentar suas vendas.");
          } else if (msg_body === "3") {
            await sendMessage(from, "🤖 Automações:\nAutomatizamos processos para você economizar tempo e vender mais.");
          } else {
            await sendMessage(from, "❌ Opção inválida.\nDigite apenas: 1, 2 ou 3.");
            return res.sendStatus(200);
          }

          // Depois de responder, mostra novamente o menu
          await sendMessage(from, "\nDigite 1️⃣, 2️⃣ ou 3️⃣ para voltar ao menu.");
        }
      }
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Inicia servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
