<?php
// Load env from multiple possible locations (handles web/public/api/, web/out/api/, public_html/api/)
$envSearchDirs = [
    __DIR__ . '/../../',      // from web/public/api/ → web/
    __DIR__ . '/../../../',   // from web/out/api/    → web/  (or cal_ai_clone/)
    __DIR__ . '/../../../../', // deeper nesting fallback
    '/home/mrpro/mygit/cal_ai_clone/web/', // absolute fallback for local dev
];

foreach ($envSearchDirs as $dir) {
    foreach (['.env.local', '.env'] as $file) {
        $envPath = $dir . $file;
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($name, $value) = explode('=', $line, 2);
                    $name  = trim($name);
                    $value = trim($value);
                    // Don't overwrite already-set env vars (so .env.local wins over .env)
                    if (!getenv($name)) {
                        putenv(sprintf('%s=%s', $name, $value));
                        $_ENV[$name]    = $value;
                        $_SERVER[$name] = $value;
                    }
                }
            }
        }
    }
}

// Global DB Connection
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '3306';
        $db   = getenv('DB_DATABASE') ?: '';
        $user = getenv('DB_USERNAME') ?: '';
        $pass = getenv('DB_PASSWORD') ?: '';

        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        try {
            $pdo = new PDO($dsn, $user, $pass, $options);
        } catch (\PDOException $e) {
            header('Content-Type: application/json', true, 500);
            echo json_encode(["success" => false, "message" => "Database connection failed: " . $e->getMessage(), "dsn" => $dsn, "user" => $user]);
            exit;
        }
    }
    return $pdo;
}

// Utility to JSON response
function jsonResponse($data, $statusCode = 200) {
    header('Content-Type: application/json');
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Utility to get authenticated user token
function getAuthToken() {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        return trim(str_replace('Bearer', '', $headers['Authorization']));
    }
    return null;
}
?>
