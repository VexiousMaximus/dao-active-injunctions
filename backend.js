const express = require('express');
const axios = require('axios');
const app = express();

// ===============================
// CONFIG
// ===============================
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// DAO creation password
const DAO_PASSWORD = "daopassword2026";

// In-memory zone storage
// (Replace with DB later if desired)
let zones = [];

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.json()); // parse JSON bodies

// ===============================
// HEALTH CHECK
// ===============================
app.get('/', (req, res) => {
    res.send("DAO Active Injunctions API running 👍");
});

// ===============================
// GTAW OAUTH CALLBACK
// ===============================
app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("No code provided");

    try {
        // Exchange code for token
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

        // Get user info
        const userRes = await axios.get(
            'https://ucp.gta.world/api/user',
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const username = userRes.data.user.username;

        // Redirect back to GitHub Pages frontend
        res.redirect(
            `https://vexiousmaximus.github.io/dao-active-injunctions/?username=${encodeURIComponent(username)}`
        );

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send("OAuth login failed");
    }
});

// ===============================
// GET ALL ZONES (PUBLIC)
// ===============================
app.get('/zones', (req, res) => {
    res.json(zones);
});

// ===============================
// CREATE ZONE (PASSWORD PROTECTED)
// ===============================
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

    // Password check
    if (password !== DAO_PASSWORD) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    if (!name || !points || !Array.isArray(points) || points.length < 3) {
        return res.status(400).json({ error: "Invalid zone data" });
    }

    const zone = {
        id: Date.now(), // simple unique id
        name,
        points,
        createdBy: username || "Unknown",
        color: color || "#0000FF",
        fillOpacity: fillOpacity ?? 0.4,
        info: info || "",
        images: Array.isArray(images) ? images : []
    };

    zones.push(zone);

    res.json(zone);
});

// ===============================
// DELETE ZONE (optional future)
// ===============================
app.delete('/zones/:id', (req, res) => {
    const id = Number(req.params.id);
    zones = zones.filter(z => z.id !== id);
    res.json({ success: true });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DAO API running on port ${PORT}`);
});
