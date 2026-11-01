const axios = require('axios');
const { getDb } = require('./db');

// Reliable free proxy sources (raw txt)
const SOURCES = [
  'https://raw.githubusercontent.com/proxio-io/proxy-list/main/socks5.txt',
  'https://raw.githubusercontent.com/proxio-io/proxy-list/main/http.txt',
  'https://raw.githubusercontent.com/proxmint/free-proxy-list/main/proxies/socks5.txt',
  'https://raw.githubusercontent.com/proxmint/free-proxy-list/main/proxies/http.txt',
  'https://cdn.jsdelivr.net/gh/ProxyScrape/free-proxy-list@main/proxies/protocols/socks5/data.txt',
  'https://cdn.jsdelivr.net/gh/ProxyScrape/free-proxy-list@main/proxies/protocols/http/data.txt',
];

let isRefreshing = false;
let lastRefresh = null;

async function fetchProxiesFromSources() {
  const all = new Set();
  for (const url of SOURCES) {
    try {
      const res = await axios.get(url, { timeout: 15000 });
      const lines = res.data.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        // accept ip:port or protocol://ip:port
        let cleaned = line.replace(/^(https?|socks[45]):\/\//i, '');
        if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(cleaned)) {
          all.add(cleaned);
        }
      }
    } catch (e) {
      console.warn(`Proxy source failed: ${url} → ${e.message}`);
    }
  }
  return Array.from(all);
}

async function testProxy(proxy, timeout = 8000) {
  // Simple TCP-ish test via axios through proxy is complex without agent.
  // For free proxies we do a lightweight check: just keep them and let Playwright fail fast.
  // Real validation happens when worker tries to use it.
  return true;
}

async function refreshProxies(io = null) {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    console.log('🔄 Refreshing free proxies...');
    const fresh = await fetchProxiesFromSources();
    const db = getDb();
    
    // Keep previous working ones + new ones (dedupe)
    const existing = new Set(db.data.proxies.map(p => p.address));
    let added = 0;
    for (const addr of fresh) {
      if (!existing.has(addr)) {
        db.data.proxies.push({
          address: addr,
          protocol: 'http', // default, Playwright accepts http/socks5
          lastUsed: null,
          success: 0,
          fail: 0,
          addedAt: new Date().toISOString()
        });
        added++;
      }
    }

    // Cap total proxies to avoid huge memory (keep newest)
    if (db.data.proxies.length > 3000) {
      db.data.proxies = db.data.proxies.slice(-2500);
    }

    await db.write();
    lastRefresh = new Date().toISOString();
    console.log(`✅ Proxies refreshed. Total: ${db.data.proxies.length} (+${added})`);

    if (io) {
      io.emit('proxies_updated', {
        total: db.data.proxies.length,
        lastRefresh
      });
    }
  } catch (err) {
    console.error('Proxy refresh error:', err.message);
  } finally {
    isRefreshing = false;
  }
}

function startProxyRefresher(io) {
  // Initial load
  refreshProxies(io);
  // Every 10 minutes
  setInterval(() => refreshProxies(io), 10 * 60 * 1000);
}

function getRandomProxy() {
  const db = getDb();
  const list = db.data.proxies;
  if (!list.length) return null;
  // Prefer less used
  const sorted = [...list].sort((a, b) => (a.fail - a.success) - (b.fail - b.success));
  const idx = Math.floor(Math.random() * Math.min(50, sorted.length));
  return sorted[idx];
}

function reportProxyResult(address, success) {
  const db = getDb();
  const p = db.data.proxies.find(x => x.address === address);
  if (p) {
    if (success) p.success++;
    else p.fail++;
    p.lastUsed = new Date().toISOString();
    // Soft remove very bad ones
    if (p.fail > 8 && p.success === 0) {
      db.data.proxies = db.data.proxies.filter(x => x.address !== address);
    }
    db.write().catch(() => {});
  }
}

function getProxyStats() {
  const db = getDb();
  return {
    total: db.data.proxies.length,
    lastRefresh,
    isRefreshing
  };
}

module.exports = {
  refreshProxies,
  startProxyRefresher,
  getRandomProxy,
  reportProxyResult,
  getProxyStats
};
