// server.js — Copy Digital Bot (saudação profissional + captura de nome e nicho)
import express from "express";

const app = express();
app.use(express.json());

// ===== ENV =====
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;       // ex.: "copydigital123"
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;   // token PERMANENTE do System User
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // ex.: "7xxxxxxxxxxxxx"

if (!VERIFY_TOKEN || !WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.warn("⚠️ Configure VERIFY_TOKEN, WHATSAPP_TOKEN e PHONE_NUMBER_ID nas Environment vars do Render.");
}

// ===== SESSÕES (memória) =====
/*
  sessions.set(from, {
    step: 'inicio' | 'aguardando_nome_nicho' | 'menu' | 'email' | 'fim',
    nome, nicho, email, servico
  })
*/
const sessions = new Map();

// ===== HELPERS =====
const api = (path) => `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}${path}`;
const norm = (t) => (t || "").toLowerCase().trim();
const isEmail = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((t || "").trim());

async function sendText(to, body) {
  const r = await fetch(api("/messages"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!r.ok) console.error("❌ Envio texto:", r.status, await r.text());
}

async function sendButtons(to, { header, body, footer, buttons }) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      ...(header ? { header: { type: "text", text: header } } : {}),
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  };
  const r = await fetch(api("/messages"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) console.error("❌ Envio botões:", r.status, await r.text());
}

// ===== HEALTH =====
app.get("/", (_req, res) => res.status(200).send("Copy Digital Bot up ✅"));

// ===== WEBHOOK VERIFY (GET) =====
app.get("/webhook", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ WEBHOOK_VERIFIED");
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch (e) {
    console.error("❌ Verify error:", e);
    return res.sendStatus(500);
  }
});

// ===== WEBHOOK RECEIVE (POST) =====
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // responde rápido ao Meta
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];
    if (!msg) return;

    const from = msg.from;
    const profileName = value?.contacts?.[0]?.profile?.name || "";
    const session = sessions.get(from) || { step: "inicio" };

    // Texto ou interação
    const incomingText =
      msg.type === "text"
        ? msg.text?.body?.trim()
        : msg.type === "interactive"
        ? (msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || "")
        : "";

    const n = norm(incomingText);

    // ---------- Fluxo: saudação -> pedir nome + nicho ----------
    if (session.step === "inicio") {
      // detecta saudações comuns
      const isGreeting = ["oi","olá","ola","hey","eae","boa tarde","bom dia","boa noite"].includes(n);
      session.step = "aguardando_nome_nicho";
      if (!session.nome && profileName) session.nome = profileName;
      sessions.set(from, session);

      if (isGreeting) {
        await sendText(
          from,
          "👋 Olá, tudo bem?\n" +
          "Sou o assistente da *Copy Digital*.\n\n" +
          "Para iniciarmos a conversa, me fale por favor:\n" +
          "➡️ Seu *nome*\n" +
          "➡️ E o *nicho/área* em que você trabalha\n\n" +
          "Assim consigo direcionar melhor o atendimento 😉"
        );
      } else {
        await sendText(
          from,
          "Antes de continuarmos, pode me dizer seu *nome* e o *nicho/área* em que você atua? 🙂"
        );
      }
      return;
    }

    if (session.step === "aguardando_nome_nicho") {
      if (!incomingText || incomingText.length < 3) {
        await sendText(from, "Pode me enviar seu *nome* e o *nicho* em que trabalha? Ex.: *Ana — Moda Feminina*");
        return;
      }

      // (Opcional) tentativa simples de separar nome e nicho por hífen/traço
      const parts = incomingText.split(/[-–—]| \| /).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        session.nome = session.nome || parts[0];
        session.nicho = parts.slice(1).join(" - ");
      } else {
        // se não conseguiu separar, guarda tudo em nomeNicho e vai em frente
        session.nome = session.nome || incomingText;
        session.nicho = session.nicho || "";
      }

      session.step = "menu";
      sessions.set(from, session);

      await sendButtons(from, {
        header: "🤖 Copy Digital",
        body:
          `Perfeito, *${session.nome || "obrigado"}*! 🚀\n` +
          (session.nicho ? `Nicho: *${session.nicho}*\n\n` : "\n") +
          "Agora me diga como posso te ajudar hoje:",
        footer: "© Copy Digital",
        buttons: [
          { id: "menu_servicos", title: "1) Serviços" },
          { id: "menu_precos",   title: "2) Preços"   },
          { id: "menu_suporte",  title: "3) Suporte"  },
        ],
      });
      return;
    }

    // ---------- Menu / Pós identificação ----------
    if (session.step === "menu") {
      // atalhos por dígito
      if (["1","2","3"].includes(n)) {
        const map = { "1":"menu_servicos", "2":"menu_precos", "3":"menu_suporte" };
        return handlePostback(from, map[n], session);
      }
      // botões
      if (n.startsWith("menu_")) {
        return handlePostback(from, n, session);
      }
      // se digitou algo diferente
      await sendText(from, "Para continuar, toque nos botões ou responda *1*, *2* ou *3* 😉");
      return;
    }

    // (Opcional) Coleta de e-mail se for parte do seu fluxo
    if (session.step === "email") {
      if (!isEmail(incomingText)) {
        await sendText(from, "Esse e-mail parece inválido. Envie no formato *nome@dominio.com*.");
        return;
      }
      session.email = incomingText.trim();
      session.step = "fim";
      sessions.set(from, session);
      await sendText(
        from,
        `✅ Obrigado, *${session.nome}*!\n` +
        `Resumo:\n• Nicho: *${session.nicho || "-"}*\n• E-mail: *${session.email}*\n\n` +
        `Em breve nossa equipe entra em contato.`
      );
      return;
    }

    // fallback
    await sendText(from, "Digite *oi* para começar ou *menu* para ver opções.");
  } catch (e) {
    console.error("❌ Erro no webhook:", e);
  }
});

// ===== POSTBACKS =====
async function handlePostback(from, payload, session) {
  switch (payload) {
    case "menu_servicos":
      session.servico = undefined;
      sessions.set(from, session);
      await sendButtons(from, {
        header: "🧰 Serviços",
        body: "Escolha um serviço para continuar:",
        buttons: [
          { id: "svc_trafego",   title: "Tráfego Pago" },
          { id: "svc_landing",   title: "Landing Pages" },
          { id: "svc_automacao", title: "Automações" },
        ],
      });
      break;

    case "menu_precos":
      await sendText(from,
        "*Planos & Preços*\n" +
        "• Basic — Landing + suporte\n" +
        "• Pro — Landing + tráfego + automações\n" +
        "• Premium — Tudo incluso + consultoria\n\n" +
        "Se quiser orçamento, me diga seu *e-mail* 🙂"
      );
      session.step = "email";
      sessions.set(from, session);
      break;

    case "menu_suporte":
      await sendText(from, "Conte pra mim sua dúvida. Se preferir, digite *humano* para falar com um atendente.");
      break;

    case "svc_trafego":
    case "svc_landing":
    case "svc_automacao": {
      const map = {
        svc_trafego: "Tráfego Pago",
        svc_landing: "Landing Pages",
        svc_automacao: "Automações",
      };
      session.servico = map[payload];
      sessions.set(from, session);
      await sendText(from,
        `Ótimo! *${session.servico}*.\n` +
        `Para enviarmos uma proposta, pode me informar seu *e-mail*?`
      );
      session.step = "email";
      break;
    }

    default:
      await sendText(from, "Opção não reconhecida. Digite *menu* para ver as opções.");
  }
}

// ===== START =====
app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
