const express = require('express');
const axios = require('axios');
const app = express();

// ✅ Use environment variables (DO NOT hardcode secrets)
const clientId = process.env.GTAW_CLIENT_ID;
const clientSecret = process.env.GTAW_CLIENT_SECRET;
const redirectUri = process.env.GTAW_REDIRECT_URI;

// Optional: simple health route
app.get('/', (req, res) => {
    res.send("GTAW OAuth backend running 👍");
});

app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.send("No code provided");
    }

    try {
        // Exchange authorization code for access token
        const tokenRes = await axios.post(
            'https://ucp.gta.world/oauth/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code: code
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = tokenRes.data.access_token;

        // Fetch user info
        const userRes = await axios.get(
            'https://ucp.gta.world/api/user',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        const userData = userRes.data;

        res.send(`
            <h1>Hello, ${userData.user.username} 👋</h1>
            <p>Login successful.</p>
            <p><a href="/">Go back to map</a></p>
        `);

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.json(err.response?.data || { error: "OAuth failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
