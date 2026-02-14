const express = require('express');
const axios = require('axios');
const app = express();

const clientId = "YOUR_CLIENT_ID";       // Replace with your GTA World OAuth client ID
const clientSecret = "YOUR_CLIENT_SECRET"; // Replace with your GTA World OAuth client secret
const redirectUri = "https://your-render-domain.onrender.com/auth/callback"; // Render URL

// Serve static files (optional if you also host frontend here)
app.use(express.static('public'));

app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("No code provided");

    try {
        // Exchange code for token
        const tokenRes = await axios.post('https://ucp.gta.world/oauth/token', null, {
            params: {
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code: code
            }
        });

        const accessToken = tokenRes.data.access_token;

        // Get user info
        const userRes = await axios.get('https://ucp.gta.world/api/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userData = userRes.data;

        // Send back some HTML or JSON
        res.send(`
            <h1>Hello, ${userData.user.username}!</h1>
            <p>Go back to your <a href="/">map</a></p>
        `);
    } catch (err) {
        console.error(err);
        res.send("Login error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
