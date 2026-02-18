const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');

// ✅ Environment variables
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// In-memory zones storage
let zones = [];

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve files from main branch

// Serve index.html at /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if(!code) return res.send("No code provided");

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
            { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
        );
        const accessToken = tokenRes.data.access_token;

        const userRes = await axios.get('https://ucp.gta.world/api/user',{
            headers:{ Authorization: `Bearer ${accessToken}` }
        });
        const userData = userRes.data;

        // Redirect back to main page with username
        res.redirect(`/?username=${encodeURIComponent(userData.user.username)}`);
    } catch(err){
        console.error(err.response?.data || err.message);
        res.send("OAuth login failed");
    }
});

// Get all zones
app.get('/zones', (req,res)=>res.json(zones));

// Create new zone
app.post('/zones', (req,res)=>{
    const { name, points, color, info, mugshots, creator, password } = req.body;
    if(password !== "daopassword2026") return res.status(401).json({error:"Unauthorized"});
    const zone = { id: Date.now(), name, points, color, info, mugshots, creator };
    zones.push(zone);
    res.json(zone);
});

// Delete zone
app.delete('/zones/:id', (req,res)=>{
    const { password } = req.body;
    if(password !== "daopassword2026") return res.status(401).json({error:"Unauthorized"});
    zones = zones.filter(z => z.id != req.params.id);
    res.json({success:true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
