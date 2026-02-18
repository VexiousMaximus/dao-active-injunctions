const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// ✅ Environment variables
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// In-memory zones storage (replace with DB if needed)
let zones = [];

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check / serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===============================
// OAuth callback
// ===============================
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code provided');

  try {
    // Exchange authorization code for access token
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

    const username = userRes.data.user.username;

    // Redirect back to frontend with username
    res.redirect(`/?username=${encodeURIComponent(username)}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send('OAuth login failed');
  }
});

// ===============================
// Zone CRUD endpoints
// ===============================
app.get('/zones', (req, res) => {
  res.json(zones);
});

app.post('/zones', (req, res) => {
  const { name, points, creator, mugshots, color, additionalInfo } = req.body;
  if (!name || !points || !creator) return res.status(400).json({ error: 'Missing required fields' });

  const zone = { id: Date.now(), name, points, creator, mugshots: mugshots || [], color: color || '#0000FF', additionalInfo: additionalInfo || '' };
  zones.push(zone);
  res.json(zone);
});

app.put('/zones/:id', (req, res) => {
  const { id } = req.params;
  const zone = zones.find(z => z.id == id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  const { name, points, mugshots, color, additionalInfo } = req.body;
  if (name) zone.name = name;
  if (points) zone.points = points;
  if (mugshots) zone.mugshots = mugshots;
  if (color) zone.color = color;
  if (additionalInfo) zone.additionalInfo = additionalInfo;

  res.json(zone);
});

app.delete('/zones/:id', (req, res) => {
  const { id } = req.params;
  const index = zones.findIndex(z => z.id == id);
  if (index === -1) return res.status(404).json({ error: 'Zone not found' });

  zones.splice(index, 1);
  res.json({ success: true });
});

// ===============================
// Start server
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
