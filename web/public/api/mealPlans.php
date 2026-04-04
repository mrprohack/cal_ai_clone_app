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
    $pdo->exec("CREATE TABLE IF NOT EXISTS mealPlans (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        userId        INT NOT NULL,
        planName      VARCHAR(255) NOT NULL,
        planJson      MEDIUMTEXT NOT NULL,
        calorieTarget INT NOT NULL DEFAULT 2000,
        isPinned      TINYINT(1) NOT NULL DEFAULT 0,
        createdDate   DATE NOT NULL,
        createdAt     BIGINT NOT NULL
    )");

    switch ($action) {
        case 'listPlans': {
            $userId = (int)($body['userId'] ?? 0);
            if (!$userId) { echo json_encode(['plans' => []]); exit; }
            $stmt = $pdo->prepare("SELECT id, planName, calorieTarget, isPinned, createdDate, createdAt, planJson
                                   FROM mealPlans WHERE userId = ? ORDER BY isPinned DESC, createdAt DESC");
            $stmt->execute([$userId]);
            echo json_encode(['plans' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;
        }
        case 'savePlan': {
            $userId        = (int)($body['userId'] ?? 0);
            $planJson      = $body['planJson'] ?? '';
            $planName      = $body['planName'] ?? 'Meal Plan';
            $calorieTarget = (int)($body['calorieTarget'] ?? 2000);
            if (!$userId || !$planJson) { http_response_code(400); echo json_encode(['error' => 'userId and planJson required']); exit; }
            $stmt = $pdo->prepare("INSERT INTO mealPlans (userId, planName, planJson, calorieTarget, isPinned, createdDate, createdAt)
                                   VALUES (?,?,?,?,0,?,?)");
            $stmt->execute([$userId, $planName, $planJson, $calorieTarget, date('Y-m-d'), time() * 1000]);
            echo json_encode(['id' => $pdo->lastInsertId()]);
            break;
        }
        case 'removePlan': {
            $id     = (int)($body['id'] ?? 0);
            $userId = (int)($body['userId'] ?? 0);
            if (!$id || !$userId) { http_response_code(400); echo json_encode(['error' => 'id and userId required']); exit; }
            $stmt = $pdo->prepare("DELETE FROM mealPlans WHERE id = ? AND userId = ?");
            $stmt->execute([$id, $userId]);
            echo json_encode(['ok' => true]);
            break;
        }
        case 'togglePin': {
            $id     = (int)($body['id'] ?? 0);
            $userId = (int)($body['userId'] ?? 0);
            if (!$id || !$userId) { http_response_code(400); echo json_encode(['error' => 'id and userId required']); exit; }
            $stmt = $pdo->prepare("UPDATE mealPlans SET isPinned = 1 - isPinned WHERE id = ? AND userId = ?");
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
