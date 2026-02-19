const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const app = express();

// -------------------------
// CONFIG
// -------------------------
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// GitHub storage config
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_OWNER = process.env.GITHUB_OWNER;
const GH_REPO = process.env.GITHUB_REPO;
const GH_FILE = "zones.json";

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// -------------------------
// WHITELIST
// -------------------------
const WHITELIST_FILE = path.join(__dirname, 'whitelist.json');
let whitelist = [];
if (fs.existsSync(WHITELIST_FILE)) {
  whitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf8'));
}
function isAuthorized(username) {
  if (!username) return false;
  return whitelist.includes(username);
}

// -------------------------
// PERSISTENT STORAGE (GitHub)
// -------------------------
let zones = [];
let sha = null;

async function loadZonesFromGitHub() {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${GH_TOKEN}` } });
  sha = res.data.sha;
  const content = Buffer.from(res.data.content, "base64").toString("utf8");
  zones = JSON.parse(content);
}
async function saveZonesToGitHub() {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_FILE}`;
  const content = Buffer.from(JSON.stringify(zones, null, 2)).toString("base64");
  const body = { message: "Update zones", content, sha };
  const res = await axios.put(url, body, { headers: { Authorization: `Bearer ${GH_TOKEN}` } });
  sha = res.data.content.sha;
}

// Load zones on startup
loadZonesFromGitHub().catch(console.error);

// -------------------------
// ROUTES
// -------------------------

app.get('/', (req, res) => {
  const username = req.query.username;
  if (username) res.sendFile(path.join(__dirname, 'index.html'));
  else res.send("GTAW OAuth backend running 👍");
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

    res.redirect(`/?username=${encodeURIComponent(username)}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send("OAuth login failed");
  }
});

// -------------------------
// ZONES API
// -------------------------

app.get('/zones', (req, res) => res.json(zones));

app.post('/zones', async (req, res) => {
  const { name, points, color, info, mugshots, id, creator, username } = req.body;

  if (!isAuthorized(username)) return res.status(403).json({ error: "Not authorized" });
  if (!name || !points) return res.status(400).json({ error: "Missing name or points" });

  const zone = {
    id: id || Date.now(),
    name,
    points,
    color: color || "#0000FF",
    info: info || "",
    mugshots: mugshots || [],
    creator
  };

  const index = zones.findIndex(z => z.id === zone.id);
  if (index >= 0) zones[index] = zone;
  else zones.push(zone);

  await saveZonesToGitHub();
  res.json(zone);
});

app.delete('/zones/:id', async (req, res) => {
  const { username } = req.body;
  if (!isAuthorized(username)) return res.status(403).json({ error: "Not authorized" });

  const id = parseInt(req.params.id);
  zones = zones.filter(z => z.id !== id);

  await saveZonesToGitHub();
  res.json({ success: true });
});

app.post('/zones/deleteByName', async (req, res) => {
  const { username, name } = req.body;
  if (!isAuthorized(username)) return res.status(403).json({ error: "Not authorized" });
  if (!name) return res.status(400).json({ error: "Zone name required" });

  const index = zones.findIndex(z => z.name.toLowerCase() === name.toLowerCase());
  if (index === -1) return res.status(404).json({ error: "Zone not found" });

  const deletedZone = zones.splice(index, 1)[0];

  await saveZonesToGitHub();
  res.json({ success: true, deletedZone });
});

// -------------------------
// START SERVER
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
