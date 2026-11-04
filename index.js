// Render web-service health endpoint plus the Discord bot entry point.
// Render supplies PORT; the fallback supports local development.
require('dotenv').config();

const http = require('node:http');

const PORT = Number(process.env.PORT) || 10000;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      service: 'Real Talk with Brandon Discord Bot',
      status: 'ok',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Health server listening on port ${PORT}`);
});

// Keep the existing bot implementation in its original location.
require('./discord-bot/src/index.js');
