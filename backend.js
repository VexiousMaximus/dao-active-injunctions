const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// ✅ Environment variables (set these in Render)
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// In-memory storage for zones (replace with DB for persistence)
let zones = [];

// Serve static files (index.html and lsmap.jpeg)
app.use(express.static(__dirname));
app.use(express.json()); // parse JSON bodies

// Health check
app.get('/health', (req, res) => {
  res.send("Backend running 👍");
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided");

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://ucp.gta.world/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    // Fetch user info
    const userRes = await axios.get('https://ucp.gta.world/api/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = userRes.data;

    // Extract faction/role
    const factionId = userData.user.role?.role_name || "";

    // Redirect back to map with username & faction info
    res.redirect(`/?username=${encodeURIComponent(userData.user.username)}&faction=${encodeURIComponent(factionId)}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send("OAuth login failed");
  }
});

// Get saved zones
app.get('/zones', (req, res) => {
  res.json(zones);
});

// Save new zone (admin-only check could be added)
app.post('/zones', (req, res) => {
  const { name, points } = req.body;
  if (!name || !points) return res.status(400).json({ error: "Missing name or points" });

  const zone = { name, points };
  zones.push(zone);

  res.json(zone);
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
