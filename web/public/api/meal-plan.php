<?php
/**
 * POST /api/meal-plan.php
 * Generates a 7-day AI meal plan via Groq API.
 * Replaces the Next.js /api/meal-plan Edge route for static export.
 */

require_once __DIR__ . '/db.php'; // loads env vars

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

$calorieGoal = isset($body['calorieGoal']) ? (int)$body['calorieGoal'] : 2000;
$proteinGoal = isset($body['proteinGoal']) ? (int)$body['proteinGoal'] : 150;
$carbsGoal   = isset($body['carbsGoal'])   ? (int)$body['carbsGoal']   : 200;
$fatGoal     = isset($body['fatGoal'])     ? (int)$body['fatGoal']     : 65;
$preferences = isset($body['preferences']) && is_array($body['preferences']) ? $body['preferences'] : [];
$restrictions= isset($body['restrictions']) && is_array($body['restrictions']) ? $body['restrictions'] : [];
$userName    = isset($body['userName'])    ? trim($body['userName'])    : 'there';

$apiKey = getenv('GROQ_API_KEY');
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'GROQ_API_KEY not configured']);
    exit;
}

// Build the user message
$parts = [
    "Create a 7-day meal plan for {$userName}.",
    "Targets: {$calorieGoal} kcal/day, {$proteinGoal}g protein, {$carbsGoal}g carbs, {$fatGoal}g fat.",
];
if (!empty($preferences)) {
    $parts[] = 'Preferences: ' . implode(', ', $preferences) . '.';
}
if (!empty($restrictions)) {
    $parts[] = 'Restrictions: ' . implode(', ', $restrictions) . '.';
}
$parts[] = 'Return ONLY the JSON object, nothing else.';
$userMessage = implode(' ', $parts);

$systemPrompt = <<<'PROMPT'
You are a certified nutritionist AI. Create a 7-day meal plan.

Return ONLY a raw JSON object — no markdown, no code fences, no explanation text before or after. Start your response with { and end with }.

JSON structure:
{
  "planName": "string",
  "dailyCalorieTarget": number,
  "days": [
    {
      "dayName": "Monday",
      "dayNumber": 1,
      "totalCalories": number,
      "totalProtein": number,
      "totalCarbs": number,
      "totalFat": number,
      "meals": [
        {
          "mealType": "breakfast",
          "name": "string",
          "calories": number,
          "proteinG": number,
          "carbsG": number,
          "fatG": number,
          "servingSize": "string",
          "ingredients": ["string"],
          "prepTime": "string",
          "instructions": "string"
        }
      ],
      "waterGoalMl": 2500,
      "tips": "string"
    }
  ],
  "shoppingList": {
    "proteins": ["string"],
    "carbs": ["string"],
    "vegetables": ["string"],
    "fruits": ["string"],
    "dairy": ["string"],
    "other": ["string"]
  },
  "weeklyTotals": { "avgCalories": number, "avgProtein": number, "avgCarbs": number, "avgFat": number },
  "nutritionTips": ["string"],
  "estimatedCost": "string"
}

Rules:
- Exactly 7 days (Monday-Sunday), each with 4 meals: breakfast, lunch, dinner, snack
- Keep instructions brief (1-2 sentences max)
- Keep ingredient lists to 4-6 items
- YOUR ENTIRE RESPONSE MUST BE VALID JSON ONLY
PROMPT;

$payload = [
    'model'               => 'meta-llama/llama-4-scout-17b-16e-instruct',
    'temperature'         => 0.3,
    'max_completion_tokens' => 8192,
    'top_p'               => 0.9,
    'stream'              => false,
    'messages'            => [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user',   'content' => $userMessage],
    ],
];

// Call Groq API via cURL
$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_TIMEOUT        => 120,
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
    echo json_encode([
        'error'   => 'Groq API error',
        'details' => $groqData['error']['message'] ?? $response,
    ]);
    exit;
}

$raw = trim($groqData['choices'][0]['message']['content']);

// Robust JSON extraction (strip markdown fences, find first { to last })
function extractJSON(string $raw): ?array {
    // Direct parse
    $decoded = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE) return $decoded;

    // Strip markdown fences
    $stripped = preg_replace('/^```(?:json)?\s*/im', '', $raw);
    $stripped = preg_replace('/\s*```\s*$/m', '', $stripped);
    $stripped = trim($stripped);
    $decoded = json_decode($stripped, true);
    if (json_last_error() === JSON_ERROR_NONE) return $decoded;

    // Find first { to last }
    $first = strpos($raw, '{');
    $last  = strrpos($raw, '}');
    if ($first !== false && $last > $first) {
        $slice = substr($raw, $first, $last - $first + 1);
        $decoded = json_decode($slice, true);
        if (json_last_error() === JSON_ERROR_NONE) return $decoded;
    }

    return null;
}

$parsed = extractJSON($raw);

if (!$parsed) {
    http_response_code(422);
    echo json_encode([
        'error' => 'AI did not return valid JSON. Please try again.',
        'hint'  => 'The model may have returned a truncated or malformatted response.',
    ]);
    exit;
}

if (!isset($parsed['days']) || !is_array($parsed['days']) || count($parsed['days']) === 0) {
    http_response_code(422);
    echo json_encode(['error' => "Meal plan is missing the 'days' array. Please try again."]);
    exit;
}

echo json_encode($parsed);
