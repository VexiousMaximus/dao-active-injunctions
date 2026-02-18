const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

// ✅ Environment variables
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// In-memory zone storage
let zones = [];

// Middleware
app.use(express.json()); // parse JSON bodies
app.use(express.static(path.join(__dirname))); // serve index.html and other assets

// Health check
app.get('/health', (req, res) => {
  res.send("GTAW OAuth backend running 👍");
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code provided");

  console.log("Received OAuth code:", code);

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

    console.log("Token response:", tokenRes.data);
    const accessToken = tokenRes.data.access_token;

    // Fetch user info
    const userRes = await axios.get('https://ucp.gta.world/api/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = userRes.data;
    console.log("User data:", userData);

    // Redirect back to frontend with username
    res.redirect(`/?username=${encodeURIComponent(userData.user.username)}`);
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.send("OAuth login failed. Please try again.");
  }
});

// Get all zones
app.get('/zones', (req, res) => {
  res.json(zones);
});

// Create new zone (requires correct password)
app.post('/zones', (req, res) => {
  const { name, points, creator, password, info, color, mugshots } = req.body;
  if (!name || !points || !creator || !password) return res.status(400).json({ error: "Missing required fields" });

  // Password check
  if (password !== "daopassword2026") return res.status(401).json({ error: "Invalid password" });

  const zone = { id: Date.now(), name, points, creator, info: info || "", color: color || "#0000FF", mugshots: mugshots || [] };
  zones.push(zone);
  res.json(zone);
});

// Delete a zone (requires correct password)
app.post('/zones/delete', (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ error: "Missing required fields" });
  if (password !== "daopassword2026") return res.status(401).json({ error: "Invalid password" });

  zones = zones.filter(z => z.id !== id);
  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
