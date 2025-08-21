const express = require("express");
const bodyParser = require("body-parser");
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Aqui armazenamos os usuários e seus nomes (pode ser em banco de dados depois)
let usuarios = {};

app.post("/whatsapp", (req, res) => {
  const twiml = new MessagingResponse();
  const from = req.body.From; // Número do cliente
  const body = req.body.Body.trim(); // Mensagem recebida

  // Se o usuário ainda não está salvo
  if (!usuarios[from]) {
    // Se ele ainda não respondeu o nome
    if (body.toLowerCase() === "oi" || body.toLowerCase() === "olá") {
      twiml.message("Olá 👋! Eu sou o atendimento da Copy Digital. Para começar, pode me dizer seu nome?");
    } else {
      // Salva o nome informado
      usuarios[from] = { nome: body };
      twiml.message(`Prazer, ${body}! ✅ Agora me diga, como posso te ajudar hoje?`);
    }
  } else {
    // Usuário já está salvo, então seguimos o atendimento
    twiml.message(`Oi ${usuarios[from].nome}, estou aqui para ajudar você!`);
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.listen(3000, () => {
  console.log("Bot WhatsApp rodando na porta 3000");
});
