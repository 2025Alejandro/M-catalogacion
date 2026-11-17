"""Genera las muestras y las predicciones que usa la interfaz React (se ejecuta en Colab DESPUÉS de entrenar).

Toma del conjunto de PRUEBA 2 imágenes por clase (semilla fija), las copia a muestras/ y escribe prediccionesVisual.json
(modo "real") con la clase predicha y las probabilidades del modelo entrenado. Si existe imagenes_raw/manifest.csv,
escribe también muestras/manifest.json con autor, licencia y origen de cada muestra.
Uso (desde ml/):  python visual/predecir_muestras.py --datos dataset_visual --salida salida_muestras
Después copiar salida_muestras/prediccionesVisual.json a src/data/ y salida_muestras/muestras/ a public/muestras/.
"""
from __future__ import annotations
import argparse, csv, json, random, shutil
from pathlib import Path

import numpy as np
from tensorflow import keras


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", default="dataset_visual"); ap.add_argument("--salida", default="salida_muestras")
    ap.add_argument("--manifest", default="imagenes_raw/manifest.csv"); a = ap.parse_args()
    clases = json.loads(Path("modelos/clases_visual.json").read_text(encoding="utf-8"))
    modelo = keras.models.load_model("modelos/clasificador_visual.keras")
    origen = {}
    if Path(a.manifest).exists():
        with open(a.manifest, encoding="utf-8") as f:
            origen = {Path(r["archivo"]).name: r for r in csv.DictReader(f)}
    rng = random.Random(42); sal = Path(a.salida) / "muestras"; sal.mkdir(parents=True, exist_ok=True)
    muestras, manifest = [], []
    for clase in clases:
        archivos = sorted((Path(a.datos) / "test" / clase).glob("*.jp*g")) + sorted((Path(a.datos) / "test" / clase).glob("*.png"))
        for n, f in enumerate(rng.sample(archivos, min(2, len(archivos))), start=1):
            mid = f"muestra_{clase}_{n}"; destino = sal / f"{mid}.jpg"; shutil.copy2(f, destino)
            img = keras.utils.load_img(f, target_size=(224, 224)); x = np.expand_dims(keras.utils.img_to_array(img), 0)
            p = modelo.predict(x, verbose=0)[0]; i = int(p.argmax())
            muestras.append({"id": mid, "archivo": f"muestras/{mid}.jpg", "clase_real": clase, "clase_predicha": clases[i],
                             "confianza": round(float(p[i]), 4), "probabilidades": {c: round(float(p[k]), 4) for k, c in enumerate(clases)}})
            o = origen.get(f.name, {})
            manifest.append({"archivo": f"{mid}.jpg", "clase": clase, "autor": o.get("autor", ""), "licencia": o.get("licencia", ""), "origen": o.get("origen", "")})
    (Path(a.salida) / "prediccionesVisual.json").write_text(json.dumps(
        {"modo": "real", "aviso": "", "modelo": "ResNet50 (transferencia de aprendizaje, ImageNet)", "clases": clases, "muestras": muestras},
        ensure_ascii=False, indent=2), encoding="utf-8")
    (sal / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(muestras)} muestras escritas en {a.salida}")


if __name__ == "__main__":
    main()
