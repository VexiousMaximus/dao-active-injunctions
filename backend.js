const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

let zones = [];

/* ================= HEALTH ================= */
app.get('/', (req, res) => {
  res.send("DAO Active Injunctions API Running 👍");
});

/* ================= GET ZONES ================= */
app.get('/zones', (req, res) => {
  res.json(zones);
});

/* ================= SAVE ZONE ================= */
app.post('/zones', (req, res) => {
  const {
    name,
    points,
    username,
    password,
    color,
    fillOpacity,
    info,
    images
  } = req.body;

  if (password !== "daopassword2026") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const zone = {
    id: Date.now(),
    name,
    points,
    createdBy: username,
    color: color || "#0000FF",
    fillOpacity: fillOpacity || 0.4,
    info: info || "",
    images: images || []
  };

  zones.push(zone);
  res.json(zone);
});

/* ================= OAUTH ================= */
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
        code: code
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get(
      'https://ucp.gta.world/api/user',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const username = userRes.data.user.username;

    res.redirect(`https://vexiousmaximus.github.io/dao-active-injunctions/?username=${username}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.json(err.response?.data || { error: "OAuth failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
