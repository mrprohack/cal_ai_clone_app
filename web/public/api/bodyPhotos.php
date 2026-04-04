<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    $pdo = getDb();

    // Ensure table exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS bodyPhotos (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        userId      INT NOT NULL,
        date        DATE NOT NULL,
        imageData   MEDIUMTEXT,
        analysis    MEDIUMTEXT,
        weekLabel   VARCHAR(50),
        notes       TEXT,
        recordedAt  BIGINT NOT NULL
    )");

    switch ($action) {
        case 'listPhotos': {
            $userId = (int)($body['userId'] ?? 0);
            if (!$userId) { echo json_encode(['photos' => []]); exit; }
            $stmt = $pdo->prepare("SELECT id, userId, date, imageData, analysis, weekLabel, notes, recordedAt
                                   FROM bodyPhotos WHERE userId = ? ORDER BY date DESC");
            $stmt->execute([$userId]);
            echo json_encode(['photos' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;
        }
        case 'savePhoto': {
            $userId    = (int)($body['userId'] ?? 0);
            $date      = $body['date'] ?? date('Y-m-d');
            $imageData = $body['imageData'] ?? null;
            $analysis  = $body['analysis'] ?? null;
            $weekLabel = $body['weekLabel'] ?? null;
            $notes     = $body['notes'] ?? null;
            if (!$userId) { http_response_code(400); echo json_encode(['error' => 'userId required']); exit; }
            $stmt = $pdo->prepare("INSERT INTO bodyPhotos (userId, date, imageData, analysis, weekLabel, notes, recordedAt)
                                   VALUES (?,?,?,?,?,?,?)");
            $stmt->execute([$userId, $date, $imageData, $analysis, $weekLabel, $notes, time() * 1000]);
            echo json_encode(['id' => $pdo->lastInsertId()]);
            break;
        }
        case 'removePhoto': {
            $id     = (int)($body['id'] ?? 0);
            $userId = (int)($body['userId'] ?? 0);
            if (!$id || !$userId) { http_response_code(400); echo json_encode(['error' => 'id and userId required']); exit; }
            $stmt = $pdo->prepare("DELETE FROM bodyPhotos WHERE id = ? AND userId = ?");
            $stmt->execute([$id, $userId]);
            echo json_encode(['ok' => true]);
            break;
        }
        default:
            http_response_code(400);
            echo json_encode(['error' => "Unknown action: $action"]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
