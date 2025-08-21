import express from "express";
import fetch from "node-fetch";
// import OpenAI from "openai";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;          // ex: copydigital123
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;      // EAAG...
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;    // 72545...
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;      // sk-...
const ASSISTANT_ID = process.env.ASSISTANT_ID;          // asst_xxx

// const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Healthcheck
app.get("/", (_req, res) => res.status(200).send("Copy Digital Bot up ✅"));

// Webhook verification (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// Webhook receiver (POST)
app.post("/webhook", async (req, res) => {
  try {
    const change = req.body.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const type = message.type;
    let userText = "";

    if (type === "text") userText = message.text?.body ?? "";
    if (type === "interactive") {
      const i = message.interactive;
      userText = i?.button_reply?.title || i?.list_reply?.title ||
                 i?.button_reply?.id || i?.list_reply?.id || "";
    }

    let reply = "Olá 👋! Eu sou o atendimento da Copy Digital. Para começar, pode me dizer seu nome?";
    // When you have OpenAI credits, enable the assistant call below
    /*
    if (openai && ASSISTANT_ID) {
      reply = await replyFromAssistant(userText || "Olá!");
    }
    */
    await sendText(from, reply);
  } catch (err) {
    console.error("Erro no webhook:", err);
  }
  res.sendStatus(200);
});

async function sendText(to, body) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: body.slice(0, 4000) }
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const t = await r.text().catch(()=> "");
    console.error("Falha ao enviar WhatsApp:", r.status, t);
  }
}

// OpenAI assistant hook (optional)
/*
async function replyFromAssistant(userText) {
  try {
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, { role: "user", content: userText });
    await openai.beta.threads.runs.create(thread.id, { assistant_id: ASSISTANT_ID });
    await new Promise(r=> setTimeout(r, 1200));
    const list = await openai.beta.threads.messages.list(thread.id);
    return list.data?.[0]?.content?.[0]?.text?.value ||
           "Certo! Me diga seu objetivo com tráfego/automação 🙂";
  } catch(e) {
    console.error("Erro OpenAI:", e);
    return "Tive um probleminha agora. Pode repetir sua pergunta?";
  }
}
*/

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
