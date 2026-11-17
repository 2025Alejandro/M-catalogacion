"""Clasificador visual con transferencia de aprendizaje (ResNet50 de ImageNet) - Avance 2.

Fase 1: base congelada + cabeza nueva (GlobalAveragePooling -> Dropout -> Dense softmax).
Fase 2 (fine-tuning): se descongela el último bloque convolucional (conv5_*) con tasa de aprendizaje baja,
        manteniendo las capas BatchNormalization congeladas.
Requiere TensorFlow >= 2.15 (Colab lo trae). NO se pudo ejecutar en el entorno donde se redactó el documento.

Uso:  python clasificador_visual.py --datos dataset_visual --epocas1 12 --epocas2 8 [--modelo resnet50|efficientnetb0]
Salidas: modelos/clasificador_visual.keras, modelos/clases_visual.json, resultados_visual/historial.csv
"""
from __future__ import annotations
import argparse, json
from pathlib import Path

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

TAM = (224, 224)


def cargar(datos: Path, lote: int):
    kw = dict(image_size=TAM, batch_size=lote, label_mode="categorical", seed=42)
    tr = keras.utils.image_dataset_from_directory(datos / "train", shuffle=True, **kw)
    va = keras.utils.image_dataset_from_directory(datos / "val", shuffle=False, **kw)
    clases = tr.class_names
    return tr.prefetch(tf.data.AUTOTUNE), va.prefetch(tf.data.AUTOTUNE), clases


def construir(n_clases: int, modelo: str = "resnet50"):
    aug = keras.Sequential([layers.RandomFlip("horizontal"), layers.RandomRotation(0.05),
                            layers.RandomZoom(0.1), layers.RandomContrast(0.1)], name="aumento")
    if modelo == "resnet50":
        base = keras.applications.ResNet50(include_top=False, weights="imagenet", input_shape=TAM + (3,))
        prep = keras.applications.resnet50.preprocess_input
    else:
        base = keras.applications.EfficientNetB0(include_top=False, weights="imagenet", input_shape=TAM + (3,))
        prep = keras.applications.efficientnet.preprocess_input  # identidad: EfficientNet normaliza internamente
    base.trainable = False
    entrada = keras.Input(TAM + (3,))
    x = aug(entrada); x = layers.Lambda(prep, name="preproceso")(x)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x); x = layers.Dropout(0.3)(x)
    salida = layers.Dense(n_clases, activation="softmax")(x)
    return keras.Model(entrada, salida), base


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--datos", default="dataset_visual")
    ap.add_argument("--epocas1", type=int, default=12); ap.add_argument("--epocas2", type=int, default=8)
    ap.add_argument("--lote", type=int, default=32); ap.add_argument("--modelo", default="resnet50"); a = ap.parse_args()
    tr, va, clases = cargar(Path(a.datos), a.lote)
    modelo, base = construir(len(clases), a.modelo)
    cb = [keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True, monitor="val_accuracy"),
          keras.callbacks.ReduceLROnPlateau(patience=2, factor=0.5)]
    modelo.compile(keras.optimizers.Adam(1e-3), "categorical_crossentropy", ["accuracy"])
    h1 = modelo.fit(tr, validation_data=va, epochs=a.epocas1, callbacks=cb)
    # Fase 2: fine-tuning del último bloque (conv5) sin tocar BatchNorm
    base.trainable = True
    for capa in base.layers:
        capa.trainable = capa.name.startswith("conv5") and not isinstance(capa, layers.BatchNormalization) if a.modelo == "resnet50" else False
    modelo.compile(keras.optimizers.Adam(1e-5), "categorical_crossentropy", ["accuracy"])
    h2 = modelo.fit(tr, validation_data=va, epochs=a.epocas2, callbacks=cb)
    Path("modelos").mkdir(exist_ok=True); Path("resultados_visual").mkdir(exist_ok=True)
    modelo.save("modelos/clasificador_visual.keras")
    Path("modelos/clases_visual.json").write_text(json.dumps(clases, ensure_ascii=False), encoding="utf-8")
    import pandas as pd
    pd.concat([pd.DataFrame(h1.history).assign(fase=1), pd.DataFrame(h2.history).assign(fase=2)]).to_csv("resultados_visual/historial.csv", index=False)
    print("Modelo guardado. Ejecuta evaluacion_visual.py para obtener las métricas sobre el conjunto de prueba.")


if __name__ == "__main__":
    main()
