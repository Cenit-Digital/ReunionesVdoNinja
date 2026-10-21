# ReunionesVdoNinja

Imágenes de contenedor de **VDO.Ninja** para la sala de reuniones de Cénit Digital, `https://reuniones.cenitdigital.es`.
El despliegue (Kubernetes, Traefik, certificados, NetworkPolicies) vive en
[`Cenit-Digital/KubernetesInfrastructure`](https://github.com/Cenit-Digital/KubernetesInfrastructure), issue #64.

## Código fuente y licencia (AGPL-3.0)

Este repositorio es la **oferta de código fuente** (AGPL-3.0, sección 13) de lo que se sirve en `reuniones.cenitdigital.es`.
No modifica la lógica de VDO.Ninja: descarga el código original en un commit fijo, verifica su checksum y cambia solo unas
líneas de configuración del `index.html`.

| Componente | Origen (commit fijado) | Licencia | Cambios |
| --- | --- | --- | --- |
| Web (`src/web`) | [steveseguin/vdo.ninja](https://github.com/steveseguin/vdo.ninja), tag `v30.2` = `d5a8b5669d1cb0ff75f984499f7025b745657808` | AGPL-3.0-only | `src/web/parche-config.sh`: señalización propia, contraseña por defecto y sal propias |
| Señalización (`src/senal`) | [steveseguin/websocket_server](https://github.com/steveseguin/websocket_server) `5b65d419d17db58142591ff6881f9ae4e9d8ba7c` | AGPL-3.0 | Ninguno en su código: `vdoninja_advanced.js` se ejecuta tal cual, en HTTP plano por el puerto 8080, con un preload propio (`src/senal/limites.cjs`) que fija `maxPayload` a 1 MiB y un tope de conexiones |

Lo propio de este repo (Dockerfiles, parche, configuración de nginx, workflow y tests) se publica también bajo
**AGPL-3.0** (`LICENSE`).

## Qué cambia el parche

`src/web/parche-config.sh` actúa sobre el bloque de configuración del final de `index.html`, que el propio proyecto documenta para quien lo
aloja por su cuenta:

- `session.wss = "wss://reuniones.cenitdigital.es/wss"` y `session.customWSS = false`. La señalización va a nuestro
  `vdoninja_advanced.js`, no a `wss.vdo.ninja`.
- `session.defaultPassword` y `session.salt` propios. El `index.html` original pide cambiar la contraseña al autoalojar; los dos
  valores van en el JavaScript que descarga el navegador, así que no son secretos.
- STUN y TURN **no se tocan**: siguen los de VDO.Ninja. Un TURN propio (coturn) es una fase posterior.

Si una versión nueva de VDO.Ninja mueve esas líneas, el parche **falla** y el build se para. Nunca configura a medias.

## Imágenes

| Imagen | Base (fijada por digest) | Usuario | Puerto |
| --- | --- | --- | --- |
| `ghcr.io/cenit-digital/reuniones-web` | `nginxinc/nginx-unprivileged:1.30.6-alpine-slim` | 101 | 8080 |
| `ghcr.io/cenit-digital/reuniones-senal` | `node:22.23.3-alpine` | 1000 | 8080 |

El workflow `.github/workflows/imagen.yml` funciona así:

- **En un PR:** construye, prueba el arranque (raíz de solo lectura, sin capacidades), comprueba el parche en lo que se sirve, lanza una
  prueba de humo de la señalización (`tests/humo-senal.mjs`) y escanea con Trivy.
- **En `main`:** además publica `:sha-<commit>` y deja la referencia con digest en el resumen. Nunca publica `latest`.

## Desarrollo

```sh
bin/harness init   # entorno y arnés
bin/harness test   # tests del parche (node --test)
```

Para actualizar VDO.Ninja:

1. Cambia el commit y el `--checksum` del `ADD` en `src/web/Dockerfile`.
2. Comprueba las anclas con `sh src/web/parche-config.sh <index.html de la versión nueva>`.
3. Actualiza el fixture de `tests/fixtures/`.
4. Abre un PR.
