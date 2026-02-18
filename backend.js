const express = require('express');
const axios = require('axios');
const app = express();

// Environment variables
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// In-memory storage for zones
let zones = [];

// Middleware
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.send("GTAW OAuth backend running 👍");
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

        // Redirect to frontend with username
        res.redirect(`https://vexiousmaximus.github.io/dao-active-injunctions/?username=${encodeURIComponent(userData.user.username)}`);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.send("OAuth login failed");
    }
});

// Get all zones (public)
app.get('/zones', (req, res) => {
    res.json(zones);
});

// Save new zone (requires DAO password)
app.post('/zones', (req, res) => {
    const { name, points, color, info, mugshots, password, createdBy } = req.body;

    if (password !== 'daopassword2026') {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!name || !points || points.length < 3) {
        return res.status(400).json({ error: "Zone must have a name and at least 3 points" });
    }

    const zone = { name, points, color: color || "#0000FF", info: info || "", mugshots: mugshots || [], createdBy };
    zones.push(zone);

    res.json(zone);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
