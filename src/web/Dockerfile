# Imagen web de reuniones.cenitdigital.es (KubernetesInfrastructure#64): los ficheros estáticos de VDO.Ninja v30.2 con el
# index.html configurado por parche-config.sh, servidos por nginx sin privilegios en :8080.
# Contrato con la infraestructura: UID 101, raíz de solo lectura (solo /tmp escribible), linux/amd64 y despliegue por digest.
# Fuente fijada por commit y checksum: steveseguin/vdo.ninja, tag v30.2 = d5a8b5669d1cb0ff75f984499f7025b745657808 (AGPL-3.0-only).
# La base va fijada por digest (Docker Hub), la misma que usa nails-demo.

# --- fuente: descarga verificada y parche (busybox de la base: sh, tar, gzip, awk, grep) ---
FROM docker.io/nginxinc/nginx-unprivileged:1.30.6-alpine-slim@sha256:5d8bb9437d74a600ec5dbf90c035451c724dc33eac8d3a71078f6f8612c345f6 AS fuente
USER root
WORKDIR /src
ADD --checksum=sha256:4f1efffe29e043393cddd6b26b03c5a5c641e5e5d24a2050c3b99ac0f37a34d2 \
    https://github.com/steveseguin/vdo.ninja/archive/d5a8b5669d1cb0ff75f984499f7025b745657808.tar.gz /src/vdo.tar.gz
COPY parche-config.sh /src/parche-config.sh
RUN mkdir /src/html \
    && tar -xzf /src/vdo.tar.gz -C /src/html --strip-components=1 \
    && rm -rf /src/html/.github \
    && sh /src/parche-config.sh /src/html/index.html

# --- runtime: nginx sin privilegios (UID 101, pid y *_temp_path en /tmp) ---
FROM docker.io/nginxinc/nginx-unprivileged:1.30.6-alpine-slim@sha256:5d8bb9437d74a600ec5dbf90c035451c724dc33eac8d3a71078f6f8612c345f6
LABEL org.opencontainers.image.source="https://github.com/Cenit-Digital/ReunionesVdoNinja" \
      org.opencontainers.image.description="VDO.Ninja v30.2 configurado para reuniones.cenitdigital.es" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
# El nodo tiene 8 CPU y `auto` lanzaría 8 workers para un sitio estático. /etc/nginx es del UID 101 en la base, así que el sed
# no necesita root; el grep hace fallar el build si la línea cambia en la base.
RUN sed -i 's/^worker_processes  auto;$/worker_processes  2;/' /etc/nginx/nginx.conf \
    && grep -q '^worker_processes  2;$' /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
# Los ficheros servidos son de root: nginx (101) solo los lee. Se quitan antes los de ejemplo de la base.
USER root
RUN rm -rf /usr/share/nginx/html/*
COPY --from=fuente --chown=root:root /src/html /usr/share/nginx/html
USER 101
EXPOSE 8080
