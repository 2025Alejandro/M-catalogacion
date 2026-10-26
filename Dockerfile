# Imagen de la maqueta Catalogacion.
# Recibe el código de la aplicación y deja un contenedor Node listo para
# servir la interfaz, ejecutar las pruebas o generar el build.
# No incluye ningún modelo de lenguaje: en el modo por defecto la respuesta
# la produce el modelo simulado, sin red y sin IA.
# Se relaciona con docker-compose.yml y con src/config.js.

FROM node:20-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# El servidor de desarrollo tiene que escuchar fuera de localhost del
# contenedor; si no, el puerto publicado no se abre desde Windows.
ENV HOST=0.0.0.0
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV CI=true

EXPOSE 3000

# Si el volumen de node_modules está vacío (el bind mount tapa el de la
# imagen), se instalan las dependencias antes de arrancar el comando.
RUN printf '%s\n' \
  '#!/bin/sh' \
  'if [ ! -x node_modules/.bin/react-scripts ]; then' \
  '  npm install' \
  'fi' \
  'exec "$@"' \
  > /usr/local/bin/docker-entrada.sh \
  && chmod +x /usr/local/bin/docker-entrada.sh

ENTRYPOINT ["docker-entrada.sh"]
CMD ["npm", "start"]
