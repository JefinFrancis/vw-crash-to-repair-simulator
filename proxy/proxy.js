require("dotenv").config();

const http = require("http");
const https = require("https");

// --- Configuration ---
const PROXY_PORT = process.env.PROXY_PORT || 8080;
const TARGET_URL = process.env.TARGET_URL || "http://localhost:8000";
// For Cloud Run, set: TARGET_URL=https://your-app-xyz.run.app

const target = new URL(TARGET_URL);
const client = target.protocol === "https:" ? https : http;

const server = http.createServer((req, res) => {
  const startTime = Date.now();

  // Collect request body
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);

    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,
      },
    };

    const proxyReq = client.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);

      const ms = Date.now() - startTime;
      console.log(
        `${req.method} ${req.url} -> ${proxyRes.statusCode} (${ms}ms)`,
      );
    });

    proxyReq.on("error", (err) => {
      console.error(`Proxy error: ${err.message}`);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Backend unreachable", detail: err.message }),
      );
    });

    if (body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`VW BeamNG Proxy listening on http://localhost:${PROXY_PORT}`);
  console.log(`Forwarding to ${TARGET_URL}`);
});
