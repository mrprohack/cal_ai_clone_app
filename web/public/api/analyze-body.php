<?php
/**
 * POST /api/analyze-body.php
 * Analyzes a body progress photo via Groq Llama 4 Vision.
 * Replaces the Next.js /api/analyze-body Edge route for static export.
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

$imageBase64      = $body['imageBase64'];
$mimeType         = $body['mimeType']         ?? 'image/jpeg';
$previousAnalysis = $body['previousAnalysis'] ?? null;

$apiKey = getenv('GROQ_API_KEY');
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'GROQ_API_KEY not configured']);
    exit;
}

$systemPrompt = 'You are a professional fitness and body composition analyst AI with expertise in visual body assessment.

When given a body photo, analyze visible physical characteristics and return ONLY a valid JSON object (no markdown, no code blocks, no extra text) in this exact structure:

{
  "bodyFat": 18,
  "muscleDefinition": "moderate",
  "visibleMuscleGroups": ["chest", "shoulders", "arms"],
  "posture": "good",
  "estimatedBMICategory": "normal",
  "fitnessLevel": "intermediate",
  "strengths": ["Good upper body development", "Lean midsection"],
  "areasForImprovement": ["Lower body could be more developed", "Core definition"],
  "weeklyChange": null,
  "progressScore": 72,
  "notes": "Brief 1-2 sentence observation about overall physique and progress",
  "recommendations": ["Increase lower body training", "Focus on core exercises"]
}

Rules:
- bodyFat: estimated body fat percentage (number)
- muscleDefinition: "low" | "moderate" | "good" | "excellent"
- posture: "poor" | "fair" | "good" | "excellent"
- estimatedBMICategory: "underweight" | "normal" | "overweight" | "obese"
- fitnessLevel: "beginner" | "intermediate" | "advanced" | "elite"
- weeklyChange: null for first photo, or description of change if comparison available
- progressScore: 0-100 overall fitness score
- Be encouraging and professional. Never be harsh or body-negative.
- NEVER return anything except the raw JSON object';

$textPrompt = $previousAnalysis
    ? "Analyze this body progress photo. Previous week analysis: {$previousAnalysis}. Compare and note changes in weeklyChange field."
    : 'Analyze this body progress photo and return the fitness assessment as JSON.';

$payload = [
    'model'               => 'meta-llama/llama-4-scout-17b-16e-instruct',
    'temperature'         => 0.3,
    'max_completion_tokens' => 800,
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
                ['type' => 'text', 'text' => $textPrompt],
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

$raw = trim($groqData['choices'][0]['message']['content']);

function extractBodyJSON(string $raw): ?array {
    $decoded = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE) return $decoded;
    $s = trim(preg_replace(['/^```(?:json)?\s*/im', '/\s*```\s*$/m'], '', $raw));
    $decoded = json_decode($s, true);
    if (json_last_error() === JSON_ERROR_NONE) return $decoded;
    $f = strpos($raw, '{'); $l = strrpos($raw, '}');
    if ($f !== false && $l > $f) {
        $decoded = json_decode(substr($raw, $f, $l - $f + 1), true);
        if (json_last_error() === JSON_ERROR_NONE) return $decoded;
    }
    return null;
}

$parsed = extractBodyJSON($raw);
if (!$parsed) {
    http_response_code(422);
    echo json_encode(['error' => 'AI did not return valid JSON. Please try again.']);
    exit;
}

echo json_encode([
    'bodyFat'              => (float)($parsed['bodyFat']              ?? 20),
    'muscleDefinition'     => (string)($parsed['muscleDefinition']     ?? 'moderate'),
    'visibleMuscleGroups'  => is_array($parsed['visibleMuscleGroups'] ?? null) ? $parsed['visibleMuscleGroups'] : [],
    'posture'              => (string)($parsed['posture']              ?? 'good'),
    'estimatedBMICategory' => (string)($parsed['estimatedBMICategory'] ?? 'normal'),
    'fitnessLevel'         => (string)($parsed['fitnessLevel']         ?? 'intermediate'),
    'strengths'            => is_array($parsed['strengths']            ?? null) ? $parsed['strengths'] : [],
    'areasForImprovement'  => is_array($parsed['areasForImprovement']  ?? null) ? $parsed['areasForImprovement'] : [],
    'weeklyChange'         => $parsed['weeklyChange'] ?? null,
    'progressScore'        => (int)($parsed['progressScore']           ?? 60),
    'notes'                => (string)($parsed['notes']                ?? ''),
    'recommendations'      => is_array($parsed['recommendations']      ?? null) ? $parsed['recommendations'] : [],
]);
