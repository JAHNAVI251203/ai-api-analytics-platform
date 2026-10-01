const http = require('http');
const { randomUUID } = require('crypto');

const port = Number(process.env.PORT || 3001);
const sentinelUrl = process.env.API_SENTINEL_URL || 'http://localhost:8000';
const apiKey = process.env.API_SENTINEL_INGESTION_KEY;

function report(req, res, started, endpoint) {
  if (!apiKey) return;
  const body = JSON.stringify({
    event_id: randomUUID(), service_name: 'demo-api', endpoint, method: req.method,
    status_code: res.statusCode, response_time: Date.now() - started
  });
  fetch(`${sentinelUrl}/logs`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey }, body })
    .catch(() => console.error('Telemetry delivery failed'));
}

http.createServer((req, res) => {
  const started = Date.now();
  const endpoint = req.url.startsWith('/products') ? '/products' : req.url.startsWith('/orders') ? '/orders' : '/health';
  res.on('finish', () => report(req, res, started, endpoint));
  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.end('<h1>Demo API</h1><p><a href="/products">Browse products</a></p><form method="post" action="/orders"><button>Place order</button></form>');
  }
  res.setHeader('content-type', 'application/json');
  if (req.url === '/products' && req.method === 'GET') return res.end(JSON.stringify({ products: [{ id: 1, name: 'Notebook', price: 12 }] }));
  if (req.url === '/orders' && req.method === 'POST') return res.end(JSON.stringify({ orderId: randomUUID() }));
  if (req.url === '/health') return res.end(JSON.stringify({ status: 'ok' }));
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
}).listen(port, () => console.log(`Demo API on ${port}`));
