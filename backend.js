const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// GTAW OAuth
// ===============================
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// ===============================
// In-memory storage
// ===============================
let zones = [];
let nextId = 1;

// ===============================
// Routes
// ===============================

// Health check
app.get('/', (req, res) => {
  res.send('GTAW OAuth backend running 👍');
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code provided');

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

    // Fetch user info
    const userRes = await axios.get('https://ucp.gta.world/api/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = userRes.data;

    // Redirect back to frontend with username
    res.redirect(`/?username=${encodeURIComponent(userData.user.username)}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send('OAuth login failed');
  }
});

// Get all zones
app.get('/zones', (req, res) => {
  res.json(zones);
});

// Create/update a zone
app.post('/zones', (req, res) => {
  const { id, name, points, color, opacity, info, mugshots, creator } = req.body;
  if (!name || !points || !creator) return res.status(400).json({ error: 'Missing fields' });

  if (id) {
    const z = zones.find(z => z.id === id);
    if (!z) return res.status(404).json({ error: 'Zone not found' });
    Object.assign(z, { name, points, color, opacity, info, mugshots, creator });
    res.json(z);
  } else {
    const newZone = { id: nextId++, name, points, color, opacity, info, mugshots, creator };
    zones.push(newZone);
    res.json(newZone);
  }
});

// Delete a zone
app.delete('/zones/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = zones.findIndex(z => z.id === id);
  if (index === -1) return res.status(404).json({ error: 'Zone not found' });
  zones.splice(index, 1);
  res.json({ success: true });
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
