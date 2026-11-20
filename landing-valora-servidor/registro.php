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
    $campo('field'),
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
