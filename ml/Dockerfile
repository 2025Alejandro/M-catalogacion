# Imagen del pipeline de texto del Avance 2.
# No incluye TensorFlow ni la CNN: el clasificador visual se entrena en Colab.
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
ENV MPLBACKEND=Agg
CMD ["python", "--version"]
