const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const targetsRouter = require('./routes/targets');
const proxiesRouter = require('./routes/proxies');
const testsRouter = require('./routes/tests');
const { initDb } = require('./services/db');
const { startProxyRefresher } = require('./services/proxyManager');
const { getStatus } = require('./services/testManager');

// Load config from data/config.json (created by installer)
function loadConfig() {
  const configPath = path.join(__dirname, '../data/config.json');
  const defaults = {
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
    publicHost: 'localhost',
    publicUrl: null
  };
  try {
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaults, ...raw };
    }
  } catch (e) {
    console.warn('Config load failed, using defaults:', e.message);
  }
  return defaults;
}

const config = loadConfig();
const PORT = config.port;
const HOST = config.host || '0.0.0.0';
const PUBLIC_URL = config.publicUrl || `http://${config.publicHost || 'localhost'}:${PORT}`;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.set('io', io);

app.use('/api/targets', targetsRouter);
app.use('/api/proxies', proxiesRouter);
app.use('/api/tests', testsRouter);

app.get('/api/status', (req, res) => {
  res.json(getStatus());
});

app.get('/api/config', (req, res) => {
  res.json({ publicUrl: PUBLIC_URL, port: PORT });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function bootstrap() {
  await initDb();
  startProxyRefresher(io);

  setInterval(() => {
    io.emit('status', getStatus());
  }, 2000);

  server.listen(PORT, HOST, () => {
    console.log(`\n🚀 Viewzy is running`);
    console.log(`   Local:  http://localhost:${PORT}`);
    console.log(`   Public: ${PUBLIC_URL}`);
    console.log(`   Open the panel in your browser.\n`);
  });
}

bootstrap().catch(console.error);
