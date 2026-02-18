const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS so GitHub Pages can fetch zones
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// In-memory zones
let zones = [];

// Health check
app.get('/health', (req, res) => res.send("GTAW OAuth backend running 👍"));

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

    const userData = userRes.data;
    res.redirect(`/?username=${encodeURIComponent(userData.user.username)}`);
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.send("OAuth login failed");
  }
});

// Get zones
app.get('/zones', (req, res) => {
  res.json(zones);
});

// Create zone
app.post('/zones', (req, res) => {
  const { name, points, creator, password, info, color, mugshots } = req.body;
  if (!name || !points || !creator || !password) return res.status(400).json({ error: "Missing required fields" });
  if (password !== "daopassword2026") return res.status(401).json({ error: "Invalid password" });

  const zone = {
    id: Date.now(),
    name,
    points,
    creator,
    info: info || "",
    color: color || "#0000FF",
    mugshots: Array.isArray(mugshots) ? mugshots : []
  };

  zones.push(zone);
  res.json(zone);
});

// Delete zone
app.post('/zones/delete', (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ error: "Missing required fields" });
  if (password !== "daopassword2026") return res.status(401).json({ error: "Invalid password" });

  const initialLength = zones.length;
  zones = zones.filter(z => z.id !== Number(id));

  if (zones.length === initialLength) {
    return res.status(404).json({ error: "Zone not found" });
  }

  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
