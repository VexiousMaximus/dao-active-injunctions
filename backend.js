const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Environment variables for GTAW OAuth
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// In-memory storage for zones
let zones = [];

// Serve static files from repo root
app.use(express.static(__dirname));
app.use(express.json());

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
                code: code
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenRes.data.access_token;

        const userRes = await axios.get('https://ucp.gta.world/api/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const username = userRes.data.user.username;

        // Redirect to map with username
        res.redirect(`/?username=${encodeURIComponent(username)}`);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.send("OAuth login failed");
    }
});

// Get all zones
app.get('/zones', (req, res) => {
    res.json(zones);
});

// Save new zone
app.post('/zones', (req, res) => {
    const { name, points, username, password, color, fillOpacity, info, images } = req.body;
    if (!name || !points || !username || !password) return res.status(400).json({ error: "Missing required fields" });

    if (password !== "daopassword2026") return res.status(403).json({ error: "Invalid password" });

    const zone = { name, points, createdBy: username, color: color || "#0000FF", fillOpacity: fillOpacity || 0.4, info: info || "", images: images || [] };
    zones.push(zone);

    res.json(zone);
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
