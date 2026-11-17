"""Entrenamiento y evaluación del clasificador de intenciones (Avance 2).

Pipeline:  preprocesamiento -> TF-IDF (uni y bigramas) -> MultinomialNB  |  LinearSVC
Evaluación:
  - Validación cruzada estratificada (5 pliegues) sobre el conjunto de entrenamiento.
  - Prueba 1: partición por plantilla (frases con estructura no vista en el entrenamiento).
  - Prueba 2: frases independientes escritas a mano con otra redacción (la más exigente).
Salidas en ./resultados_texto/: metricas_texto.json, matriz_confusion_*.png, errores_*.csv,
reporte_*.txt  y  ./modelos/clasificador_intenciones.joblib (SVM entrenado con train + test por plantilla).

Uso:  python clasificador_intenciones.py
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             precision_recall_fscore_support)
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from preprocesamiento import STEMMER_USADO, preprocesar_a_texto

RAIZ = Path(__file__).resolve().parent
DATOS, SALIDA, MODELOS = RAIZ / "datos", RAIZ / "resultados_texto", RAIZ / "modelos"
SEMILLA = 42


def construir(modelo: str) -> Pipeline:
    vec = TfidfVectorizer(preprocessor=None, tokenizer=str.split, token_pattern=None, lowercase=False,
                          ngram_range=(1, 2), sublinear_tf=True, min_df=1)
    clf = MultinomialNB(alpha=0.1) if modelo == "Naive Bayes" else LinearSVC(C=1.0, random_state=SEMILLA)
    return Pipeline([("tfidf", vec), ("clf", clf)])


def metricas(y_real, y_pred) -> dict:
    p, r, f, _ = precision_recall_fscore_support(y_real, y_pred, average="macro", zero_division=0)
    return {"accuracy": accuracy_score(y_real, y_pred), "precision_macro": p, "recall_macro": r, "f1_macro": f}


def guardar_matriz(y_real, y_pred, clases, titulo, ruta):
    cm = confusion_matrix(y_real, y_pred, labels=clases)
    fig, ax = plt.subplots(figsize=(9.5, 8))
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(clases))); ax.set_yticks(range(len(clases)))
    ax.set_xticklabels(clases, rotation=60, ha="right", fontsize=8); ax.set_yticklabels(clases, fontsize=8)
    for i in range(len(clases)):
        for j in range(len(clases)):
            if cm[i, j]:
                ax.text(j, i, cm[i, j], ha="center", va="center", fontsize=7,
                        color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set_xlabel("Intención predicha"); ax.set_ylabel("Intención real"); ax.set_title(titulo)
    fig.tight_layout(); fig.savefig(ruta, dpi=150); plt.close(fig)
    return cm


def main() -> None:
    SALIDA.mkdir(exist_ok=True); MODELOS.mkdir(exist_ok=True)
    df = pd.read_csv(DATOS / "intenciones_dataset.csv")
    ind = pd.read_csv(DATOS / "intenciones_prueba_independiente.csv")
    for d in (df, ind):
        d["proc"] = d["texto"].map(preprocesar_a_texto)
    train, test = df[df.particion == "train"], df[df.particion == "test"]
    clases = sorted(df.intencion.unique())
    print(f"Stemmer: {STEMMER_USADO}\nTrain {len(train)} | Test por plantilla {len(test)} | Independiente {len(ind)} | Intenciones {len(clases)}")

    resultado = {"stemmer": STEMMER_USADO, "n_train": len(train), "n_test_plantilla": len(test),
                 "n_test_independiente": len(ind), "n_intenciones": len(clases), "modelos": {}}
    skf = StratifiedKFold(5, shuffle=True, random_state=SEMILLA)
    for nombre in ("Naive Bayes", "SVM (LinearSVC)"):
        modelo = construir("Naive Bayes" if nombre == "Naive Bayes" else "svm")
        cv = cross_val_score(modelo, train.proc, train.intencion, cv=skf, scoring="f1_macro")
        modelo.fit(train.proc, train.intencion)
        r = {"cv_f1_macro_media": cv.mean(), "cv_f1_macro_desv": cv.std()}
        slug = "nb" if nombre == "Naive Bayes" else "svm"
        for etiqueta, datos in (("plantilla", test), ("independiente", ind)):
            pred = modelo.predict(datos.proc)
            r[etiqueta] = metricas(datos.intencion, pred)
            guardar_matriz(datos.intencion, pred, clases, f"{nombre} · prueba {etiqueta}", SALIDA / f"matriz_confusion_{slug}_{etiqueta}.png")
            rep = classification_report(datos.intencion, pred, labels=clases, zero_division=0, digits=3)
            (SALIDA / f"reporte_{slug}_{etiqueta}.txt").write_text(rep, encoding="utf-8")
            if etiqueta == "independiente":
                r["por_intencion_independiente"] = classification_report(
                    datos.intencion, pred, labels=clases, zero_division=0, output_dict=True)
            err = datos.assign(predicha=pred)
            err[err.intencion != err.predicha][["texto", "intencion", "predicha"]].to_csv(
                SALIDA / f"errores_{slug}_{etiqueta}.csv", index=False, encoding="utf-8")
        resultado["modelos"][nombre] = r
        print(f"\n== {nombre} ==  CV F1 macro {cv.mean():.3f} ± {cv.std():.3f}")
        for etiqueta in ("plantilla", "independiente"):
            m = r[etiqueta]
            print(f"  {etiqueta:<14} acc {m['accuracy']:.3f} | P {m['precision_macro']:.3f} | R {m['recall_macro']:.3f} | F1 {m['f1_macro']:.3f}")

    # Modelo final para integrar: SVM entrenado con todo el conjunto generado (train + test por plantilla)
    final = construir("svm").fit(df.proc, df.intencion)
    joblib.dump({"pipeline": final, "clases": clases, "stemmer": STEMMER_USADO}, MODELOS / "clasificador_intenciones.joblib")
    (SALIDA / "metricas_texto.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2, default=float), encoding="utf-8")
    print(f"\nModelo guardado en {MODELOS / 'clasificador_intenciones.joblib'}\nMétricas en {SALIDA}")


if __name__ == "__main__":
    main()
