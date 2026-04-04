<?php
require_once __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';
$pdo = getDB();

switch ($action) {
    case 'log':
        $args = $input['args'] ?? [];
        $userId = $args['userId'];
        $name = $args['name'];
        $mealType = $args['mealType'];
        $calories = $args['calories'];
        $proteinG = $args['proteinG'];
        $carbsG = $args['carbsG'];
        $fatG = $args['fatG'];
        $servingSize = $args['servingSize'] ?? null;
        $date = $args['date'];
        $loggedAt = $args['loggedAt'];
        $aiGenerated = $args['aiGenerated'] ?? false;

        $stmt = $pdo->prepare("INSERT INTO meals (userId, name, mealType, calories, proteinG, carbsG, fatG, servingSize, date, loggedAt, aiGenerated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $name, $mealType, $calories, $proteinG, $carbsG, $fatG, $servingSize, $date, $loggedAt, $aiGenerated ? 1 : 0]);
        
        jsonResponse(['id' => $pdo->lastInsertId()]);
        break;

    case 'byDate':
        $userId = $input['userId'];
        $date = $input['date'];

        $stmt = $pdo->prepare("SELECT * FROM meals WHERE userId = ? AND date = ? ORDER BY id ASC");
        $stmt->execute([$userId, $date]);
        $meals = $stmt->fetchAll();
        
        jsonResponse(['meals' => $meals]);
        break;

    case 'remove':
        $id = $input['id'];
        $stmt = $pdo->prepare("DELETE FROM meals WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['ok' => true]);
        break;

    case 'getTodayMeals':
        $date = $input['date'];
        $stmt = $pdo->prepare("SELECT * FROM meals WHERE date = ? ORDER BY id ASC");
        $stmt->execute([$date]);
        jsonResponse(['meals' => $stmt->fetchAll()]);
        break;

    case 'range':
        $userId = $input['userId'];
        $fromDate = $input['fromDate'];
        $toDate = $input['toDate'];

        $stmt = $pdo->prepare("SELECT * FROM meals WHERE userId = ? AND date >= ? AND date <= ? ORDER BY id ASC");
        $stmt->execute([$userId, $fromDate, $toDate]);
        jsonResponse(['meals' => $stmt->fetchAll()]);
        break;

    case 'getRecent':
        $userId = $input['userId'];
        $limit = $input['limit'] ?? 20;

        $stmt = $pdo->prepare("SELECT name, calories as cals, proteinG as protein, carbsG as carbs, fatG as fat FROM (SELECT name, calories, proteinG, carbsG, fatG, id FROM meals WHERE userId = ? ORDER BY id DESC) as sub GROUP BY name ORDER BY MAX(id) DESC LIMIT ?");
        $stmt->bindParam(1, $userId, PDO::PARAM_INT);
        $stmt->bindParam(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $meals = $stmt->fetchAll();

        foreach ($meals as &$m) {
            $m['emoji'] = "🍽️";
        }
        jsonResponse(['meals' => $meals]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
?>
