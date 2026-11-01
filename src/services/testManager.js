const { chromium } = require('playwright');
const { v4: uuidv4 } = require('uuid');
const { getRandomProxy, reportProxyResult } = require('./proxyManager');
const { getDb } = require('./db');

// Active tests: Map<testId, { targetId, targetName, url, concurrent, durationSec, status, workers: [], startedAt, stats }>
const activeTests = new Map();

// Global stats
let globalStats = {
  totalSessionsStarted: 0,
  totalSuccess: 0,
  totalFail: 0
};

async function runWorker(testId, url, durationSec, workerIndex) {
  const proxyObj = getRandomProxy();
  const proxyAddress = proxyObj ? proxyObj.address : null;

  let browser = null;
  let success = false;

  try {
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--mute-audio'
      ]
    };

    if (proxyAddress) {
      // Support both http and socks5 style
      launchOptions.proxy = {
        server: proxyAddress.includes('://') ? proxyAddress : `http://${proxyAddress}`
      };
    }

    browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
      userAgent: randomUA(),
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    // Go to live page
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    // Keep alive for duration
    const end = Date.now() + durationSec * 1000;
    while (Date.now() < end) {
      // Check if test was stopped
      const test = activeTests.get(testId);
      if (!test || test.status === 'stopped') break;

      // Small activity to keep connection alive (scroll or wait)
      await page.waitForTimeout(15000 + Math.random() * 10000);
      try {
        await page.mouse.wheel(0, 100);
      } catch (_) {}
    }

    success = true;
  } catch (err) {
    // console.error(`Worker ${workerIndex} error:`, err.message);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    if (proxyAddress) {
      reportProxyResult(proxyAddress, success);
    }

    // Update stats
    const test = activeTests.get(testId);
    if (test) {
      test.stats.finished++;
      if (success) {
        test.stats.success++;
        globalStats.totalSuccess++;
      } else {
        test.stats.fail++;
        globalStats.totalFail++;
      }
      // Remove finished worker reference
      test.workers = test.workers.filter(w => w.index !== workerIndex);
    }
  }
}

function randomUA() {
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

async function startTest({ targetId, concurrent, durationSec }) {
  const db = getDb();
  const target = db.data.targets.find(t => t.id === targetId);
  if (!target) throw new Error('Target not found');

  const testId = uuidv4();
  const test = {
    id: testId,
    targetId,
    targetName: target.name,
    url: target.url,
    concurrent: Math.min(Math.max(1, concurrent || 5), 80),
    durationSec: durationSec || target.defaultDurationSec || 300,
    status: 'running',
    startedAt: new Date().toISOString(),
    workers: [],
    stats: {
      started: 0,
      finished: 0,
      success: 0,
      fail: 0
    }
  };

  activeTests.set(testId, test);

  // Launch workers with small stagger to avoid thundering herd
  for (let i = 0; i < test.concurrent; i++) {
    const workerIndex = i + 1;
    test.workers.push({ index: workerIndex, startedAt: new Date().toISOString() });
    test.stats.started++;
    globalStats.totalSessionsStarted++;

    // Stagger start
    setTimeout(() => {
      runWorker(testId, test.url, test.durationSec, workerIndex);
    }, i * 400);
  }

  // Auto cleanup when all finished
  const checker = setInterval(() => {
    const t = activeTests.get(testId);
    if (!t) {
      clearInterval(checker);
      return;
    }
    if (t.stats.finished >= t.stats.started || t.status === 'stopped') {
      t.status = 'finished';
      clearInterval(checker);
      // Keep finished test in map for a while for UI
      setTimeout(() => activeTests.delete(testId), 5 * 60 * 1000);
    }
  }, 3000);

  return test;
}

function stopTest(testId) {
  const test = activeTests.get(testId);
  if (!test) return false;
  test.status = 'stopped';
  return true;
}

function stopAll() {
  for (const [id, test] of activeTests) {
    test.status = 'stopped';
  }
  return true;
}

function getStatus() {
  const tests = Array.from(activeTests.values()).map(t => ({
    id: t.id,
    targetId: t.targetId,
    targetName: t.targetName,
    url: t.url,
    concurrent: t.concurrent,
    durationSec: t.durationSec,
    status: t.status,
    startedAt: t.startedAt,
    activeWorkers: t.workers.length,
    stats: t.stats
  }));

  return {
    tests,
    global: globalStats,
    activeCount: tests.filter(t => t.status === 'running').length
  };
}

module.exports = {
  startTest,
  stopTest,
  stopAll,
  getStatus
};
