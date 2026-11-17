"""Descarga imágenes de Wikimedia Commons para el conjunto visual (Avance 2).

Para cada clase se consultan varias búsquedas en la API pública de Commons, se descargan miniaturas
(ancho 640 px) de archivos JPG/PNG y se guarda un manifest.csv con autor, licencia y URL de origen,
para poder citar y respetar cada licencia. Se descartan imágenes cuya licencia no sea de tipo Creative Commons
o dominio público.

Se ejecuta en local, con internet, dentro del contenedor ml. Colab no es necesario para este paso.
Uso:  python visual/descargar_imagenes_commons.py --por-clase 20 --salida imagenes_raw
"""
from __future__ import annotations

import argparse, csv, re, time
from pathlib import Path

import requests

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "AsistenteArchivoUniversidad/1.0 (proyecto académico)"}

BUSQUEDAS = {
    "conferencia_prensa": ["press conference podium microphones", "rueda de prensa", "news conference politician"],
    "entrevista_estudio": ["television interview studio", "news anchor studio", "entrevista televisión estudio"],
    "exteriores_calle": ["street reporter live broadcast", "city street traffic", "reportero en la calle"],
    "ceremonia_evento": ["official ceremony", "award ceremony stage", "ceremonia oficial"],
    "multitud_manifestacion": ["protest crowd", "demonstration march", "manifestación multitud"],
    "deportes_estadio": ["football stadium match", "stadium crowd sport", "estadio deportes"],
}
LICENCIAS_OK = re.compile(r"(CC[ -]BY|CC0|Public domain|PD)", re.I)


def consultar(busqueda: str, limite: int) -> list[dict]:
    p = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrsearch": busqueda,
         "gsrlimit": min(limite, 50), "prop": "imageinfo", "iiprop": "url|extmetadata|mime", "iiurlwidth": 640}
    r = requests.get(API, params=p, headers=HEADERS, timeout=30); r.raise_for_status()
    return list(r.json().get("query", {}).get("pages", {}).values())


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--por-clase", type=int, default=120)
    ap.add_argument("--salida", default="imagenes_raw"); a = ap.parse_args()
    raiz = Path(a.salida); raiz.mkdir(exist_ok=True)
    filas = []
    for clase, consultas in BUSQUEDAS.items():
        carpeta = raiz / clase; carpeta.mkdir(exist_ok=True); n = 0
        for q in consultas:
            for pag in consultar(q, 50):
                if n >= a.por_clase: break
                info = (pag.get("imageinfo") or [{}])[0]
                if info.get("mime") not in ("image/jpeg", "image/png"): continue
                meta = info.get("extmetadata", {}); lic = meta.get("LicenseShortName", {}).get("value", "")
                if not LICENCIAS_OK.search(lic): continue
                url = info.get("thumburl") or info.get("url")
                destino = carpeta / f"{clase}_{n:03d}.jpg"
                try:
                    img = requests.get(url, headers=HEADERS, timeout=30); img.raise_for_status()
                    destino.write_bytes(img.content)
                except Exception as e:
                    print("  omitida:", pag.get("title"), e); continue
                filas.append({"archivo": str(destino), "clase": clase, "titulo": pag.get("title"),
                              "autor": re.sub("<[^>]+>", "", meta.get("Artist", {}).get("value", "")),
                              "licencia": lic, "origen": info.get("descriptionurl", "")})
                n += 1; time.sleep(0.3)
        print(f"{clase}: {n} imágenes")
    with open(raiz / "manifest.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["archivo", "clase", "titulo", "autor", "licencia", "origen"]); w.writeheader(); w.writerows(filas)
    print("Revisa manualmente las carpetas y elimina imágenes que no correspondan a su clase antes de dividir el conjunto.")


if __name__ == "__main__":
    main()
