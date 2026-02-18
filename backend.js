const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

let zones = [];
let nextId = 1;

// ===============================
// Routes
// ===============================

// Health check
app.get('/', (req, res) => {
  res.send('GTAW OAuth backend running 👍');
});

// Get all zones
app.get('/zones', (req, res) => {
  res.json(zones);
});

// Add or update a zone
app.post('/zones', (req, res) => {
  const { id, name, points, color, opacity, info, mugshots, creator } = req.body;
  if (!name || !points || !creator) return res.status(400).json({ error: 'Missing fields' });

  if (id) {
    // update existing
    const z = zones.find(z => z.id === id);
    if (!z) return res.status(404).json({ error: 'Zone not found' });
    Object.assign(z, { name, points, color, opacity, info, mugshots, creator });
    res.json(z);
  } else {
    // create new
    const newZone = { id: nextId++, name, points, color, opacity, info, mugshots, creator };
    zones.push(newZone);
    res.json(newZone);
  }
});

// Delete a zone
app.delete('/zones/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = zones.findIndex(z => z.id === id);
  if (index === -1) return res.status(404).json({ error: 'Zone not found' });
  zones.splice(index, 1);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
