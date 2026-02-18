// backend.js
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

// -------------------------
// CONFIG
// -------------------------
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;
const daoPassword = "daopassword2026"; // password to authorize zone edits

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/'))); // serve static files from main branch

// -------------------------
// IN-MEMORY STORAGE
// -------------------------
let zones = []; // each zone: { id, name, points, color, info, mugshots, creator }

// -------------------------
// ROUTES
// -------------------------

// Home / map page
app.get('/', (req, res) => {
    // If ?username=... is present, serve the map page
    const username = req.query.username;
    if (username) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.send("GTAW OAuth backend running 👍");
    }
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("No code provided");

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

        // Redirect back to map page with username query param
        res.redirect(`/?username=${encodeURIComponent(username)}`);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.send("OAuth login failed");
    }
});

// -------------------------
// ZONES API
// -------------------------

// Get all zones (anyone can fetch)
app.get('/zones', (req, res) => res.json(zones));

// Save or update zone (requires DAO password)
app.post('/zones', (req, res) => {
    const { name, points, color, info, mugshots, password, creator, id } = req.body;

    if (password !== daoPassword) return res.status(403).json({ error: "Invalid password" });
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
    if (index >= 0) zones[index] = zone; // update existing
    else zones.push(zone); // new zone

    res.json(zone);
});

// Delete zone (requires DAO password)
app.delete('/zones/:id', (req, res) => {
    const { password } = req.body;
    if (password !== daoPassword) return res.status(403).json({ error: "Invalid password" });

    const id = parseInt(req.params.id);
    zones = zones.filter(z => z.id !== id);

    res.json({ success: true });
});

// -------------------------
// START SERVER
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
