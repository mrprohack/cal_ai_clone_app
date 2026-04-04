<?php
/**
 * POST /api/chat.php
 * FitBot AI streaming chat via Groq kimi-k2-instruct.
 * Replaces the Next.js /api/chat Edge route for static export.
 * Streams SSE (Server-Sent Events) back to the client.
 */

require_once __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || !isset($body['messages'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'messages array is required']);
    exit;
}

$messages      = $body['messages'];
$contextPrompt = $body['contextPrompt'] ?? null;

$apiKey = getenv('GROQ_API_KEY');
if (!$apiKey) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'GROQ_API_KEY not configured']);
    exit;
}

$baseSystem = 'You are FitBot, an expert AI nutrition coach built into CalAI — a smart fitness tracker app.

Personality:
- Warm, encouraging, and science-backed
- Use emojis sparingly but effectively
- Format key numbers in **bold**
- Keep answers concise (2–4 short paragraphs max)
- Always tie advice back to the user\'s actual logged data when relevant
- Never give medical diagnoses — recommend consulting a professional for health issues';

$systemContent = $contextPrompt
    ? $baseSystem . "\n\nUser Context:\n" . $contextPrompt
    : $baseSystem;

$groqMessages = array_merge(
    [['role' => 'system', 'content' => $systemContent]],
    $messages
);

$payload = [
    'model'               => 'moonshotai/kimi-k2-instruct-0905',
    'temperature'         => 0.6,
    'max_completion_tokens' => 4096,
    'top_p'               => 1,
    'stream'              => true,
    'stop'                => null,
    'messages'            => $groqMessages,
];

// Set SSE headers BEFORE streaming
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');
header('Connection: keep-alive');

if (ob_get_level()) {
    ob_end_flush();
}

// Stream response from Groq using cURL with CURLOPT_WRITEFUNCTION
$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_TIMEOUT        => 120,
    CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) {
        echo $chunk;
        if (ob_get_level()) ob_flush();
        flush();
        return strlen($chunk);
    },
]);

$ok = curl_exec($ch);
if (!$ok) {
    $err = curl_error($ch);
    echo "data: " . json_encode(['error' => 'cURL error: ' . $err]) . "\n\n";
    flush();
}
curl_close($ch);
