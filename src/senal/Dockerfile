# Imagen de señalización de reuniones.cenitdigital.es (KubernetesInfrastructure#64): vdoninja_advanced.js de
# steveseguin/websocket_server (AGPL-3.0) en WebSocket plano por :8080; TLS lo termina Traefik delante (wss://…/wss).
# Sin SERVER_CERT ni CERT_PATH el servidor sirve HTTP (su createServer cae a http.createServer), que es lo que se quiere.
# Contrato con la infraestructura: UID 1000 (node), raíz de solo lectura, linux/amd64 y despliegue por digest.
# Fuente fijada por commit y checksum: 5b65d419d17db58142591ff6881f9ae4e9d8ba7c. Base fijada por digest (Docker Hub, 22.23.3-alpine del 2026-09-23).

FROM docker.io/library/node:22.23.3-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS fuente
WORKDIR /src
ADD --checksum=sha256:fda2f8d99f63e7e07cf1a57731b19f3318e9d79f6fad3fbbedb997a7c4abb882 \
    https://github.com/steveseguin/websocket_server/archive/5b65d419d17db58142591ff6881f9ae4e9d8ba7c.tar.gz /src/wss.tar.gz
RUN mkdir /app \
    && tar -xzf /src/wss.tar.gz -C /src --strip-components=1 \
    && cp /src/vdoninja_advanced.js /src/package.json /src/package-lock.json /src/LICENSE /app/
WORKDIR /app
# Lo que fija package-lock.json (con integridad), sin scripts de instalación. vdoninja_advanced.js solo carga `ws` (sin
# dependencias propias); express, cors y el resto del árbol, que usan los otros servidores del repo, no pasan a la imagen final.
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && mkdir /final /final/node_modules \
    && cp vdoninja_advanced.js package.json package-lock.json LICENSE /final/ \
    && cp -r node_modules/ws /final/node_modules/ws \
    && node -e "const d=require('/final/node_modules/ws/package.json').dependencies||{};if(Object.keys(d).length)process.exit(1)"

FROM docker.io/library/node:22.23.3-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
LABEL org.opencontainers.image.source="https://github.com/Cenit-Digital/ReunionesVdoNinja" \
      org.opencontainers.image.description="Señalización VDO.Ninja (vdoninja_advanced.js) para reuniones.cenitdigital.es" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
# limites.cjs (nuestro): maxPayload de 1 MiB y tope de conexiones, sin tocar vdoninja_advanced.js. Heap acotado por debajo del
# límite de memoria del pod (256Mi en KubernetesInfrastructure): ante un abuso, error de memoria y reinicio, no OOM del nodo.
ENV NODE_ENV=production \
    PORT=8080 \
    NODE_OPTIONS="--require=/app/limites.cjs --max-old-space-size=160"
# npm, npx y corepack no hacen falta para ejecutar el servidor: menos superficie y menos CVE que escanear.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
COPY --from=fuente --chown=root:root /final /app
COPY --chown=root:root limites.cjs /app/limites.cjs
USER 1000
EXPOSE 8080
CMD ["node", "vdoninja_advanced.js"]
