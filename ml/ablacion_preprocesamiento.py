"""Ablación del preprocesamiento (Avance 2): reentrena el SVM quitando un paso cada vez y mide el efecto.

Configuraciones: completo | sin stopwords | sin stemming | sin stopwords ni stemming.
Salidas: resultados_texto/ablacion.json  (accuracy y F1 macro en la prueba por plantilla y en la independiente).
Uso:  python ablacion_preprocesamiento.py
"""
from __future__ import annotations
import json
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, f1_score
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from preprocesamiento import STEMMER_USADO, preprocesar

RAIZ = Path(__file__).resolve().parent
CONFIGS = {"completo": (True, True), "sin_stopwords": (False, True), "sin_stemming": (True, False), "sin_stopwords_ni_stemming": (False, False)}


def main() -> None:
    df = pd.read_csv(RAIZ / "datos" / "intenciones_dataset.csv")
    ind = pd.read_csv(RAIZ / "datos" / "intenciones_prueba_independiente.csv")
    tr, te = df[df.particion == "train"], df[df.particion == "test"]
    salida = {"stemmer": STEMMER_USADO, "configuraciones": {}}
    for nombre, (sw, st) in CONFIGS.items():
        f = lambda t: " ".join(preprocesar(t, sw, st))
        modelo = Pipeline([("v", TfidfVectorizer(tokenizer=str.split, token_pattern=None, lowercase=False, ngram_range=(1, 2), sublinear_tf=True)),
                           ("c", LinearSVC(random_state=42))]).fit(tr.texto.map(f), tr.intencion)
        r = {}
        for etiqueta, datos in (("plantilla", te), ("independiente", ind)):
            y = modelo.predict(datos.texto.map(f))
            r[etiqueta] = {"accuracy": round(accuracy_score(datos.intencion, y), 3), "f1_macro": round(f1_score(datos.intencion, y, average="macro"), 3)}
        salida["configuraciones"][nombre] = r
        print(f"{nombre:<28} plantilla {r['plantilla']} | independiente {r['independiente']}")
    (RAIZ / "resultados_texto").mkdir(exist_ok=True)
    (RAIZ / "resultados_texto" / "ablacion.json").write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
