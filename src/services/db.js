const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const defaultData = {
  targets: [],
  proxies: [],
  settings: {
    proxyRefreshIntervalMin: 10,
    maxConcurrentGlobal: 100,
    defaultDurationSec: 300
  }
};

let cache = null;

function read() {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      cache = JSON.parse(raw);
    } else {
      cache = JSON.parse(JSON.stringify(defaultData));
      write();
    }
  } catch (e) {
    cache = JSON.parse(JSON.stringify(defaultData));
  }
  cache.targets = cache.targets || [];
  cache.proxies = cache.proxies || [];
  cache.settings = cache.settings || defaultData.settings;
  return cache;
}

function write() {
  fs.writeFileSync(dbPath, JSON.stringify(cache, null, 2), 'utf8');
}

async function initDb() {
  read();
  return { data: cache };
}

function getDb() {
  if (!cache) read();
  return {
    data: cache,
    read: async () => { read(); },
    write: async () => { write(); }
  };
}

module.exports = { initDb, getDb };
