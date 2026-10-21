#!/bin/sh
# Configura el index.html de VDO.Ninja v30.2 para reuniones.cenitdigital.es (KubernetesInfrastructure#64):
#   - señalización propia por el mismo 443 (wss://reuniones.cenitdigital.es/wss, servidor vdoninja_advanced.js, customWSS=false);
#   - contraseña por defecto y sal propias (el propio index.html pide cambiar la contraseña al autoalojar).
# STUN y TURN no se tocan: siguen los de VDO.Ninja (decisión de la fase 1).
# Falla si alguna ancla no aparece exactamente una vez: una versión nueva de VDO.Ninja que mueva el bloque rompe el build,
# no la configuración en silencio.
# Uso: parche-config.sh <ruta/index.html>
set -eu

INDEX="${1:?uso: parche-config.sh <ruta/index.html>}"
WSS_URL="${WSS_URL:-wss://reuniones.cenitdigital.es/wss}"
SALT="${SALT:-reuniones.cenitdigital.es}"
# Valor público por naturaleza (va en el JS que descarga cualquier navegador); solo distingue este despliegue del de vdo.ninja.
DEFAULT_PASSWORD="${DEFAULT_PASSWORD:-e78db5986d681bf1236b047eed25193e}"

ANCLA_PASSWORD='session.defaultPassword = "someEncryptionKey123";'
ANCLA_WSS='// session.customWSS = true;'

[ -f "$INDEX" ] || { echo "ERROR: no existe $INDEX" >&2; exit 1; }

contar() { grep -cF -- "$1" "$INDEX" || true; }
for ancla in "$ANCLA_PASSWORD" "$ANCLA_WSS"; do
  n="$(contar "$ancla")"
  if [ "$n" != "1" ]; then
    echo "ERROR: el ancla «$ancla» aparece $n veces en $INDEX (se esperaba 1)" >&2
    exit 1
  fi
done

tmp="$INDEX.parche.$$"
awk -v a1="$ANCLA_PASSWORD" -v a2="$ANCLA_WSS" -v pw="$DEFAULT_PASSWORD" -v salt="$SALT" -v wss="$WSS_URL" '
  index($0, a1) {
    sub(/session\.defaultPassword = "someEncryptionKey123";/, "session.defaultPassword = \"" pw "\";")
    print
    print "\t\t\tsession.salt = \"" salt "\"; // Cenit Digital: sal propia (KubernetesInfrastructure#64)"
    next
  }
  index($0, a2) {
    print
    print "\t\t\tsession.wss = \"" wss "\"; // Cenit Digital: señalización propia (vdoninja_advanced.js)"
    print "\t\t\tsession.customWSS = false; // false = servidor avanzado (README de steveseguin/websocket_server)"
    next
  }
  { print }
' "$INDEX" >"$tmp"
mv "$tmp" "$INDEX"

# Comprobación del resultado: cada línea nueva, exactamente una vez.
for esperado in \
  "session.defaultPassword = \"$DEFAULT_PASSWORD\";" \
  "session.salt = \"$SALT\";" \
  "session.wss = \"$WSS_URL\";" \
  "session.customWSS = false;"; do
  n="$(contar "$esperado")"
  if [ "$n" != "1" ]; then
    echo "ERROR: tras el parche «$esperado» aparece $n veces" >&2
    exit 1
  fi
done
echo "parche-config: $INDEX configurado (wss=$WSS_URL, salt=$SALT)"
