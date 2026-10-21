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
TELEFONO_VISIBLE = "+57 319 486 5610"


def b64(nombre):
    return base64.b64encode((ASSETS / nombre).read_bytes()).decode()


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
    .replace("__LOGO__", b64("logo.png"))
    .replace("<!--QR-->", qr_svg())
    .replace("__TELEFONO__", TELEFONO_VISIBLE)
    .replace("__ENLACE__", ENLACE)
)
(AQUI / "tarjeta-cyo.html").write_text(html)
print("tarjeta-cyo.html listo ->", ENLACE)
