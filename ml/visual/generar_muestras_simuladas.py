"""Genera 12 miniaturas sintéticas para el modo visual simulado.

No son fotografías ni contienen personas. Cada imagen es un rectángulo
con el nombre de la clase y el rótulo MUESTRA SIMULADA.
Uso: python visual/generar_muestras_simuladas.py
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CLASES = [
    "conferencia_prensa",
    "entrevista_estudio",
    "exteriores_calle",
    "ceremonia_evento",
    "multitud_manifestacion",
    "deportes_estadio",
]
COLORES = {
    "conferencia_prensa": (70, 90, 120),
    "entrevista_estudio": (90, 110, 90),
    "exteriores_calle": (120, 110, 70),
    "ceremonia_evento": (110, 80, 80),
    "multitud_manifestacion": (80, 80, 110),
    "deportes_estadio": (70, 110, 90),
}


def main() -> None:
    destino = Path(__file__).resolve().parents[1] / "muestras_simuladas"
    destino.mkdir(parents=True, exist_ok=True)
    manifest = []
    fuente = ImageFont.load_default()
    for clase in CLASES:
        for n in (1, 2):
            nombre = f"muestra_{clase}_{n}.jpg"
            imagen = Image.new("RGB", (320, 200), COLORES[clase])
            dibujo = ImageDraw.Draw(imagen)
            dibujo.text((12, 70), clase.replace("_", " "), fill=(255, 255, 255), font=fuente)
            dibujo.text((12, 110), "MUESTRA SIMULADA", fill=(255, 230, 180), font=fuente)
            imagen.save(destino / nombre, quality=85)
            manifest.append({
                "archivo": nombre,
                "clase": clase,
                "autor": "generado para la maqueta",
                "licencia": "sintetica, sin terceros",
                "origen": "ml/visual/generar_muestras_simuladas.py",
            })
    (destino / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"{len(manifest)} miniaturas en {destino}")


if __name__ == "__main__":
    main()
