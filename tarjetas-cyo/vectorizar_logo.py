"""Convierte assets/logo.png (raster) en assets/logo.svg (vector) para que el
monograma salga nítido a cualquier tamaño de impresión.

Uso: python3 vectorizar_logo.py
"""
import pathlib

import numpy as np
import potrace
from PIL import Image, ImageFilter

ASSETS = pathlib.Path(__file__).parent / "assets"

ESCALA = 4  # se amplía antes de trazar para que las curvas salgan suaves
im = Image.open(ASSETS / "logo.png").convert("RGBA")
alfa = im.getchannel("A").resize((im.width * ESCALA, im.height * ESCALA), Image.LANCZOS)
alfa = alfa.filter(ImageFilter.GaussianBlur(ESCALA * 2.2))
mapa = np.array(alfa) <= 128  # potracer traza los píxeles en False

trazo = potrace.Bitmap(mapa).trace(turdsize=40, alphamax=1.1, opticurve=True, opttolerance=0.8)

partes = []
for curva in trazo:
    p = curva.start_point
    d = [f"M{p.x:.1f} {p.y:.1f}"]
    for seg in curva.segments:
        if seg.is_corner:
            d.append(f"L{seg.c.x:.1f} {seg.c.y:.1f}L{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
        else:
            d.append(
                f"C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} "
                f"{seg.end_point.x:.1f} {seg.end_point.y:.1f}"
            )
    partes.append("".join(d) + "Z")

w, h = alfa.size
(ASSETS / "logo.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">'
    f'<path fill-rule="evenodd" d="{"".join(partes)}"/></svg>'
)
print("logo.svg:", len(trazo), "contornos")
