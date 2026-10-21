"""Genera la tarjeta de presentación de C&O (HTML imprimible con todo embebido).

El QR es estático: el enlace va escrito dentro del propio código, no pasa por
ningún servicio de redirección, así que no caduca nunca.

Uso: python3 build.py  ->  tarjeta-cyo.html
"""
import base64
import pathlib

import segno

AQUI = pathlib.Path(__file__).parent
ASSETS = AQUI / "assets"

TELEFONO = "573194865610"            # +57 319 486 5610
ENLACE = f"https://wa.me/{TELEFONO}"  # abre el chat de WhatsApp con ese número
TELEFONO_VISIBLE = "319 486 5610"
USUARIO = "@lacasadelmarketinginmobiliarioco"
CORREO = "coagenciarealestate@gmail.com"


def b64(nombre):
    return base64.b64encode((ASSETS / nombre).read_bytes()).decode()


def svg_interno(nombre, clase):
    """SVG de assets/ embebido en línea (vector puro, toma el color del texto)."""
    import re
    svg = (ASSETS / nombre).read_text()
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    caminos = "".join(re.findall(r"<path[^>]*/>", svg))
    return (
        f'<svg class="{clase}" viewBox="{vb}" fill="currentColor" '
        f'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">{caminos}</svg>'
    )


# Edificios: (x, ancho, alto, remate) sobre un lienzo de 960 × 200 (= 96 × 20 mm)
# remate: "" plano, "e" escalonado, "a" antena, "p" punta
FONDO = [
    (0, 40, 70, ""), (36, 30, 110, "e"), (64, 46, 88, ""), (108, 26, 140, "a"),
    (132, 54, 96, ""), (184, 34, 150, "e"), (216, 48, 104, ""), (262, 30, 128, "p"),
    (290, 58, 92, ""), (346, 36, 120, "e"),
    (380, 46, 100, ""), (424, 30, 136, "a"), (452, 52, 88, ""), (502, 48, 112, "e"),
    (548, 40, 118, "e"), (586, 52, 96, ""),
    (636, 30, 146, "a"), (664, 56, 102, ""), (718, 34, 132, "e"), (750, 50, 90, ""),
    (798, 28, 124, "p"), (824, 60, 98, ""), (882, 32, 116, "e"), (912, 48, 84, ""),
]
FRENTE = [
    (0, 58, 46, ""), (56, 34, 72, "e"), (88, 50, 54, ""), (136, 28, 94, "a"),
    (162, 62, 60, ""), (222, 36, 84, "e"), (256, 52, 50, ""), (306, 30, 104, "p"),
    (334, 64, 58, ""), (396, 40, 76, "e"), (434, 44, 44, ""), (476, 34, 70, ""),
    (508, 46, 52, ""), (552, 36, 88, "e"), (586, 58, 56, ""), (642, 28, 108, "a"),
    (668, 60, 62, ""), (726, 38, 82, "e"), (762, 50, 48, ""), (810, 30, 98, "p"),
    (838, 62, 60, ""), (898, 34, 78, "e"), (930, 30, 52, ""),
]


def edificio(x, an, al, remate, base=204):
    top = base - al
    if remate == "e":
        p = an * 0.22
        return (f"M{x} {base}V{top + 10}H{x + p}V{top}H{x + an - p}V{top + 10}"
                f"H{x + an}V{base}Z")
    if remate == "a":
        c = x + an / 2
        return (f"M{x} {base}V{top}H{c - 1.2}V{top - 26}H{c + 1.2}V{top}"
                f"H{x + an}V{base}Z")
    if remate == "p":
        c = x + an / 2
        return f"M{x} {base}V{top}L{c} {top - 22}L{x + an} {top}V{base}Z"
    return f"M{x} {base}V{top}H{x + an}V{base}Z"


def skyline_svg():
    """Ciudad en línea fina dorada: cada edificio se rellena de negro para tapar
    los trazos de los que quedan detrás, así sólo se ve el contorno."""
    def capa(lista, opacidad, grosor):
        return "".join(
            f'<path d="{edificio(*b)}" fill="#0E0E0E" stroke="url(#oro)" '
            f'stroke-opacity="{opacidad}" stroke-width="{grosor}" stroke-linejoin="miter"/>'
            for b in lista
        )
    return (
        '<svg class="ciudad" viewBox="0 0 960 200" '
        'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
        '<defs><linearGradient id="oro" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="960" y2="0">'
        '<stop offset="0" stop-color="#8A6F4C"/><stop offset=".3" stop-color="#CDBEA3"/>'
        '<stop offset=".5" stop-color="#AA8B64"/><stop offset=".72" stop-color="#E3DAC5"/>'
        '<stop offset="1" stop-color="#8A6F4C"/></linearGradient></defs>'
        + capa(FONDO, ".45", "1.3")
        + capa(FRENTE, ".95", "1.6")
        + '</svg>'
    )


def qr_svg():
    """QR como un único <path> vectorial (nítido a cualquier tamaño de impresión)."""
    q = segno.make(ENLACE, error="q", micro=False)
    filas = list(q.matrix_iter(border=4))
    n = len(filas)
    trazos = []
    for y, fila in enumerate(filas):
        x = 0
        while x < n:
            if fila[x]:
                ini = x
                while x < n and fila[x]:
                    x += 1
                trazos.append(f"M{ini} {y}h{x - ini}v1h-{x - ini}z")
            else:
                x += 1
    return (
        f'<svg class="qr" viewBox="0 0 {n} {n}" shape-rendering="crispEdges" '
        f'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR a WhatsApp {TELEFONO_VISIBLE}">'
        f'<rect width="{n}" height="{n}" fill="#FFFFFF"/>'
        f'<path fill="#121212" d="{"".join(trazos)}"/></svg>'
    )


FUENTES = [
    ("Inria Serif", 300, "normal", "inria-serif-latin-300-normal.woff2"),
    ("Inria Serif", 300, "italic", "inria-serif-latin-300-italic.woff2"),
    ("Inria Serif", 400, "normal", "inria-serif-latin-400-normal.woff2"),
    ("Inria Serif", 400, "italic", "inria-serif-latin-400-italic.woff2"),
    ("Jost", 400, "normal", "jost-latin-400-normal.woff2"),
    ("Jost", 500, "normal", "jost-latin-500-normal.woff2"),
    ("Jost", 600, "normal", "jost-latin-600-normal.woff2"),
    ("DM Mono", 400, "normal", "dm-mono-latin-400-normal.woff2"),
    ("DM Mono", 500, "normal", "dm-mono-latin-500-normal.woff2"),
]


def font_faces():
    return "\n".join(
        f"@font-face{{font-family:'{f}';font-weight:{w};font-style:{s};"
        f"src:url(data:font/woff2;base64,{b64('fonts/' + a)}) format('woff2')}}"
        for f, w, s, a in FUENTES
    )


PLANTILLA = (AQUI / "plantilla.html").read_text()

html = (
    PLANTILLA.replace("/*FUENTES*/", font_faces())
    .replace("<!--LOGO-->", svg_interno("logo.svg", "monograma"))
    .replace("<!--CIUDAD-->", skyline_svg())
    .replace("<!--INSTAGRAM-->", svg_interno("instagram.svg", "icono"))
    .replace("<!--TIKTOK-->", svg_interno("tiktok.svg", "icono"))
    .replace("<!--FACEBOOK-->", svg_interno("facebook.svg", "icono"))
    .replace("__USUARIO__", USUARIO)
    .replace("__CORREO__", CORREO)
    .replace("<!--QR-->", qr_svg())
    .replace("__TELEFONO__", TELEFONO_VISIBLE)
    .replace("__ENLACE__", ENLACE)
)
(AQUI / "tarjeta-cyo.html").write_text(html)
print("tarjeta-cyo.html listo ->", ENLACE)
