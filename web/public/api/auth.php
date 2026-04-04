<?php
require_once __DIR__ . '/db.php';

// Generate token
function generateToken() {
    return bin2hex(random_bytes(32));
}

// PBKDF2 Hash matching client WebCrypto exactly
function hashPassword($password) {
    return hash_pbkdf2("sha256", $password, "calai-salt-v1", 100000, 64, false);
}

// Map actions
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';

$pdo = getDB();

switch ($action) {
    case 'getSessionUser':
        $token = $input['token'] ?? '';
        if (!$token) jsonResponse(['user' => null]);
        
        $stmt = $pdo->prepare("SELECT userId, expiresAt FROM sessions WHERE token = ?");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        if (!$session) jsonResponse(['user' => null]);
        
        // Expiration uses ms timestamp in TS
        if ((int)$session['expiresAt'] < (int)(microtime(true) * 1000)) {
            $pdo->prepare("DELETE FROM sessions WHERE token = ?")->execute([$token]);
            jsonResponse(['user' => null]);
        }
        
        $stmt = $pdo->prepare("SELECT id, name, email, calorieGoal, proteinGoal, carbsGoal, fatGoal, avatarUrl, weightKg, heightCm, ageYears, gender, onboarded FROM users WHERE id = ?");
        $stmt->execute([$session['userId']]);
        $user = $stmt->fetch();
        
        if ($user) {
            $user['onboarded'] = (bool)$user['onboarded'];
            jsonResponse(['user' => $user]);
        } else {
            jsonResponse(['user' => null]);
        }
        break;

    case 'signUp':
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        
        if (strlen($password) < 8) jsonResponse(['error' => 'Password must be at least 8 characters']);
        if (!$name || !$email) jsonResponse(['error' => 'All fields are required']);

        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'An account with this email already exists.']);
        }
        
        $hash = hashPassword($password);
        $createdAt = (int)(microtime(true) * 1000);
        
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO users (name, email, passwordHash, calorieGoal, proteinGoal, carbsGoal, fatGoal, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $email, $hash, 2000, 150, 200, 65, $createdAt]);
            
            $userId = $pdo->lastInsertId();
            $token = generateToken();
            $expiresAt = $createdAt + (30 * 24 * 60 * 60 * 1000);
            
            $stmt = $pdo->prepare("INSERT INTO sessions (userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $token, $expiresAt, $createdAt]);
            
            $pdo->commit();
            jsonResponse(['token' => $token, 'userId' => $userId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(['error' => 'Database connection failed: ' . $e->getMessage()]);
        }
        break;

    case 'signIn':
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        
        $stmt = $pdo->prepare("SELECT id, passwordHash FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) jsonResponse(['error' => 'Invalid email or password.']);
        
        if (hashPassword($password) !== $user['passwordHash']) {
            jsonResponse(['error' => 'Invalid email or password.']);
        }
        
        $token = generateToken();
        $now = (int)(microtime(true) * 1000);
        $expiresAt = $now + (30 * 24 * 60 * 60 * 1000);
        
        $stmt = $pdo->prepare("INSERT INTO sessions (userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?)");
        $stmt->execute([$user['id'], $token, $expiresAt, $now]);
        
        jsonResponse(['token' => $token, 'userId' => $user['id']]);
        break;

    case 'signOut':
        $token = $input['token'] ?? '';
        if ($token) {
            $stmt = $pdo->prepare("DELETE FROM sessions WHERE token = ?");
            $stmt->execute([$token]);
        }
        jsonResponse(['ok' => true]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
?>
