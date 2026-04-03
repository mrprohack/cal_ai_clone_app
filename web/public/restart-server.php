<?php
/**
 * Cal AI — Server Restart Script
 * Upload this to your Hostinger public_html root.
 * Access via: https://lightgreen-spider-622425.hostingersite.com/restart-server.php?key=YOUR_SECRET_KEY
 *
 * SECURITY: Always protect this file with a secret key!
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
define('SECRET_KEY',  'change_this_to_a_strong_random_key_123!'); // <-- CHANGE THIS
define('APP_DIR',     '/home/u123456789/domains/lightgreen-spider-622425.hostingersite.com/public_html'); // <-- UPDATE path to your app
define('PORT',        3000);
define('LOG_FILE',    __DIR__ . '/restart.log');
// ──────────────────────────────────────────────────────────────────────────────

// Authenticate
$key = $_GET['key'] ?? '';
if ($key !== SECRET_KEY) {
    http_response_code(403);
    die(json_encode(['status' => 'error', 'message' => 'Unauthorized']));
}

header('Content-Type: application/json');

$action  = $_GET['action'] ?? 'status'; // status | restart | stop | start
$results = [];

// ─── HELPER: run a shell command and capture output ───────────────────────────
function run(string $cmd): array {
    $output = [];
    $code   = 0;
    exec($cmd . ' 2>&1', $output, $code);
    return ['cmd' => $cmd, 'output' => implode("\n", $output), 'code' => $code];
}

// ─── HELPER: check if something is listening on PORT ─────────────────────────
function isRunning(): bool {
    $conn = @fsockopen('127.0.0.1', PORT, $errno, $errstr, 2);
    if ($conn) { fclose($conn); return true; }
    return false;
}

// ─── LOG ─────────────────────────────────────────────────────────────────────
function logAction(string $msg): void {
    file_put_contents(LOG_FILE, date('[Y-m-d H:i:s] ') . $msg . PHP_EOL, FILE_APPEND);
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

if ($action === 'status') {
    $running = isRunning();
    echo json_encode([
        'status'  => 'ok',
        'running' => $running,
        'port'    => PORT,
        'message' => $running ? "✅ Server is UP on port " . PORT : "❌ Server is DOWN on port " . PORT,
    ]);
    exit;
}

if ($action === 'stop' || $action === 'restart') {
    // Kill any process on port 3000
    $kill1 = run("fuser -k " . PORT . "/tcp");
    $kill2 = run("pkill -f 'node.*next' ");
    $results['kill_port']    = $kill1;
    $results['kill_process'] = $kill2;
    sleep(2);
    logAction("STOP executed");
}

if ($action === 'start' || $action === 'restart') {
    // Try PM2 first (preferred on Hostinger)
    $pm2Check = run("which pm2");
    if ($pm2Check['code'] === 0) {
        // PM2 is available
        $pm2Start = run("cd " . APP_DIR . " && pm2 start ecosystem.config.js --no-daemon 2>&1 || pm2 restart cal-ai 2>&1");
        $results['pm2'] = $pm2Start;
        logAction("START via PM2: " . $pm2Start['output']);
    } else {
        // Fallback: nohup node
        $nodeCheck = run("which node");
        if ($nodeCheck['code'] !== 0) {
            echo json_encode(['status' => 'error', 'message' => 'Node.js not found. Check your Hostinger Node.js app config.']);
            exit;
        }
        $startCmd = "cd " . APP_DIR . " && nohup node_modules/.bin/next start -p " . PORT . " >> " . __DIR__ . "/nextjs.log 2>&1 &";
        $start    = run($startCmd);
        $results['nohup_start'] = $start;
        logAction("START via nohup: " . $start['output']);
    }

    sleep(3); // wait for server to boot
    $up = isRunning();
    $results['server_up'] = $up;
    $results['message']   = $up
        ? "✅ Server restarted and is now UP on port " . PORT
        : "⚠️ Start command ran but server is NOT yet responding on port " . PORT . ". Check nextjs.log";
}

echo json_encode([
    'status'    => 'ok',
    'action'    => $action,
    'timestamp' => date('Y-m-d H:i:s'),
    'results'   => $results,
], JSON_PRETTY_PRINT);
