const https = require("https");
const http = require("http");
const fs = require("fs");
const urlMod = require("url");

const SSL_KEY = fs.readFileSync("/srv/ssl/privkey.pem");
const SSL_CERT = fs.readFileSync("/srv/ssl/fullchain.pem");

const server = https.createServer({ key: SSL_KEY, cert: SSL_CERT }, (req, res) => {
  const pathStr = urlMod.parse(req.url).pathname;
  let target = "http://127.0.0.1:3000";
  if (pathStr.startsWith("/api") || pathStr.startsWith("/eve")) {
    target = "http://127.0.0.1:8001";
  }
  const proxyReq = http.request(
    target + req.url,
    { method: req.method, headers: { ...req.headers, host: "127.0.0.1" } },
    (proxyRes) => { res.writeHead(proxyRes.statusCode, proxyRes.headers); proxyRes.pipe(res); }
  );
  proxyReq.on("error", (e) => { res.writeHead(502); res.end("Proxy error"); });
  req.pipe(proxyReq);
});

server.listen(8443, "0.0.0.0", () => console.log("HTTPS proxy on :8443"));
