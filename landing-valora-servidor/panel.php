<?php
// Panel con el acumulado exacto de cada acción de la landing, para cualquier periodo. Protegido con la clave de registro-config.php.
require __DIR__ . '/registro-config.php';

session_start();
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$e = fn($t) => htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8');

if (isset($_GET['salir'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: panel.php');
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['clave'])) {
    if (PANEL_CLAVE !== 'CAMBIAR-ESTA-CLAVE' && hash_equals(PANEL_CLAVE, (string) $_POST['clave'])) {
        session_regenerate_id(true);
        $_SESSION['panel_ok'] = true;
        header('Location: panel.php');
        exit;
    }
    $error_clave = true;
}

$estilos = '<style>
  :root { --dark:#0b1f24; --brand:#13a38a; --accent:#c6f24e; --ink:#10201f; --muted:#5a6b69; --line:#dfe7e5; --soft:#f3f7f6; }
  * { box-sizing:border-box; } body { margin:0; font-family:Inter,Helvetica,Arial,sans-serif; color:var(--ink); background:var(--soft); font-size:14px; }
  header { background:var(--dark); color:#fff; padding:14px 20px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
  header a { color:var(--accent); } main { max-width:1100px; margin:0 auto; padding:20px 16px 48px; }
  h1 { font-size:18px; margin:0; } h2 { font-size:16px; margin:28px 0 10px; }
  .filtros { background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px; display:flex; gap:12px; flex-wrap:wrap; align-items:end; }
  .filtros label { display:grid; gap:4px; font-weight:600; font-size:12px; } input, button, select { font:inherit; padding:8px 10px; border:1px solid var(--line); border-radius:8px; }
  button, .btn { background:var(--dark); color:#fff; border:0; cursor:pointer; text-decoration:none; padding:9px 14px; border-radius:8px; display:inline-block; }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-top:16px; }
  .kpi { background:#fff; border:1px solid var(--line); border-radius:12px; padding:12px; } .kpi b { display:block; font-size:24px; color:var(--brand); } .kpi span { color:var(--muted); font-size:12px; }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); } th { background:var(--soft); font-size:12px; color:var(--muted); } td.n, th.n { text-align:right; font-variant-numeric:tabular-nums; }
  .nota { color:var(--muted); font-size:12px; margin:6px 0 0; } .grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; }
  .login { max-width:340px; margin:80px auto; background:#fff; border:1px solid var(--line); border-radius:14px; padding:24px; display:grid; gap:12px; } .err { color:#c2412d; }
</style>';

if (empty($_SESSION['panel_ok'])) {
    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Panel · Valora × Rappi</title>' . $estilos . '</head><body>';
    echo '<form class="login" method="post"><h1>Panel de resultados · Valora × Rappi</h1>';
    if (PANEL_CLAVE === 'CAMBIAR-ESTA-CLAVE') {
        echo '<p class="err">Antes de entrar, define una clave en registro-config.php.</p>';
    }
    if (!empty($error_clave)) {
        echo '<p class="err">Clave incorrecta.</p>';
    }
    echo '<label>Clave <input type="password" name="clave" autofocus required></label><button>Entrar</button></form></body></html>';
    exit;
}

// ---- Filtros ----
$hoy = date('Y-m-d');
$valida = fn($d) => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $d) ? $d : null;
$desde = $valida($_GET['desde'] ?? '') ?? date('Y-m-d', strtotime('-29 days'));
$hasta = $valida($_GET['hasta'] ?? '') ?? $hoy;
$con_internas = !empty($_GET['internas']);
$ini = $desde . ' 00:00:00';
$fin = $hasta . ' 23:59:59';

// ---- Lectura del registro ----
$filas = [];
$archivo = archivo_registro();
if (is_readable($archivo) && ($f = fopen($archivo, 'r'))) {
    $cab = fgetcsv($f);
    while (($r = fgetcsv($f)) !== false) {
        if (count($r) !== count(COLUMNAS)) {
            continue;
        }
        $r = array_combine(COLUMNAS, $r);
        if ($r['fecha'] < $ini || $r['fecha'] > $fin) {
            continue;
        }
        if (!$con_internas && $r['interno'] === '1') {
            continue;
        }
        $filas[] = $r;
    }
    fclose($f);
}

if (isset($_GET['descargar'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="eventos_valora_rappi_' . $desde . '_a_' . $hasta . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, COLUMNAS);
    foreach ($filas as $r) {
        fputcsv($out, array_values($r));
    }
    exit;
}

// Las páginas de pagos (pagar.html y gracias.html) van en su propia sección: no suman a las visitas ni a la conversión de la landing
$es_pago = fn($r) => preg_match('~/(pagar|gracias)\.html$~', $r['pagina']) || strpos($r['evento'], 'payment_') === 0;
$filas_pago = array_values(array_filter($filas, $es_pago));
$filas = array_values(array_filter($filas, fn($r) => !$es_pago($r)));

// ---- Cálculos ----
$total = [];      // evento => cantidad
$personas = [];   // evento => [codigo => true]
foreach ($filas as $r) {
    $total[$r['evento']] = ($total[$r['evento']] ?? 0) + 1;
    if ($r['codigo'] !== '') {
        $personas[$r['evento']][$r['codigo']] = true;
    }
}
$cuenta = fn($ev) => $total[$ev] ?? 0;
$unicos = fn($ev) => isset($personas[$ev]) ? count($personas[$ev]) : 0;
$pct = fn($a, $b) => $b > 0 ? round($a / $b * 100, 1) . '%' : '—';

$nombres = [
    'page_view' => 'Visitas a la página', 'cta_click' => 'Clic en un botón hacia la calculadora',
    'calc_start' => 'Empezó la calculadora', 'calc_brand' => 'Eligió marca', 'calc_model' => 'Eligió referencia',
    'calc_price' => 'Escribió el precio', 'calc_error' => 'Error al enviar la calculadora',
    'calc_submit' => 'Envió la calculadora', 'whatsapp_click' => 'Abrió WhatsApp',
    'video_start' => 'Video empezó', 'video_unmute' => 'Activó el sonido', 'video_pause' => 'Pausó el video',
    'video_resume' => 'Reanudó el video', 'video_progress' => 'Avance del video (25/50/75%)', 'video_complete' => 'Vio el video completo',
    'section_view' => 'Vio una sección', 'scroll_depth' => 'Bajó en la página (25-100%)',
    'faq_open' => 'Abrió una pregunta frecuente', 'policy_click' => 'Abrió la política de datos',
];

$por_origen = [];
foreach ($filas as $r) {
    $k = ($r['utm_source'] ?: '(sin UTM)') . ' · ' . ($r['utm_content'] ?: '—');
    if ($r['evento'] === 'page_view' && $r['codigo'] !== '') {
        $por_origen[$k]['v'][$r['codigo']] = true;
    }
    if ($r['evento'] === 'calc_submit') {
        $por_origen[$k]['s'] = ($por_origen[$k]['s'] ?? 0) + 1;
    }
    if ($r['evento'] === 'whatsapp_click') {
        $por_origen[$k]['w'] = ($por_origen[$k]['w'] ?? 0) + 1;
    }
}
uasort($por_origen, fn($a, $b) => count($b['v'] ?? []) <=> count($a['v'] ?? []));

$por_boton = [];
foreach ($filas as $r) {
    if ($r['evento'] === 'cta_click') {
        $por_boton[$r['boton'] ?: 'otro'] = ($por_boton[$r['boton'] ?: 'otro'] ?? 0) + 1;
    }
}
arsort($por_boton);
$nombres_boton = [
    'hero_descubre' => 'Descubre si tu carro aplica (arriba)', 'razones_hazlo_ya' => 'Hazlo ya',
    'cierre_quiero_beneficio' => 'Quiero mi beneficio (bloque final)', 'boton_fijo_movil' => 'Botón fijo en celular',
    'faq_respuesta' => 'Enlace en preguntas frecuentes',
];

$por_dia = [];
foreach ($filas as $r) {
    $d = substr($r['fecha'], 0, 10);
    $por_dia[$d] ??= ['v' => [], 'c' => 0, 's' => 0, 'w' => 0];
    if ($r['evento'] === 'page_view' && $r['codigo'] !== '') $por_dia[$d]['v'][$r['codigo']] = true;
    if ($r['evento'] === 'cta_click') $por_dia[$d]['c']++;
    if ($r['evento'] === 'calc_submit') $por_dia[$d]['s']++;
    if ($r['evento'] === 'whatsapp_click') $por_dia[$d]['w']++;
}
krsort($por_dia);

$preguntas = [];
foreach ($filas as $r) {
    if ($r['evento'] === 'faq_open') $preguntas[$r['pregunta']] = ($preguntas[$r['pregunta']] ?? 0) + 1;
}
arsort($preguntas);

$leads = array_reverse(array_values(array_filter($filas, fn($r) => $r['evento'] === 'calc_submit')));
$qs = fn($extra) => '?' . http_build_query(array_merge(['desde' => $desde, 'hasta' => $hasta, 'internas' => $con_internas ? 1 : null], $extra));

// ---- Página ----
echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Panel · Valora × Rappi</title>' . $estilos . '</head><body>';
echo '<header><h1>Resultados de la landing · Valora × Rappi</h1><span><a href="' . $e($qs(['descargar' => 1])) . '">Descargar datos (CSV)</a> · <a href="?salir=1">Salir</a></span></header><main>';
echo '<form class="filtros" method="get"><label>Desde <input type="date" name="desde" value="' . $e($desde) . '"></label><label>Hasta <input type="date" name="hasta" value="' . $e($hasta) . '"></label>';
echo '<label style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" name="internas" value="1"' . ($con_internas ? ' checked' : '') . '> Incluir visitas internas y de prueba</label><button>Ver periodo</button></form>';
echo '<p class="nota">Hora de Colombia. Una "persona" es un navegador: quien entra desde el celular y luego desde el computador cuenta como dos.</p>';

$v = $unicos('page_view');
$s = $unicos('calc_submit');
echo '<div class="kpis">';
foreach ([
    ['Personas que visitaron', $v], ['Visitas', $cuenta('page_view')], ['Clics hacia la calculadora', $cuenta('cta_click')],
    ['Personas que empezaron la calculadora', $unicos('calc_start')], ['Envíos de la calculadora', $cuenta('calc_submit')],
    ['Aperturas de WhatsApp', $cuenta('whatsapp_click')], ['Conversión (personas que enviaron ÷ visitantes)', $pct($s, $v)],
] as [$t, $n]) {
    echo '<div class="kpi"><b>' . $e($n) . '</b><span>' . $e($t) . '</span></div>';
}
echo '</div>';

echo '<h2>Acumulado por acción</h2><table><tr><th>Acción</th><th class="n">Veces</th><th class="n">Personas</th></tr>';
foreach ($nombres as $ev => $txt) {
    echo '<tr><td>' . $e($txt) . '</td><td class="n">' . $cuenta($ev) . '</td><td class="n">' . $unicos($ev) . '</td></tr>';
}
echo '</table>';

echo '<div class="grid2"><div><h2>Por origen (UTM)</h2><table><tr><th>Fuente · pieza</th><th class="n">Personas</th><th class="n">Envíos</th><th class="n">WhatsApp</th></tr>';
foreach ($por_origen as $k => $o) {
    echo '<tr><td>' . $e($k) . '</td><td class="n">' . count($o['v'] ?? []) . '</td><td class="n">' . ($o['s'] ?? 0) . '</td><td class="n">' . ($o['w'] ?? 0) . '</td></tr>';
}
echo '</table></div><div><h2>Clics por botón</h2><table><tr><th>Botón</th><th class="n">Clics</th></tr>';
foreach ($por_boton as $b => $n) {
    echo '<tr><td>' . $e($nombres_boton[$b] ?? $b) . '</td><td class="n">' . $n . '</td></tr>';
}
echo '</table></div></div>';

echo '<h2>Por día</h2><table><tr><th>Día</th><th class="n">Personas</th><th class="n">Clics a la calculadora</th><th class="n">Envíos</th><th class="n">WhatsApp</th></tr>';
foreach ($por_dia as $d => $x) {
    echo '<tr><td>' . $e($d) . '</td><td class="n">' . count($x['v']) . '</td><td class="n">' . $x['c'] . '</td><td class="n">' . $x['s'] . '</td><td class="n">' . $x['w'] . '</td></tr>';
}
echo '</table>';

echo '<h2>Leads de la calculadora</h2><p class="nota">El código es el mismo que llega en el mensaje de WhatsApp.</p><table><tr><th>Fecha</th><th>Código</th><th>Marca</th><th>Referencia</th><th class="n">Precio (millones)</th><th>Fuente</th><th>Pieza</th><th>Dispositivo</th></tr>';
foreach ($leads as $r) {
    echo '<tr><td>' . $e($r['fecha']) . '</td><td>' . $e($r['codigo']) . '</td><td>' . $e($r['marca']) . '</td><td>' . $e($r['referencia']) . '</td><td class="n">' . $e($r['precio_millones']) . '</td><td>' . $e($r['utm_source'] ?: '(sin UTM)') . '</td><td>' . $e($r['utm_content'] ?: '—') . '</td><td>' . $e($r['dispositivo']) . '</td></tr>';
}
echo '</table>';

echo '<h2>Pagos con Bold (pagar.html)</h2><p class="nota">Aquí se ve quién fue a pagar y qué concepto eligió. El pago real (valor y aprobación) se confirma en el panel de Bold.</p>';
$pv = []; $pc = []; $por_concepto = [];
foreach ($filas_pago as $r) {
    if ($r['evento'] === 'page_view' && $r['codigo'] !== '' && substr($r['pagina'], -10) === 'pagar.html') $pv[$r['codigo']] = true;
    if ($r['evento'] === 'payment_click') {
        $pc[] = $r;
        $por_concepto[$r['campo']] = ($por_concepto[$r['campo']] ?? 0) + 1;
    }
}
$resultados = [];
foreach ($filas_pago as $r) {
    if ($r['evento'] === 'payment_result') $resultados[$r['campo']] = ($resultados[$r['campo']] ?? 0) + 1;
}
$aprobados = $resultados['approved'] ?? 0;
$no_completados = ($resultados['rejected'] ?? 0) + ($resultados['failed'] ?? 0);
echo '<div class="kpis">';
foreach ([['Personas en la página de pagos', count($pv)], ['Clics en "Ir a pagar con Bold"', count($pc)], ['Volvieron de Bold con pago aprobado', $aprobados], ['Volvieron de Bold en proceso', $resultados['pending'] ?? 0], ['Volvieron de Bold sin completar el pago', $no_completados]] as [$tt, $n]) {
    echo '<div class="kpi"><b>' . $e($n) . '</b><span>' . $e($tt) . '</span></div>';
}
echo '</div>';
if ($pc) {
    arsort($por_concepto);
    echo '<div class="grid2"><div><table><tr><th>Concepto</th><th class="n">Clics para pagar</th></tr>';
    foreach ($por_concepto as $c => $n) {
        echo '<tr><td>' . $e($c) . '</td><td class="n">' . $n . '</td></tr>';
    }
    echo '</table></div><div><table><tr><th>Fecha</th><th>Código</th><th>Concepto</th><th>Dispositivo</th></tr>';
    foreach (array_reverse($pc) as $r) {
        echo '<tr><td>' . $e($r['fecha']) . '</td><td>' . $e($r['codigo']) . '</td><td>' . $e($r['campo']) . '</td><td>' . $e($r['dispositivo']) . '</td></tr>';
    }
    echo '</table></div></div>';
}

if ($preguntas) {
    echo '<h2>Preguntas frecuentes abiertas</h2><table><tr><th>Pregunta</th><th class="n">Veces</th></tr>';
    foreach ($preguntas as $q => $n) {
        echo '<tr><td>' . $e($q) . '</td><td class="n">' . $n . '</td></tr>';
    }
    echo '</table>';
}
echo '</main></body></html>';
