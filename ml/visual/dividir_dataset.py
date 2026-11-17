"""Divide imagenes_raw/<clase>/*.jpg en dataset_visual/{train,val,test}/<clase>/ (70/15/15).

Se ejecuta en local, dentro del contenedor ml. No hace falta Google Colab:

  docker compose run --rm ml python visual/descargar_imagenes_commons.py --por-clase 20 --salida imagenes_raw
  docker compose run --rm ml python visual/dividir_dataset.py

Antes de dividir elimina duplicados exactos (hash MD5) y archivos que PIL no pueda abrir.
"""
from __future__ import annotations
import argparse, hashlib, random, shutil
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]


def ruta_local(valor: str) -> Path:
    """Resuelve la ruta desde ml/, para que el script no dependa de la carpeta actual."""
    ruta = Path(valor)
    return ruta if ruta.is_absolute() else RAIZ / ruta


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--origen", default="imagenes_raw")
    ap.add_argument("--destino", default="dataset_visual"); ap.add_argument("--semilla", type=int, default=42); a = ap.parse_args()
    origen = ruta_local(a.origen)
    destino = ruta_local(a.destino)
    if not origen.is_dir():
        print(f"No existe la carpeta de origen: {origen}")
        print("Primero descarga las imágenes en esta máquina:")
        print("  docker compose run --rm ml python visual/descargar_imagenes_commons.py --por-clase 20 --salida imagenes_raw")
        raise SystemExit(1)
    rng = random.Random(a.semilla); resumen = {}
    carpetas = sorted(p for p in origen.iterdir() if p.is_dir())
    if not carpetas:
        print(f"{origen} no tiene carpetas de clase. No hay nada que dividir.")
        raise SystemExit(1)
    for carpeta in carpetas:
        vistos, validos = set(), []
        for f in sorted(carpeta.glob("*")):
            if f.suffix.lower() not in (".jpg", ".jpeg", ".png"): continue
            try:
                Image.open(f).verify()
            except Exception:
                print("corrupta, se omite:", f); continue
            h = hashlib.md5(f.read_bytes()).hexdigest()
            if h in vistos: continue
            vistos.add(h); validos.append(f)
        rng.shuffle(validos); n = len(validos); n_tr, n_va = int(.70 * n), int(.15 * n)
        partes = {"train": validos[:n_tr], "val": validos[n_tr:n_tr + n_va], "test": validos[n_tr + n_va:]}
        for nombre, archivos in partes.items():
            d = destino / nombre / carpeta.name; d.mkdir(parents=True, exist_ok=True)
            for f in archivos: shutil.copy2(f, d / f.name)
        resumen[carpeta.name] = {k: len(v) for k, v in partes.items()}
    print(f"Origen: {origen}")
    print(f"Destino: {destino}")
    print(f"{'clase':<26} {'train':>6} {'val':>6} {'test':>6}")
    for c, r in resumen.items():
        print(f"{c:<26} {r['train']:>6} {r['val']:>6} {r['test']:>6}")
    informe = destino / "resumen_division.txt"
    lineas = [f"{c}\t{r['train']}\t{r['val']}\t{r['test']}" for c, r in resumen.items()]
    informe.write_text("clase\ttrain\tval\ttest\n" + "\n".join(lineas) + "\n", encoding="utf-8")
    print(f"Resumen escrito en {informe}")


if __name__ == "__main__":
    main()
