"""Métricas del clasificador visual: Accuracy, Precision, Recall, F1 y matriz de confusión.

Dos modos:
  python evaluacion_visual.py --datos dataset_visual      # evalúa el modelo entrenado sobre test/ (requiere TensorFlow)
  python evaluacion_visual.py --autoprueba                 # verifica las funciones con etiquetas sintéticas (sin TF)
La función `calcular_metricas` solo usa scikit-learn y por eso puede probarse sin entrenar el modelo.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support


def calcular_metricas(y_real, y_pred, clases):
    p, r, f, s = precision_recall_fscore_support(y_real, y_pred, labels=range(len(clases)), zero_division=0)
    pm, rm, fm, _ = precision_recall_fscore_support(y_real, y_pred, average="macro", zero_division=0)
    return {"accuracy": float(accuracy_score(y_real, y_pred)), "precision_macro": float(pm), "recall_macro": float(rm), "f1_macro": float(fm),
            "por_clase": {c: {"precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "soporte": int(s[i])} for i, c in enumerate(clases)},
            "matriz_confusion": confusion_matrix(y_real, y_pred, labels=range(len(clases))).tolist()}


def guardar_matriz(cm, clases, ruta):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    cm = np.array(cm); fig, ax = plt.subplots(figsize=(7, 6)); ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(clases))); ax.set_yticks(range(len(clases)))
    ax.set_xticklabels(clases, rotation=45, ha="right"); ax.set_yticklabels(clases)
    for i in range(len(clases)):
        for j in range(len(clases)):
            ax.text(j, i, cm[i, j], ha="center", va="center", color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set_xlabel("Clase predicha"); ax.set_ylabel("Clase real"); ax.set_title("Matriz de confusión del clasificador visual")
    fig.tight_layout(); fig.savefig(ruta, dpi=150); plt.close(fig)


def evaluar_modelo(datos: Path):
    import tensorflow as tf
    from tensorflow import keras
    clases = json.loads(Path("modelos/clases_visual.json").read_text(encoding="utf-8"))
    modelo = keras.models.load_model("modelos/clasificador_visual.keras")
    test = keras.utils.image_dataset_from_directory(datos / "test", image_size=(224, 224), batch_size=32,
                                                    label_mode="int", shuffle=False, class_names=clases)
    y_real = np.concatenate([y.numpy() for _, y in test]); y_pred = modelo.predict(test).argmax(1)
    return calcular_metricas(y_real, y_pred, clases), clases, y_real, y_pred


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--datos", default="dataset_visual"); ap.add_argument("--autoprueba", action="store_true"); a = ap.parse_args()
    if a.autoprueba:
        clases = ["a", "b", "c"]; r = np.array([0, 0, 1, 1, 2, 2]); p = np.array([0, 1, 1, 1, 2, 0])
        m = calcular_metricas(r, p, clases); assert abs(m["accuracy"] - 4 / 6) < 1e-9 and m["matriz_confusion"] == [[1, 1, 0], [0, 2, 0], [1, 0, 1]]
        print("Autoprueba correcta: accuracy", round(m["accuracy"], 3)); return
    m, clases, y, p = evaluar_modelo(Path(a.datos)); Path("resultados_visual").mkdir(exist_ok=True)
    Path("resultados_visual/metricas_visual.json").write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
    guardar_matriz(m["matriz_confusion"], clases, "resultados_visual/matriz_confusion_visual.png")
    print(classification_report(y, p, target_names=clases, digits=3, zero_division=0))


if __name__ == "__main__":
    main()
