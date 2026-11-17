# Entrenar el clasificador visual en Colab

El navegador no entrena ni ejecuta la CNN. Estas instrucciones producen las métricas reales y, si quieres, sustituyen las predicciones simuladas.

1. Abre [Google Colab](https://colab.research.google.com) y activa una GPU (Entorno de ejecución, Cambiar tipo de entorno, GPU).
2. Sube la carpeta `ml/` o clona el repositorio.
3. Abre `ml/Avance2_Colab.ipynb` y ejecuta las celdas en orden.
4. En la pausa de revisión, borra de `imagenes_raw/` las fotos que no correspondan a su clase.
5. Al terminar, copia al proyecto:
   - `ml/resultados_visual/metricas_visual.json`
   - `ml/resultados_visual/matriz_confusion_visual.png`
   - `ml/resultados_visual/historial.csv`
   - `ml/resultados_visual/reporte_visual.txt`
   - `src/data/prediccionesVisual.json` (el cuaderno lo deja en `ml/salida_muestras/`)
   - `public/muestras/*.jpg` y `public/muestras/manifest.json`
6. El JSON copiado debe traer `"modo": "real"`. Reinicia la interfaz. El banner debe decir que las predicciones vienen del modelo entrenado.

No subas `*.keras`, `imagenes_raw/` ni `dataset_visual/` al repositorio. Mientras no exista `metricas_visual.json`, no hay cifras de accuracy, precision, recall ni F1 del clasificador visual: la interfaz usa predicciones marcadas como SIMULADO.
