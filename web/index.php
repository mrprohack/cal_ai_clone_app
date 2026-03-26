<?php
// Simple PHP Reverse Proxy for Next.js Daemon
$backend_url = 'http://127.0.0.1:3000' . $_SERVER['REQUEST_URI'];
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $backend_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// Dynamic Header Forwarding callback
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $header) {
    $lower = strtolower($header);
    if (!strpos($lower, 'transfer-encoding') && !strpos($lower, 'connection')) {
        header($header, false); // false = append multiples
    }
    return strlen($header);
});

if ($_SERVER['REQUEST_METHOD'] == 'POST' || $_SERVER['REQUEST_METHOD'] == 'PUT') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$headers = array();
foreach (getallheaders() as $name => $value) {
    $lower = strtolower($name);
    if ($lower != 'host' && $lower != 'x-forwarded-host' && $lower != 'content-length') {
        $headers[] = "$name: $value";
    }
}
// Force Next.js to recognize the incoming domain to enable CSRF check matching
$headers[] = "Host: " . $_SERVER['HTTP_HOST'];
$headers[] = "X-Forwarded-Host: " . $_SERVER['HTTP_HOST'];
$headers[] = "X-Forwarded-Proto: https";
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
if (curl_errno($ch)) {
    header("HTTP/1.1 500 Internal Server Error");
    echo "⚠️ Proxy Error: " . curl_error($ch) . "\nCurrently targeting: " . $backend_url;
    exit;
}

curl_close($ch);
echo $response;
