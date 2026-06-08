const express = require("express");
const { makeWASocket, useMultiFileAuthState, Browsers } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const fs = require("fs");

const app = express();
app.use(express.json());

const PORT = 3001;
let sock = null;
let qrCode = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.windows("Chrome"),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      qrCode = qr;
      qrcode.generate(qr, { small: true });
      console.log("Scan the QR code above with your WhatsApp");
    }
    if (connection === "open") {
      console.log("WhatsApp connected!");
      qrCode = null;
    }
    if (connection === "close") {
      console.log("Connection closed. Restarting...");
      setTimeout(startBot, 5000);
    }
  });
}

app.get("/qr", (req, res) => {
  if (qrCode) {
    res.json({ qr: qrCode, message: "Scan this QR with WhatsApp" });
  } else if (sock?.user) {
    res.json({ message: "Already connected", user: sock.user.id });
  } else {
    res.json({ message: "Bot starting, wait..." });
  }
});

app.get("/status", (req, res) => {
  res.json({
    connected: sock?.user ? true : false,
    user: sock?.user?.id || null,
    qr_available: qrCode ? true : false,
  });
});

app.post("/send", async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message required" });
  }

  if (!sock?.user) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }

  const jid = phone.includes("@s.whatsapp.net") ? phone : `${phone}@s.whatsapp.net`;

  try {
    await sock.sendMessage(jid, { text: message });
    const delay = Math.floor(Math.random() * 3000) + 1000;
    setTimeout(() => {}, delay);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

startBot();

app.listen(PORT, () => {
  console.log(`WhatsApp bot listening on port ${PORT}`);
});
