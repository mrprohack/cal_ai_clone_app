<?php
require_once __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';
$pdo = getDB();

switch ($action) {
    case 'getById':
        $userId = $input['userId'] ?? 0;
        $stmt = $pdo->prepare("SELECT id, name, email, avatarUrl, calorieGoal, proteinGoal, carbsGoal, fatGoal, gender, ageYears, heightCm, weightKg, onboarded, createdAt, plan, planActivatedAt, planExpiresAt FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if ($user) {
            $user['onboarded'] = (bool)$user['onboarded'];
            jsonResponse(['user' => $user]);
        }
        jsonResponse(['user' => null]);
        break;

    case 'updateProfile':
        $userId = $input['userId'] ?? 0;
        $fields = $input['fields'] ?? [];
        if (empty($fields)) jsonResponse(['ok' => true]);

        $setParams = [];
        $values = [];
        foreach ($fields as $key => $val) {
            $setParams[] = "$key = ?";
            $values[] = $val;
        }
        $values[] = $userId;
        
        $sql = "UPDATE users SET " . implode(", ", $setParams) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        jsonResponse(['ok' => true]);
        break;

    case 'completeOnboarding':
        $userId = $input['userId'] ?? 0;
        $args = $input['args'] ?? [];
        
        $gender = $args['gender'];
        $ageYears = $args['ageYears'];
        $heightCm = $args['heightCm'];
        $weightKg = $args['weightKg'];
        $activityLevel = $args['activityLevel'];
        $goal = $args['goal'];

        $bmr = 10 * $weightKg + 6.25 * $heightCm - 5 * $ageYears;
        $bmr += $gender === "male" ? 5 : -161;

        $multipliers = ['sedentary' => 1.2, 'light' => 1.375, 'moderate' => 1.55, 'active' => 1.725];
        $tdee = $bmr * ($multipliers[$activityLevel] ?? 1.2);

        $goalMods = ['lose' => -500, 'maintain' => 0, 'gain' => 500];
        $calorieGoal = round($tdee + ($goalMods[$goal] ?? 0));

        if ($gender === "male" && $calorieGoal < 1500) $calorieGoal = 1500;
        if ($gender === "female" && $calorieGoal < 1200) $calorieGoal = 1200;

        $proteinGoal = round($weightKg * 2.2);
        $fatGoal = round(($calorieGoal * 0.25) / 9);
        $carbsGoal = round(($calorieGoal - ($proteinGoal * 4) - ($fatGoal * 9)) / 4);

        $stmt = $pdo->prepare("UPDATE users SET gender=?, ageYears=?, heightCm=?, weightKg=?, calorieGoal=?, proteinGoal=?, carbsGoal=?, fatGoal=?, onboarded=1 WHERE id=?");
        $stmt->execute([$gender, $ageYears, $heightCm, $weightKg, $calorieGoal, $proteinGoal, $carbsGoal, $fatGoal, $userId]);
        
        jsonResponse(['ok' => true]);
        break;

    case 'updatePlan':
        $userId = $input['userId'] ?? 0;
        $plan = $input['plan'] ?? 'free';
        $activatedAt = (int)(microtime(true) * 1000);
        $expiresAt = $plan === 'free' ? null : $activatedAt + (30 * 24 * 60 * 60 * 1000);

        $stmt = $pdo->prepare("UPDATE users SET plan=?, planActivatedAt=?, planExpiresAt=? WHERE id=?");
        $stmt->execute([$plan, $activatedAt, $expiresAt, $userId]);
        jsonResponse(['plan' => $plan]);
        break;

    case 'getUserPlan':
        $userId = $input['userId'] ?? 0;
        $stmt = $pdo->prepare("SELECT plan, planActivatedAt, planExpiresAt FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if ($user) {
            jsonResponse([
                'plan' => $user['plan'] ?: 'free',
                'planActivatedAt' => $user['planActivatedAt'] ? (int)$user['planActivatedAt'] : null,
                'planExpiresAt' => $user['planExpiresAt'] ? (int)$user['planExpiresAt'] : null
            ]);
        }
        jsonResponse(['plan' => 'free']);
        break;

    case 'deleteAccount':
        $userId = $input['userId'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        jsonResponse(['ok' => true]);
        break;

    case 'exportData':
        $userId = $input['userId'] ?? 0;
        // Basic export
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        $stmt = $pdo->prepare("SELECT * FROM meals WHERE userId = ?");
        $stmt->execute([$userId]);
        $meals = $stmt->fetchAll();

        $stmt = $pdo->prepare("SELECT * FROM progress WHERE userId = ?");
        $stmt->execute([$userId]);
        $progress = $stmt->fetchAll();
        
        jsonResponse(['user' => $user, 'meals' => $meals, 'progress' => $progress]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
?>
