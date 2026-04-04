<?php
/**
 * Cal AI — PHP Reverse Proxy for Next.js
 * Routes all HTTP traffic → http://127.0.0.1:3000
 *
 * Fixes:
 *  - Binary assets (JS/CSS/fonts/images) returned correctly
 *  - HTTP status code forwarded from Next.js to browser
 *  - Transfer-Encoding / Connection headers stripped
 *  - All HTTP methods supported (GET/POST/PUT/PATCH/DELETE)
 *  - Content-Type forwarded on POST/PUT/PATCH
 *  - 503 page shown when Next.js is not running (not 500)
 *  - 30s connect timeout + 120s total timeout
 */

$backend = 'http://127.0.0.1:3000';
$uri     = $_SERVER['REQUEST_URI'];
$method  = $_SERVER['REQUEST_METHOD'];
$url     = $backend . $uri;

// ── cURL init ────────────────────────────────────────────────────────────────
$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER  => true,   // return body as string
    CURLOPT_FOLLOWLOCATION  => false,  // don't follow redirects — pass them to browser
    CURLOPT_CONNECTTIMEOUT  => 10,     // fail fast if port 3000 is down
    CURLOPT_TIMEOUT         => 120,    // max 2 min for slow server actions
    // ⚠️ Do NOT use CURLOPT_ENCODING here — that makes cURL advertise br/gzip
    // but it won't auto-decompress, so PHP echoes raw compressed bytes → blank page.
    // We explicitly request identity (no compression) so we always get plain bytes.
    CURLOPT_SSL_VERIFYPEER  => false,
    CURLOPT_CUSTOMREQUEST   => $method,
]);

// ── Forward request body for write methods ───────────────────────────────────
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// ── Build and forward request headers ────────────────────────────────────────
// Skip headers we'll set ourselves, and skip accept-encoding so we can force identity
$skip    = ['host', 'x-forwarded-host', 'x-forwarded-proto', 'content-length', 'accept-encoding'];
$reqHdrs = [];
foreach (getallheaders() as $name => $value) {
    if (!in_array(strtolower($name), $skip)) {
        $reqHdrs[] = "$name: $value";
    }
}
// Tell Next.js the real host and that we're behind HTTPS
$reqHdrs[] = 'Host: ' . $_SERVER['HTTP_HOST'];
$reqHdrs[] = 'X-Forwarded-Host: ' . $_SERVER['HTTP_HOST'];
$reqHdrs[] = 'X-Forwarded-Proto: https';
$reqHdrs[] = 'X-Real-IP: ' . ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '');
// Force plain bytes — prevent Next.js from sending Brotli/gzip that PHP can't pipe through
$reqHdrs[] = 'Accept-Encoding: identity';
curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHdrs);

// ── Stream response headers back to browser ──────────────────────────────────
$statusCode  = 200;
// Strip hop-by-hop headers AND content-encoding (we forced identity so no encoding was applied)
$skipResHdrs = ['transfer-encoding', 'connection', 'keep-alive', 'upgrade', 'content-encoding'];

curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($ch, $header) use (&$statusCode, $skipResHdrs) {
    $trimmed = trim($header);

    // Parse status line  e.g. "HTTP/1.1 304 Not Modified"
    if (preg_match('/^HTTP\/\d+\.\d+\s+(\d+)/i', $trimmed, $m)) {
        $statusCode = (int) $m[1];
        return strlen($header);
    }

    $lower = strtolower(explode(':', $trimmed)[0]);
    if (in_array($lower, $skipResHdrs) || $trimmed === '') {
        return strlen($header);
    }

    // Forward all other headers (allow multiples e.g. set-cookie)
    header($header, false);
    return strlen($header);
});

// ── Execute ──────────────────────────────────────────────────────────────────
$response = curl_exec($ch);
$curlErr  = curl_errno($ch);
$curlMsg  = curl_error($ch);
curl_close($ch);

// ── Handle connection failure (Auto-Restart) ───────────────────────────────────
if ($curlErr) {
    // Attempt to wake up the PM2 daemon directly from the proxy
    // PHP shell_exec lacks environment variables, so we declare them fully
    $startCmd = 'export HOME="/home/u697986122"; export PM2_HOME="/home/u697986122/.pm2"; export NVM_DIR="/home/u697986122/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; cd /home/u697986122/domains/lightgreen-spider-622425.hostingersite.com && (pm2 resurrect >/dev/null 2>&1 || pm2 start npm --name cal-ai-web -- start >/dev/null 2>&1)';
    shell_exec($startCmd);

    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    header('Retry-After: 30');
    echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cal AI — Starting Up</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: #0a0f1a;
      font-family: system-ui, -apple-system, sans-serif;
      color: #e2e8f0;
    }
    .card {
      text-align: center;
      padding: 48px 40px;
      background: #111827;
      border: 1px solid #1e2d42;
      border-radius: 20px;
      max-width: 480px;
      width: 90%;
    }
    .icon { font-size: 56px; margin-bottom: 20px; }
    h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 12px; color: #fff; }
    p  { color: #94a3b8; line-height: 1.6; margin-bottom: 8px; }
    .badge {
      display: inline-block; margin-top: 24px;
      padding: 8px 20px; border-radius: 999px;
      background: #3b96f515; border: 1px solid #3b96f540;
      color: #3b96f5; font-size: 0.8rem; letter-spacing: 0.05em;
    }
    .retry { margin-top: 28px; }
    .retry a {
      display: inline-block; padding: 12px 28px;
      background: #3b96f5; color: #fff; border-radius: 10px;
      text-decoration: none; font-weight: 600; transition: opacity .2s;
    }
    .retry a:hover { opacity: .85; }
    small { display: block; margin-top: 32px; color: #334155; font-size: .75rem; }
  </style>
  <script>
    // Auto-refresh every 15 seconds
    setTimeout(() => location.reload(), 15000);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">⚡</div>
    <h1>Cal AI is starting up…</h1>
    <p>The server is warming up. This usually takes less than 30 seconds.</p>
    <p>The page will refresh automatically.</p>
    <div class="badge">🔄 Auto-refresh in 15 s</div>
    <div class="retry"><a href="javascript:location.reload()">Refresh Now</a></div>
    <small>Error detail: {$curlMsg} · Target: {$url}</small>
  </div>
</body>
</html>
HTML;
    exit;
}

// ── Forward status code + body ────────────────────────────────────────────────
http_response_code($statusCode);
echo $response;
