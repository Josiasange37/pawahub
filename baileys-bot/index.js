const express = require("express");
const { makeWASocket, useMultiFileAuthState, Browsers } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const allowedOrigins = ["http://localhost:3000", "https://pawahub.vercel.app"];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const PORT = 3001;
const AUTH_DIR = "./auth_info";

const sessions = {}; // sme_id -> { sock, qrCode }

function getAuthDir(smeId) {
  return path.join(AUTH_DIR, smeId);
}

async function startBot(smeId) {
  const dir = getAuthDir(smeId);
  fs.mkdirSync(dir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(dir);

  const version = [2, 3000, 1035194821];

  const sock = makeWASocket({
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

  sessions[smeId] = { sock, qrCode: null };

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && sessions[smeId]) {
      sessions[smeId].qrCode = qr;
      qrcode.generate(qr, { small: true });
      console.log(`[${smeId}] Scan the QR code with WhatsApp`);
    }
    if (connection === "open") {
      console.log(`[${smeId}] WhatsApp connected!`);
      if (sessions[smeId]) sessions[smeId].qrCode = null;
    }
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.message || "unknown";
      console.log(`[${smeId}] Connection closed (${reason}). Restarting in 10s...`);
      if (sessions[smeId]) sessions[smeId].qrCode = null;
      setTimeout(() => startBot(smeId), 10000);
    }
  });
}

function getSession(smeId) {
  return sessions[smeId] || null;
}

app.get("/qr", (req, res) => {
  const smeId = req.query.sme_id;
  if (!smeId) return res.status(400).json({ error: "sme_id required" });

  const session = getSession(smeId);
  if (!session) {
    startBot(smeId);
    return res.json({ message: "Bot starting, wait..." });
  }

  if (session.qrCode) {
    QRCode.toString(session.qrCode, { type: "svg", width: 400 })
      .then((svg) => {
        res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fluxpay WhatsApp QR</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f5f5f5;margin:0;padding:20px}svg{max-width:350px;height:auto;background:#fff;padding:16px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.12)}h2{color:#333;margin-bottom:8px}p{color:#666;font-size:14px;max-width:400px;text-align:center}</style></head><body><h2>Fluxpay WhatsApp Bot</h2><p>Scan this QR code with your WhatsApp to connect</p>${svg}</body></html>`);
      })
      .catch(() => res.status(500).json({ error: "QR generation failed" }));
  } else if (session.sock?.user) {
    res.json({ message: "Already connected", user: session.sock.user.id });
  } else {
    res.json({ message: "Bot starting, wait..." });
  }
});

app.get("/status", (req, res) => {
  const smeId = req.query.sme_id;
  if (!smeId) return res.status(400).json({ error: "sme_id required" });

  const session = getSession(smeId);
  const connected = session?.sock?.user ? true : false;

  res.json({
    connected,
    user: session?.sock?.user?.id || null,
    qr_available: session?.qrCode ? true : false,
  });
});

app.get("/qr-json", async (req, res) => {
  const smeId = req.query.sme_id;
  if (!smeId) return res.status(400).json({ error: "sme_id required" });

  let session = getSession(smeId);
  if (!session) {
    startBot(smeId);
    return res.json({ connected: false, qr_data_url: null, user: null, starting: true });
  }

  if (session.sock?.user) {
    return res.json({ connected: true, qr_data_url: null, user: session.sock.user.id });
  }
  if (session.qrCode) {
    try {
      const data_url = await QRCode.toDataURL(session.qrCode, { width: 300, margin: 2 });
      return res.json({ connected: false, qr_data_url: data_url, user: null });
    } catch {
      return res.json({ connected: false, qr_data_url: null, user: null, error: "QR generation failed" });
    }
  }
  res.json({ connected: false, qr_data_url: null, user: null });
});

app.post("/send", async (req, res) => {
  const { phone, message, sme_id } = req.body;
  if (!phone || !message || !sme_id) {
    return res.status(400).json({ error: "phone, message, and sme_id required" });
  }

  const session = getSession(sme_id);
  if (!session?.sock?.user) {
    return res.status(503).json({ error: "WhatsApp not connected for this SME" });
  }

  const jid = phone.includes("@s.whatsapp.net") ? phone : `${phone}@s.whatsapp.net`;

  try {
    await session.sock.sendMessage(jid, { text: message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/disconnect", async (req, res) => {
  const { sme_id } = req.body;
  if (!sme_id) return res.status(400).json({ error: "sme_id required" });

  const session = getSession(sme_id);
  if (!session) {
    return res.json({ success: true, message: "No session found" });
  }

  try {
    if (session.sock) {
      try { await session.sock.logout(); } catch (e) {}
      try { session.sock.end(); } catch (e) {}
    }
    const dir = getAuthDir(sme_id);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  delete sessions[sme_id];
  res.json({ success: true, message: "Disconnected successfully" });
});

app.listen(PORT, () => {
  console.log(`Fluxpay bot listening on port ${PORT}`);
});
