const express = require("express");
const { makeWASocket, useMultiFileAuthState, Browsers } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const QRCode = require("qrcode");

const app = express();
app.use(express.json());

const PORT = 3001;
let sock = null;
let qrCode = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const version = [2, 3000, 1035194821];
  console.log(`Using WA v${version.join(".")}`);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "fatal" }),
    browser: Browsers.macOS("Safari"),
    version,
    defaultQueryTimeoutMs: 60000,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    shouldSyncHistory: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    generateHighQualityLink: true,
    retryRequestDelayMs: 2000,
    maxRetries: 5,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
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
      const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.message || "unknown";
      console.log(`Connection closed (${reason}). Restarting in 10s...`);
      qrCode = null;
      sock = null;
      setTimeout(startBot, 10000);
    }
  });
}

app.get("/qr", async (req, res) => {
  if (qrCode) {
    try {
      const svg = await QRCode.toString(qrCode, { type: "svg", width: 400 });
      res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>PawaSub WhatsApp QR</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f5f5f5;margin:0;padding:20px}svg{max-width:350px;height:auto;background:#fff;padding:16px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.12)}h2{color:#333;margin-bottom:8px}p{color:#666;font-size:14px;max-width:400px;text-align:center}</style></head><body><h2>PawaSub WhatsApp Bot</h2><p>Scan this QR code with your WhatsApp to connect</p>${svg}</body></html>`);
    } catch { res.status(500).json({ error: "QR generation failed" }); }
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

startBot();

app.listen(PORT, () => {
  console.log(`WhatsApp bot listening on port ${PORT}`);
});
