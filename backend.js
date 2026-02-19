// =========================
// GTAW Zone Manager Backend
// =========================

const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// -------------------------
// CONFIG
// -------------------------
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// GitHub
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_OWNER = process.env.GITHUB_OWNER;
const GH_REPO = process.env.GITHUB_REPO;
const GH_FILE = "zones.json";

// Whitelist file (local)
const WHITELIST_FILE = path.join(__dirname, 'whitelist.json');

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// -------------------------
// WHITELIST
// -------------------------
let whitelist = [];
const fs = require('fs');
if (fs.existsSync(WHITELIST_FILE)) {
  whitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf8'));
}
function isAuthorized(username) {
  return username && whitelist.includes(username);
}

// -------------------------
// SESSION TOKENS
// -------------------------
const sessions = {}; // token -> username

function generateSession(username) {
  const token = crypto.randomBytes(16).toString("hex");
  sessions[token] = username;
  return token;
}

// -------------------------
// GITHUB ZONE STORAGE
// -------------------------
let zones = [];
let sha = null;

async function loadZonesFromGitHub() {
  try {
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${GH_TOKEN}` } });
    sha = res.data.sha;
    const content = Buffer.from(res.data.content, "base64").toString("utf8");
    zones = JSON.parse(content);
    console.log("Loaded zones from GitHub ✅");
  } catch (err) {
    console.error("Failed to load zones from GitHub:", err.message);
    zones = [];
  }
}

async function saveZonesToGitHub() {
  try {
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;
    const content = Buffer.from(JSON.stringify(zones, null, 2)).toString("base64");
    const body = { message: "Update zones via website", content, sha };
    const res = await axios.put(url, body, { headers: { Authorization: `Bearer ${GH_TOKEN}` } });
    sha = res.data.content.sha;
    console.log("Saved zones to GitHub ✅");
  } catch (err) {
    console.error("GitHub save failed:", err.response?.data || err.message);
    throw err;
  }
}

// Load zones on startup
loadZonesFromGitHub().catch(console.error);

// -------------------------
// ROUTES
// -------------------------

// Home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided");

  try {
    const tokenRes = await axios.post(
      'https://ucp.gta.world/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get('https://ucp.gta.world/api/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const username = userRes.data.user.username;

    if (!isAuthorized(username)) return res.send("You are not authorized to edit zones.");

    const sessionToken = generateSession(username);

    res.redirect(`/?token=${sessionToken}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send("OAuth login failed");
  }
});

// Get username from token
app.get('/session/:token', (req, res) => {
  const token = req.params.token;
  const username = sessions[token];
  if (!username) return res.status(403).json({ error: "Invalid session token" });
  res.json({ username });
});

// -------------------------
// ZONES API
// -------------------------

// Get all zones
app.get('/zones', (req, res) => res.json(zones));

// Create / update zone
app.post('/zones', async (req, res) => {
  try {
    const { name, points, color, info, mugshots, id, token } = req.body;
    const username = sessions[token];
    if (!isAuthorized(username)) return res.status(403).json({ error: "Not authorized" });
    if (!name || !points) return res.status(400).json({ error: "Missing name or points" });

    const zone = {
      id: id || Date.now(),
      name,
      points,
      color: color || "#0000FF",
      info: info || "",
      mugshots: mugshots || [],
      creator: username
    };

    const index = zones.findIndex(z => z.id === zone.id);
    if (index >= 0) zones[index] = zone;
    else zones.push(zone);

    await saveZonesToGitHub();
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: "Failed to save zone" });
  }
});

// Delete zone by ID
app.delete('/zones/:id', async (req, res) => {
  try {
    const { token } = req.body;
    const username = sessions[token];
    if (!isAuthorized(username)) return res.status(403).json({ error: "Not authorized" });

    const id = parseInt(req.params.id);
    zones = zones.filter(z => z.id !== id);

    await saveZonesToGitHub();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete zone" });
  }
});

// Delete zone by NAME
app.post('/zones/deleteByName', async (req, res) => {
  try {
    const { token, name } = req.body;
    const username = sessions[token];
    if (!isAuthorized(username)) return res.status(403).json({ error: "Not authorized" });
    if (!name) return res.status(400).json({ error: "Zone name required" });

    const index = zones.findIndex(z => z.name.toLowerCase() === name.toLowerCase());
    if (index === -1) return res.status(404).json({ error: "Zone not found" });

    zones.splice(index, 1);

    await saveZonesToGitHub();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete zone" });
  }
});

// -------------------------
// START SERVER
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
