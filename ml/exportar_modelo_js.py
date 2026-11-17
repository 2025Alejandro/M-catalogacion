"""Exporta el clasificador de intenciones entrenado (TF-IDF + LinearSVC) a JSON para usarlo en JavaScript (React).

Salidas (carpeta exportado_js/):
  - modeloIntenciones.json : clases, vocabulario (n-gramas -> índice), idf, coeficientes (clases x vocabulario) e intercepto
  - paridad.json           : textos de prueba con tokens esperados, clase predicha y puntajes, para comprobar en Jest que
                             el preprocesamiento y el clasificador de JavaScript dan lo mismo que Python.

Cálculo que debe repetir JavaScript:  tf = 1 + ln(conteo) ; x = tf * idf ; x = x / ||x||2 ; puntaje_c = coef_c · x + intercepto_c
Uso:  python exportar_modelo_js.py
"""
from __future__ import annotations
import json, math
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from preprocesamiento import STEMMER_USADO, STOPWORDS, preprocesar, preprocesar_a_texto

RAIZ = Path(__file__).resolve().parent
SALIDA = RAIZ / "exportado_js"


def puntajes_manual(modelo: dict, texto: str) -> list[float]:
    """Réplica en Python del cálculo que hará JavaScript (sirve para verificar la exportación)."""
    tokens = preprocesar(texto)
    gramas = tokens + [f"{a} {b}" for a, b in zip(tokens, tokens[1:])]
    conteo: dict[int, int] = {}
    for g in gramas:
        i = modelo["vocabulario"].get(g)
        if i is not None:
            conteo[i] = conteo.get(i, 0) + 1
    x = {i: (1 + math.log(c)) * modelo["idf"][i] for i, c in conteo.items()}
    norma = math.sqrt(sum(v * v for v in x.values())) or 1.0
    return [sum(modelo["coef"][c][i] * v / norma for i, v in x.items()) + modelo["intercepto"][c]
            for c in range(len(modelo["clases"]))]


def main() -> None:
    SALIDA.mkdir(exist_ok=True)
    paquete = joblib.load(RAIZ / "modelos" / "clasificador_intenciones.joblib")
    pipe = paquete["pipeline"]; vec, clf = pipe.named_steps["tfidf"], pipe.named_steps["clf"]
    modelo = {
        "version": "avance2", "stemmer": STEMMER_USADO, "clases": [str(c) for c in clf.classes_],
        "vocabulario": {k: int(v) for k, v in vec.vocabulary_.items()},
        "idf": [round(float(v), 6) for v in vec.idf_],
        "coef": [[round(float(w), 5) for w in fila] for fila in clf.coef_],
        "intercepto": [round(float(b), 5) for b in clf.intercept_],
        "stopwords": sorted(STOPWORDS),
    }
    (SALIDA / "modeloIntenciones.json").write_text(json.dumps(modelo, ensure_ascii=False), encoding="utf-8")
    ind = pd.read_csv(RAIZ / "datos" / "intenciones_prueba_independiente.csv")
    muestras = list(ind.texto.sample(25, random_state=7)) + ["¿Qué escena es esta imagen?", "Hola", "¿Qué dicen en el minuto 21:48 del NT20045?"]
    paridad, max_dif = [], 0.0
    for t in muestras:
        p = puntajes_manual(modelo, t); ref = pipe.decision_function([preprocesar_a_texto(t)])[0]
        max_dif = max(max_dif, float(np.max(np.abs(np.array(p) - ref))))
        paridad.append({"texto": t, "tokens": preprocesar(t), "clase": modelo["clases"][int(np.argmax(p))],
                        "puntajes": [round(v, 4) for v in p]})
        assert paridad[-1]["clase"] == str(pipe.predict([preprocesar_a_texto(t)])[0]), t
    (SALIDA / "paridad.json").write_text(json.dumps(paridad, ensure_ascii=False, indent=1), encoding="utf-8")
    kb = (SALIDA / "modeloIntenciones.json").stat().st_size / 1024
    print(f"Modelo exportado: {len(modelo['clases'])} clases, {len(modelo['vocabulario'])} atributos, {kb:.0f} KB")
    print(f"Verificación de la exportación: diferencia máxima de puntajes frente a scikit-learn = {max_dif:.5f}")


if __name__ == "__main__":
    main()
