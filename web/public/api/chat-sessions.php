<?php
/**
 * POST /api/chat-sessions.php?action={action}
 * Manages FitBot chat sessions and message history.
 *
 * Actions:
 *   listSessions   {userId}                           → {sessions:[]}
 *   createSession  {userId, title?}                   → {id, title}
 *   getMessages    {sessionId, userId}                → {messages:[]}
 *   saveMessage    {sessionId, userId, role, content} → {id}
 *   updateTitle    {sessionId, userId, title}         → {ok}
 *   deleteSession  {sessionId, userId}                → {ok}
 */

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($action) {

  /* ── List all sessions for a user (newest first) ── */
  case 'listSessions': {
    $userId = (int)($body['userId'] ?? 0);
    if (!$userId) { jsonResponse(['error' => 'userId required'], 400); }

    $stmt = $pdo->prepare(
      'SELECT s.id, s.title, s.createdAt, s.updatedAt,
              (SELECT content FROM chatMessages WHERE sessionId = s.id ORDER BY id DESC LIMIT 1) AS lastMessage
       FROM chatSessions s
       WHERE s.userId = ?
       ORDER BY s.updatedAt DESC
       LIMIT 100'
    );
    $stmt->execute([$userId]);
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($sessions as &$s) {
      $s['id']        = (int)$s['id'];
      $s['createdAt'] = (int)$s['createdAt'];
      $s['updatedAt'] = (int)$s['updatedAt'];
    }
    jsonResponse(['sessions' => $sessions]);
    break;
  }

  /* ── Create a new session ── */
  case 'createSession': {
    $userId = (int)($body['userId'] ?? 0);
    $title  = trim($body['title'] ?? 'New Chat');
    if (!$userId) { jsonResponse(['error' => 'userId required'], 400); }

    $now  = round(microtime(true) * 1000);
    $stmt = $pdo->prepare('INSERT INTO chatSessions (userId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?)');
    $stmt->execute([$userId, $title, $now, $now]);
    $id = (int)$pdo->lastInsertId();
    jsonResponse(['id' => $id, 'title' => $title, 'createdAt' => $now, 'updatedAt' => $now]);
    break;
  }

  /* ── Get all messages in a session ── */
  case 'getMessages': {
    $sessionId = (int)($body['sessionId'] ?? 0);
    $userId    = (int)($body['userId']    ?? 0);
    if (!$sessionId || !$userId) { jsonResponse(['error' => 'sessionId and userId required'], 400); }

    // Verify ownership
    $own = $pdo->prepare('SELECT id FROM chatSessions WHERE id = ? AND userId = ?');
    $own->execute([$sessionId, $userId]);
    if (!$own->fetch()) { jsonResponse(['error' => 'Session not found'], 404); }

    $stmt = $pdo->prepare('SELECT id, role, content, createdAt FROM chatMessages WHERE sessionId = ? ORDER BY id ASC');
    $stmt->execute([$sessionId]);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($messages as &$m) {
      $m['id']        = (int)$m['id'];
      $m['createdAt'] = (int)$m['createdAt'];
    }
    jsonResponse(['messages' => $messages]);
    break;
  }

  /* ── Save a single message ── */
  case 'saveMessage': {
    $sessionId = (int)($body['sessionId'] ?? 0);
    $userId    = (int)($body['userId']    ?? 0);
    $role      = $body['role']    ?? '';
    $content   = $body['content'] ?? '';
    if (!$sessionId || !$userId || !in_array($role, ['user','assistant']) || !$content) {
      jsonResponse(['error' => 'sessionId, userId, role, content required'], 400);
    }

    // Verify ownership
    $own = $pdo->prepare('SELECT id FROM chatSessions WHERE id = ? AND userId = ?');
    $own->execute([$sessionId, $userId]);
    if (!$own->fetch()) { jsonResponse(['error' => 'Session not found'], 404); }

    $now  = round(microtime(true) * 1000);
    $stmt = $pdo->prepare('INSERT INTO chatMessages (sessionId, role, content, createdAt) VALUES (?, ?, ?, ?)');
    $stmt->execute([$sessionId, $role, $content, $now]);
    $id = (int)$pdo->lastInsertId();

    // Update session updatedAt
    $pdo->prepare('UPDATE chatSessions SET updatedAt = ? WHERE id = ?')->execute([$now, $sessionId]);

    jsonResponse(['id' => $id]);
    break;
  }

  /* ── Update session title ── */
  case 'updateTitle': {
    $sessionId = (int)($body['sessionId'] ?? 0);
    $userId    = (int)($body['userId']    ?? 0);
    $title     = trim($body['title']      ?? '');
    if (!$sessionId || !$userId || !$title) { jsonResponse(['error' => 'sessionId, userId, title required'], 400); }

    $stmt = $pdo->prepare('UPDATE chatSessions SET title = ? WHERE id = ? AND userId = ?');
    $stmt->execute([$title, $sessionId, $userId]);
    jsonResponse(['ok' => true]);
    break;
  }

  /* ── Delete a session and its messages ── */
  case 'deleteSession': {
    $sessionId = (int)($body['sessionId'] ?? 0);
    $userId    = (int)($body['userId']    ?? 0);
    if (!$sessionId || !$userId) { jsonResponse(['error' => 'sessionId and userId required'], 400); }

    // Verify ownership first
    $own = $pdo->prepare('SELECT id FROM chatSessions WHERE id = ? AND userId = ?');
    $own->execute([$sessionId, $userId]);
    if (!$own->fetch()) { jsonResponse(['error' => 'Session not found'], 404); }

    $pdo->prepare('DELETE FROM chatMessages WHERE sessionId = ?')->execute([$sessionId]);
    $pdo->prepare('DELETE FROM chatSessions WHERE id = ?')->execute([$sessionId]);
    jsonResponse(['ok' => true]);
    break;
  }

  default:
    jsonResponse(['error' => "Unknown action: {$action}"], 400);
}
