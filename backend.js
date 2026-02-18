const express = require('express');
const cors = require('cors');

const app = express();

// ===============================
// CONFIG
// ===============================
const DAO_PASSWORD = "daopassword2026";

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "2mb" }));

// ===============================
// ZONE STORAGE (memory)
// ===============================
let zones = [];

// ===============================
// HEALTH
// ===============================
app.get('/', (req, res) => {
    res.send("DAO Zones backend running 👍");
});

// ===============================
// GET ALL ZONES
// ===============================
app.get('/zones', (req, res) => {
    res.json(zones);
});

// ===============================
// CREATE ZONE (password protected)
// ===============================
app.post('/zones', (req, res) => {
    try {
        const { password, zone } = req.body;

        if (password !== DAO_PASSWORD) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (!zone) {
            return res.status(400).json({ error: "Missing zone data" });
        }

        if (!zone.name || !zone.points || zone.points.length < 3) {
            return res.status(400).json({ error: "Invalid zone geometry" });
        }

        const newZone = {
            id: Date.now(),
            name: zone.name,
            points: zone.points,
            color: zone.color || "#ff0000",
            opacity: zone.opacity ?? 0.4,
            info: zone.info || "",
            mugshots: zone.mugshots || [],
            createdBy: zone.createdBy || "Unknown"
        };

        zones.push(newZone);

        res.json({ success: true, zone: newZone });
    } catch (err) {
        console.error("ZONE SAVE ERROR:", err);
        res.status(500).json({ error: "Server error saving zone" });
    }
});

// ===============================
// DELETE ZONE (password protected)
// ===============================
app.delete('/zones/:id', (req, res) => {
    const { password } = req.body;
    const id = Number(req.params.id);

    if (password !== DAO_PASSWORD) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    zones = zones.filter(z => z.id !== id);

    res.json({ success: true });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DAO backend running on port ${PORT}`);
});
