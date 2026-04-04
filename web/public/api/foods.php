<?php
require_once __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';
$pdo = getDB();

switch ($action) {
    case 'list':
        $stmt = $pdo->query("SELECT * FROM foods LIMIT 50");
        jsonResponse(['foods' => $stmt->fetchAll()]);
        break;

    case 'search':
        $query = $input['query'] ?? '';
        $category = $input['category'] ?? 'All';
        $values = [];

        $sql = "SELECT * FROM foods WHERE 1=1";

        if (strlen(trim($query)) > 0) {
            $sql .= " AND name LIKE ?";
            $values[] = "%" . $query . "%";
        }

        if ($category && $category !== 'All') {
            $sql .= " AND cat = ?";
            $values[] = $category;
        }

        $sql .= " LIMIT 50";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        jsonResponse(['foods' => $stmt->fetchAll()]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
?>
