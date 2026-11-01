const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const targetsRouter = require('./routes/targets');
const proxiesRouter = require('./routes/proxies');
const testsRouter = require('./routes/tests');
const { initDb } = require('./services/db');
const { startProxyRefresher } = require('./services/proxyManager');
const { getStatus } = require('./services/testManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Make io available to routes
app.set('io', io);

app.use('/api/targets', targetsRouter);
app.use('/api/proxies', proxiesRouter);
app.use('/api/tests', testsRouter);

app.get('/api/status', (req, res) => {
  res.json(getStatus());
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function bootstrap() {
  await initDb();
  startProxyRefresher(io); // auto refresh proxies every 10 min

  // Broadcast status every 2 seconds
  setInterval(() => {
    io.emit('status', getStatus());
  }, 2000);

  server.listen(PORT, () => {
    console.log(`\n🚀 Viewzy running at http://localhost:${PORT}`);
    console.log(`   Open the panel in your browser.\n`);
  });
}

bootstrap().catch(console.error);
