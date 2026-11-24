<?php
// Configuración del contador propio de la landing Valora × Rappi (va en public_html/rappi junto con registro.php y panel.php).
// Este archivo no se muestra en el navegador: el servidor ejecuta el PHP y no entrega su contenido.

// Clave para entrar a panel.php. Cámbiala por una propia antes de compartir el panel.
const PANEL_CLAVE = 'CAMBIAR-ESTA-CLAVE';

// PostHog: el servidor reenvía cada evento a PostHog. Como sale del servidor de Valora y no del navegador,
// los bloqueadores de anuncios no lo afectan y PostHog recibe todos los eventos.
const POSTHOG_KEY = 'phc_wRpkBKZNiDWAyocy7aTgZcXanofVPfHTqE2T7K3Key8V';                          // Project API key del proyecto en PostHog (empieza por phc_)
const POSTHOG_HOST = 'https://us.i.posthog.com';   // región: EE. UU. https://us.i.posthog.com · Europa https://eu.i.posthog.com

// Únicos eventos que se guardan; cualquier otro nombre se descarta.
const EVENTOS = [
    'page_view', 'section_view', 'scroll_depth', 'cta_click',
    'calc_start', 'calc_brand', 'calc_model', 'calc_price', 'calc_error', 'calc_submit', 'whatsapp_click',
    'video_start', 'video_unmute', 'video_pause', 'video_resume', 'video_progress', 'video_complete',
    'faq_open', 'policy_click',
    'payment_concept', 'payment_click', 'payment_result',
];

// Columnas del archivo de registro, en orden.
const COLUMNAS = [
    'fecha', 'evento', 'codigo', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
    'boton', 'seccion', 'marca', 'referencia', 'precio_millones', 'beneficio_estimado',
    'porcentaje', 'pregunta', 'campo', 'pagina', 'sitio', 'dispositivo', 'interno',
];

date_default_timezone_set('America/Bogota');

// Los registros se guardan fuera de public_html (no se pueden descargar desde internet).
// Si el servidor no permite crear esa carpeta, se usa rappi/datos, protegida con .htaccess.
function carpeta_datos(): string
{
    $fuera = dirname(__DIR__, 2) . '/registros_rappi';
    if (is_dir($fuera) || @mkdir($fuera, 0750, true)) {
        if (is_writable($fuera)) {
            return $fuera;
        }
    }
    $dentro = __DIR__ . '/datos';
    if (!is_dir($dentro)) {
        @mkdir($dentro, 0750, true);
    }
    if (!file_exists($dentro . '/.htaccess')) {
        @file_put_contents($dentro . '/.htaccess', "Require all denied\nDeny from all\n");
    }
    return $dentro;
}

function archivo_registro(): string
{
    return carpeta_datos() . '/eventos.csv';
}
