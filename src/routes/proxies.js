const express = require('express');
const { refreshProxies, getProxyStats } = require('../services/proxyManager');
const { getDb } = require('../services/db');

const router = express.Router();

router.get('/stats', (req, res) => {
  res.json(getProxyStats());
});

router.post('/refresh', async (req, res) => {
  const io = req.app.get('io');
  // Don't wait fully
  refreshProxies(io);
  res.json({ message: 'Refresh started' });
});

router.get('/', async (req, res) => {
  const db = getDb();
  await db.read();
  // Return limited list for UI
  const list = db.data.proxies.slice(-200).map(p => ({
    address: p.address,
    success: p.success,
    fail: p.fail,
    lastUsed: p.lastUsed
  }));
  res.json({ total: db.data.proxies.length, sample: list });
});

module.exports = router;
