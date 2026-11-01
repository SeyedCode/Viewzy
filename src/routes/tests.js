const express = require('express');
const { startTest, stopTest, stopAll, getStatus } = require('../services/testManager');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json(getStatus());
});

router.post('/start', async (req, res) => {
  try {
    const { targetId, concurrent, durationSec } = req.body;
    if (!targetId) return res.status(400).json({ error: 'targetId required' });

    const test = await startTest({
      targetId,
      concurrent: concurrent ? Number(concurrent) : undefined,
      durationSec: durationSec ? Number(durationSec) : undefined
    });
    res.status(201).json(test);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stop/:id', (req, res) => {
  const ok = stopTest(req.params.id);
  res.json({ stopped: ok });
});

router.post('/stop-all', (req, res) => {
  stopAll();
  res.json({ stopped: true });
});

module.exports = router;
