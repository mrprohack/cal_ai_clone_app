<?php
require_once __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';
$pdo = getDB();

switch ($action) {
    case 'logWater':
        $userId = $input['userId'];
        $date = $input['date'];
        $waterMl = $input['waterMl'];

        $stmt = $pdo->prepare("SELECT id, waterMl FROM progress WHERE userId = ? AND date = ?");
        $stmt->execute([$userId, $date]);
        $row = $stmt->fetch();

        if ($row) {
            $newWater = ($row['waterMl'] ?? 0) + $waterMl;
            $stmt = $pdo->prepare("UPDATE progress SET waterMl = ? WHERE id = ?");
            $stmt->execute([$newWater, $row['id']]);
            jsonResponse(['id' => $row['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO progress (userId, date, waterMl, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, recordedAt) VALUES (?, ?, ?, 0, 0, 0, 0, ?)");
            $stmt->execute([$userId, $date, $waterMl, (int)(microtime(true) * 1000)]);
            jsonResponse(['id' => $pdo->lastInsertId()]);
        }
        break;

    case 'upsert':
        $args = $input['args'];
        $userId = $args['userId'];
        $date = $args['date'];
        $recordedAt = $args['recordedAt'] ?? (int)(microtime(true) * 1000);

        $stmt = $pdo->prepare("SELECT id FROM progress WHERE userId = ? AND date = ?");
        $stmt->execute([$userId, $date]);
        $row = $stmt->fetch();

        if ($row) {
            $stmt = $pdo->prepare("UPDATE progress SET weightKg = ?, caloriesConsumed = ?, proteinConsumed = ?, carbsConsumed = ?, fatConsumed = ?, waterMl = ?, steps = ?, recordedAt = ? WHERE id = ?");
            $stmt->execute([
                $args['weightKg'] ?? null, $args['caloriesConsumed'], $args['proteinConsumed'], 
                $args['carbsConsumed'], $args['fatConsumed'], $args['waterMl'] ?? null, 
                $args['steps'] ?? null, $recordedAt, $row['id']
            ]);
            jsonResponse(['id' => $row['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO progress (userId, date, weightKg, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, waterMl, steps, recordedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $userId, $date, $args['weightKg'] ?? null, $args['caloriesConsumed'], $args['proteinConsumed'], 
                $args['carbsConsumed'], $args['fatConsumed'], $args['waterMl'] ?? null, 
                $args['steps'] ?? null, $recordedAt
            ]);
            jsonResponse(['id' => $pdo->lastInsertId()]);
        }
        break;

    case 'getDailyProgress':
        $userId = $input['userId'];
        $date = $input['date'];
        $stmt = $pdo->prepare("SELECT * FROM progress WHERE userId = ? AND date = ?");
        $stmt->execute([$userId, $date]);
        $row = $stmt->fetch();
        jsonResponse(['progress' => $row ?: null]);
        break;

    case 'getStats':
        $userId = $input['userId'];
        $fromDate = $input['fromDate'];
        $toDate = $input['toDate'];

        $stmt = $pdo->prepare("SELECT * FROM progress WHERE userId = ? AND date >= ? AND date <= ? ORDER BY date ASC");
        $stmt->execute([$userId, $fromDate, $toDate]);
        $rows = $stmt->fetchAll();

        $logged = array_filter($rows, fn($r) => $r['caloriesConsumed'] > 0);
        $daysLogged = count($logged);
        $totalCalories = array_reduce($logged, fn($s, $r) => $s + $r['caloriesConsumed'], 0);
        
        $avgCalories = $daysLogged > 0 ? round($totalCalories / $daysLogged) : 0;
        $totalProtein = array_reduce($logged, fn($s, $r) => $s + $r['proteinConsumed'], 0);
        $avgProtein = $daysLogged > 0 ? round($totalProtein / $daysLogged) : 0;

        $loggedDates = array_flip(array_column($logged, 'date'));
        $streak = 0;
        $cursor = new DateTime($toDate);
        
        while (true) {
            $dateStr = $cursor->format('Y-m-d');
            if (isset($loggedDates[$dateStr])) {
                $streak++;
                $cursor->modify('-1 day');
            } else {
                break;
            }
        }

        $from = new DateTime($fromDate);
        $to = new DateTime($toDate);
        $totalDays = round(($to->getTimestamp() - $from->getTimestamp()) / 86400) + 1;

        jsonResponse([
            'avgCalories' => $avgCalories,
            'avgProtein' => $avgProtein,
            'daysLogged' => $daysLogged,
            'streak' => $streak,
            'totalDays' => $totalDays,
            'totalCalories' => $totalCalories
        ]);
        break;

    case 'range':
        $userId = $input['userId'];
        $fromDate = $input['fromDate'];
        $toDate = $input['toDate'];
        $stmt = $pdo->prepare("SELECT * FROM progress WHERE userId = ? AND date >= ? AND date <= ? ORDER BY date ASC");
        $stmt->execute([$userId, $fromDate, $toDate]);
        jsonResponse(['rows' => $stmt->fetchAll()]);
        break;

    case 'logWeight':
        $userId   = $input['userId'];
        $date     = $input['date'];
        $wkg      = (float)$input['weightKg'];
        $stmt = $pdo->prepare("SELECT id FROM progress WHERE userId = ? AND date = ?");
        $stmt->execute([$userId, $date]);
        $row = $stmt->fetch();
        if ($row) {
            $stmt = $pdo->prepare("UPDATE progress SET weightKg = ? WHERE id = ?");
            $stmt->execute([$wkg, $row['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO progress (userId, date, weightKg, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, recordedAt) VALUES (?,?,?,0,0,0,0,?)");
            $stmt->execute([$userId, $date, $wkg, (int)(microtime(true)*1000)]);
        }
        jsonResponse(['ok' => true]);
        break;

    case 'getAchievements':
        $userId = $input['userId'];
        // Compute streak & logged days for achievement conditions
        $stmt = $pdo->prepare("SELECT date, caloriesConsumed FROM progress WHERE userId = ? ORDER BY date DESC LIMIT 90");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();
        $daysLogged = count(array_filter($rows, fn($r) => $r['caloriesConsumed'] > 0));
        $loggedDates = array_flip(array_column(array_filter($rows, fn($r) => $r['caloriesConsumed'] > 0), 'date'));
        $streak = 0;
        $cursor = new DateTime();
        while (isset($loggedDates[$cursor->format('Y-m-d')])) { $streak++; $cursor->modify('-1 day'); }
        $achievements = [
            ['label' => '3-Day Streak',  'icon' => '🔥', 'description' => 'Log meals 3 days in a row', 'earned' => $streak >= 3, 'progress' => $streak, 'goal' => 3],
            ['label' => 'Week Warrior',  'icon' => '⚔️', 'description' => 'Log meals 7 days in a row', 'earned' => $streak >= 7, 'progress' => $streak, 'goal' => 7],
            ['label' => 'First Log',     'icon' => '🌱', 'description' => 'Log your first meal', 'earned' => $daysLogged >= 1, 'progress' => min($daysLogged,1), 'goal' => 1],
            ['label' => '10 Days',       'icon' => '📅', 'description' => 'Log meals on 10 separate days', 'earned' => $daysLogged >= 10, 'progress' => $daysLogged, 'goal' => 10],
            ['label' => '30 Days',       'icon' => '🏆', 'description' => 'Log meals on 30 separate days', 'earned' => $daysLogged >= 30, 'progress' => $daysLogged, 'goal' => 30],
            ['label' => 'Month Master',  'icon' => '👑', 'description' => 'Maintain a 30-day streak', 'earned' => $streak >= 30, 'progress' => $streak, 'goal' => 30],
        ];
        jsonResponse(['achievements' => $achievements]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
?>
