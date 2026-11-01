const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../services/db');

const router = express.Router();

// List all targets
router.get('/', async (req, res) => {
  const db = getDb();
  await db.read();
  res.json(db.data.targets);
});

// Create target
router.post('/', async (req, res) => {
  const { name, url, defaultConcurrent = 10, defaultDurationSec = 300 } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'name and url are required' });
  }

  const db = getDb();
  await db.read();
  const target = {
    id: uuidv4(),
    name,
    url,
    defaultConcurrent: Number(defaultConcurrent) || 10,
    defaultDurationSec: Number(defaultDurationSec) || 300,
    createdAt: new Date().toISOString()
  };
  db.data.targets.push(target);
  await db.write();
  res.status(201).json(target);
});

// Update target
router.put('/:id', async (req, res) => {
  const db = getDb();
  await db.read();
  const idx = db.data.targets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { name, url, defaultConcurrent, defaultDurationSec } = req.body;
  if (name) db.data.targets[idx].name = name;
  if (url) db.data.targets[idx].url = url;
  if (defaultConcurrent !== undefined) db.data.targets[idx].defaultConcurrent = Number(defaultConcurrent);
  if (defaultDurationSec !== undefined) db.data.targets[idx].defaultDurationSec = Number(defaultDurationSec);

  await db.write();
  res.json(db.data.targets[idx]);
});

// Delete target
router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.read();
  const before = db.data.targets.length;
  db.data.targets = db.data.targets.filter(t => t.id !== req.params.id);
  await db.write();
  res.json({ deleted: before - db.data.targets.length });
});

module.exports = router;
