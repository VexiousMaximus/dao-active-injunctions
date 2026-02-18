const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');

// Environment variables
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// DAO password for zone creation
const daoPassword = "lizlacroixfeetpics";

// Enable CORS for all origins (so GitHub Pages can fetch zones)
app.use(cors());
app.use(express.json());

// In-memory zone storage (replace with DB for persistence)
let zones = [];

// Health check
app.get('/', (req, res) => {
    res.send("GTAW OAuth backend running 👍");
});

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
        const username = userData.user.username;

        res.redirect(`/?username=${encodeURIComponent(username)}`);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.send("OAuth login failed");
    }
});

// GET /zones → return all zones
app.get('/zones', (req, res) => {
    res.json(zones);
});

// POST /zones → save a new zone
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

    // If editing existing zone
    const index = zones.findIndex(z => z.id === zone.id);
    if (index >= 0) zones[index] = zone;
    else zones.push(zone);

    res.json(zone);
});

// DELETE /zones/:id → delete a zone
app.delete('/zones/:id', (req, res) => {
    const { password } = req.body;
    if (password !== daoPassword) return res.status(403).json({ error: "Invalid password" });

    const id = parseInt(req.params.id);
    zones = zones.filter(z => z.id !== id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
