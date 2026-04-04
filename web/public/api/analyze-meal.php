<?php
/**
 * POST /api/analyze-meal.php
 * Analyzes a food image via Groq Llama 4 Vision and returns macros as JSON.
 * Replaces the Next.js /api/analyze-meal Edge route for static export.
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['imageBase64'])) {
    http_response_code(400);
    echo json_encode(['error' => 'imageBase64 is required']);
    exit;
}

$imageBase64 = $body['imageBase64'];
$mimeType    = $body['mimeType'] ?? 'image/jpeg';

$apiKey = getenv('GROQ_API_KEY');
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'GROQ_API_KEY not configured']);
    exit;
}

$systemPrompt = 'You are a professional nutrition analyst AI with deep expertise in food science.

When given a food image, analyze it and return ONLY a valid JSON object (no markdown, no code blocks, no extra text) in this exact structure:

{
  "name": "Descriptive food name",
  "confidence": 92,
  "servingSize": "1 plate (~320g)",
  "calories": 412,
  "proteinG": 18,
  "carbsG": 34,
  "fatG": 22,
  "notes": "Brief 1-sentence observation about the meal"
}

Rules:
- All macros must be numbers (integers or one decimal)
- confidence is 0-100
- servingSize is an estimated description
- If you cannot identify the food, still return valid JSON with your best guess and low confidence
- NEVER return anything except the raw JSON object';

$payload = [
    'model'               => 'meta-llama/llama-4-scout-17b-16e-instruct',
    'temperature'         => 0.2,
    'max_completion_tokens' => 512,
    'top_p'               => 1,
    'stream'              => false,
    'messages'            => [
        ['role' => 'system', 'content' => $systemPrompt],
        [
            'role'    => 'user',
            'content' => [
                [
                    'type'      => 'image_url',
                    'image_url' => ['url' => "data:{$mimeType};base64,{$imageBase64}"],
                ],
                [
                    'type' => 'text',
                    'text' => 'Analyze this food image and return the nutritional data as JSON.',
                ],
            ],
        ],
    ],
];

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_TIMEOUT        => 60,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to reach Groq API: ' . $curlErr]);
    exit;
}

$groqData = json_decode($response, true);
if ($httpCode !== 200 || !isset($groqData['choices'][0]['message']['content'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Groq API error', 'details' => $groqData['error']['message'] ?? $response]);
    exit;
}

$raw     = trim($groqData['choices'][0]['message']['content']);
$cleaned = preg_replace('/^```(?:json)?\s*/im', '', $raw);
$cleaned = preg_replace('/\s*```\s*$/m', '', $cleaned);
$cleaned = trim($cleaned);

$parsed = json_decode($cleaned, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    // Try extracting from first { to last }
    $first = strpos($raw, '{');
    $last  = strrpos($raw, '}');
    if ($first !== false && $last > $first) {
        $parsed = json_decode(substr($raw, $first, $last - $first + 1), true);
    }
}

if (!$parsed || json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(422);
    echo json_encode(['error' => 'AI did not return valid JSON', 'raw' => $raw]);
    exit;
}

echo json_encode([
    'name'        => (string)($parsed['name']        ?? 'Unknown Food'),
    'confidence'  => (int)($parsed['confidence']     ?? 70),
    'servingSize' => (string)($parsed['servingSize']  ?? '1 serving'),
    'calories'    => (float)($parsed['calories']      ?? 0),
    'proteinG'    => (float)($parsed['proteinG']      ?? 0),
    'carbsG'      => (float)($parsed['carbsG']        ?? 0),
    'fatG'        => (float)($parsed['fatG']          ?? 0),
    'notes'       => (string)($parsed['notes']        ?? ''),
]);
