require("dotenv").config();
const http = require("http");
const httpProxy = require("http-proxy");

// Choose which upstream to use:
const UPSTREAM = process.env.UPSTREAM || "https://relay.walletconnect.org"; // or https://relay.walletconnect.com

const proxy = httpProxy.createProxyServer({
  target: UPSTREAM,
  ws: true,
  secure: true,
  changeOrigin: false,
});

proxy.on("proxyReq", (proxyReq, req) => {
  // Preserve original host for JWT audience validation
  if (req.headers.host) {
    proxyReq.setHeader("Host", req.headers.host);
  }
});

proxy.on("error", (err, req, res) => {
  // If this was an HTTP request, return a 502
  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad gateway");
  }
});

const server = http.createServer((req, res) => {
  // Simple health check endpoint for Render health checks
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }

  // Proxy all other HTTP traffic to the upstream (WalletConnect relay uses WS, but HTTP may be hit)
  proxy.web(req, res, { target: UPSTREAM });
});

// WebSocket upgrade handler
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, { target: UPSTREAM });
});

const port = process.env.PORT || 10000;

server.listen(port, () => {
  console.log(`WC relay proxy listening on :${port}, upstream=${UPSTREAM}`);
});
