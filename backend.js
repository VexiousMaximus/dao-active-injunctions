const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors()); // allow GitHub Pages frontend to fetch

// In-memory storage
let zones = [];
let zoneIdCounter = 1;

// DAO password for edits
const DAO_PASSWORD = "daopassword2026";

// ===== GET ALL ZONES (public) =====
app.get('/zones', (req, res) => {
  res.json(zones);
});

// ===== CREATE NEW ZONE =====
app.post('/zones', (req, res) => {
  const { password, name, points, color, info, mugshots } = req.body;
  if (password !== DAO_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
  if (!name || !points || points.length < 3) return res.status(400).json({ error: "Invalid zone data" });

  const zone = {
    id: zoneIdCounter++,
    name,
    points,
    color: color || "#0000FF",
    info: info || "",
    mugshots: mugshots || [],
    createdBy: "DAO User"
  };
  zones.push(zone);
  res.json(zone);
});

// ===== DELETE ZONE =====
app.delete('/zones/:id', (req, res) => {
  const { password } = req.body;
  if (password !== DAO_PASSWORD) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  zones = zones.filter(z => z.id !== id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
