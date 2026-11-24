<?php
// Recibe cada evento de la landing (lo envía medicion.js con sendBeacon) y lo agrega como una fila en eventos.csv.
require __DIR__ . '/registro-config.php';

// La landing de Netlify también envía aquí; la respuesta no se lee, solo se acepta el envío.
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    exit;
}

$crudo = file_get_contents('php://input', false, null, 0, 8192);
$datos = json_decode((string) $crudo, true);
if (!is_array($datos) || !in_array($datos['e'] ?? '', EVENTOS, true)) {
    http_response_code(400);
    exit;
}

$p = is_array($datos['d'] ?? null) ? $datos['d'] : [];
// Texto corto, de una línea y sin fórmulas (evita que Excel ejecute algo al abrir el archivo)
$limpio = function ($valor): string {
    $t = trim(preg_replace('/\s+/u', ' ', (string) $valor));
    $t = mb_substr($t, 0, 160);
    return preg_match('/^[=+\-@]/', $t) ? "'" . $t : $t;
};
$campo = fn(string $k): string => $limpio($p[$k] ?? '');

$agente = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
$dispositivo = preg_match('/iPad|Tablet/i', $agente) ? 'tablet' : (preg_match('/Mobi|Android|iPhone/i', $agente) ? 'celular' : 'computador');

$fila = [
    date('Y-m-d H:i:s'),
    $datos['e'],
    $campo('ref_code'),
    $campo('utm_source'),
    $campo('utm_medium'),
    $campo('utm_campaign'),
    $campo('utm_content'),
    $campo('cta_location'),
    $campo('section'),
    $campo('brand'),
    $campo('model'),
    $campo('price_millones'),
    $campo('estimate_cop'),
    $campo('percent'),
    $campo('question'),
    $campo('field') !== '' ? $campo('field') : ($campo('payment_status') !== '' ? $campo('payment_status') : $campo('concept')),
    $limpio($datos['p'] ?? ''),
    $limpio($datos['h'] ?? ''),
    $dispositivo,
    !empty($datos['i']) ? '1' : '0',
];

$archivo = archivo_registro();
$nuevo = !file_exists($archivo);
$f = @fopen($archivo, 'a');
if (!$f) {
    http_response_code(500);
    exit;
}
flock($f, LOCK_EX);
if ($nuevo) {
    fputcsv($f, COLUMNAS);
}
fputcsv($f, $fila);
flock($f, LOCK_UN);
fclose($f);
http_response_code(204);

if (POSTHOG_KEY !== '') {
    // Se responde al navegador primero; el reenvío a PostHog sigue en el servidor
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } elseif (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    }
    enviar_a_posthog($datos, $p, $dispositivo, $limpio);
}

// Un evento de la landing → un evento de PostHog. distinct_id = código de referencia (el mismo del mensaje de WhatsApp).
function enviar_a_posthog(array $datos, array $p, string $dispositivo, callable $limpio): void
{
    $texto = ['page_variant', 'ref_code', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'cta_location', 'cta_text', 'destination', 'section', 'brand', 'model', 'price_bucket', 'field', 'question',
        'concept', 'pay_mode', 'order_id', 'payment_status'];
    $numero = ['percent', 'price_millones', 'estimate_cop', 'video_seconds'];
    $logico = ['muted', 'autoplay'];
    $props = [];
    foreach ($texto as $k) {
        if (isset($p[$k]) && $p[$k] !== '') $props[$k] = $limpio($p[$k]);
    }
    foreach ($numero as $k) {
        if (isset($p[$k]) && is_numeric($p[$k])) $props[$k] = $p[$k] + 0;
    }
    foreach ($logico as $k) {
        if (isset($p[$k])) $props[$k] = (bool) $p[$k];
    }
    $ref = $props['ref_code'] ?? '';
    if ($ref === '') {
        return;
    }
    $url = mb_substr((string) ($datos['u'] ?? ''), 0, 600);
    $props += [
        '$current_url' => $url,
        '$host' => $limpio($datos['h'] ?? ''),
        '$pathname' => $limpio($datos['p'] ?? ''),
        '$referrer' => ($datos['r'] ?? '') !== '' ? mb_substr((string) $datos['r'], 0, 600) : '$direct',
        '$device_type' => ['celular' => 'Mobile', 'tablet' => 'Tablet', 'computador' => 'Desktop'][$dispositivo],
        '$ip' => (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
        '$lib' => 'valora-registro',
        '$process_person_profile' => false,
        'is_internal' => !empty($datos['i']),
    ];
    if (preg_match('/^[0-9a-f-]{36}$/', (string) ($datos['s'] ?? ''))) {
        $props['$session_id'] = $datos['s'];
    }
    $cuerpo = json_encode([
        'api_key' => POSTHOG_KEY,
        'event' => $datos['e'] === 'page_view' ? '$pageview' : $datos['e'],
        'distinct_id' => $ref,
        'properties' => $props,
        'timestamp' => date('c'),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $destino = rtrim(POSTHOG_HOST, '/') . '/i/v0/e/';
    if (function_exists('curl_init')) {
        $c = curl_init($destino);
        curl_setopt_array($c, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $cuerpo, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 5]);
        curl_exec($c);
        curl_close($c);
    } else {
        @file_get_contents($destino, false, stream_context_create(['http' => [
            'method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $cuerpo, 'timeout' => 5]]));
    }
}
