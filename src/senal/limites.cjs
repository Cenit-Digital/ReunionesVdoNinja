// Límites para vdoninja_advanced.js sin modificar el código de terceros (KubernetesInfrastructure#64, revisión de seguridad A1).
// Se carga antes que el servidor con NODE_OPTIONS=--require=/app/limites.cjs y sustituye ws.WebSocketServer por una subclase:
//   - maxPayload: 1 MiB (ws trae 100 MiB por defecto; unos pocos mensajes así agotarían la memoria del pod). Una oferta SDP con
//     sus candidatos ICE ocupa del orden de kilobytes, así que 1 MiB deja mucho margen;
//   - límite de conexiones simultáneas (MAX_CONEXIONES, 200 por defecto): por encima, el handshake se rechaza con 503.
// vdoninja_advanced.js hace `const { WebSocketServer } = require('ws')` DESPUÉS de este preload, así que recibe la subclase.
"use strict";
const path = require("path");
const ws = require(path.join(__dirname, "node_modules", "ws"));

const MAX_PAYLOAD = Number(process.env.MAX_PAYLOAD_BYTES) || 1024 * 1024;
const MAX_CONEXIONES = Number(process.env.MAX_CONEXIONES) || 200;
const Base = ws.WebSocketServer;

class WebSocketServerLimitado extends Base {
  constructor(opciones, callback) {
    super({
      ...opciones,
      maxPayload: MAX_PAYLOAD,
      verifyClient: (info, hecho) => {
        if (this.clients.size >= MAX_CONEXIONES) return hecho(false, 503, "Demasiadas conexiones");
        const propio = opciones && opciones.verifyClient;
        if (!propio) return hecho(true);
        // Si una versión nueva del servidor trae su propio verifyClient, se respeta después del tope (síncrono o asíncrono).
        if (propio.length >= 2) return propio(info, hecho);
        return hecho(Boolean(propio(info)));
      },
    }, callback);
  }
}

ws.WebSocketServer = WebSocketServerLimitado;
ws.Server = WebSocketServerLimitado;
console.log(`limites: maxPayload=${MAX_PAYLOAD} bytes, máximo ${MAX_CONEXIONES} conexiones`);
