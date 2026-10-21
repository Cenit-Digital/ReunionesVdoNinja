// Prueba de humo del servidor de señalización (vdoninja_advanced.js) por WebSocket plano, como lo ve detrás de Traefik.
// Sin dependencias: usa el WebSocket global de Node >= 22. Uso: node tests/humo-senal.mjs [ws://127.0.0.1:8080/wss]
// Comprueba: GET / responde 200; un emisor publica (seed), un espectador pide (play) y el emisor recibe offerSDP.
// Con `tope` como segundo argumento comprueba solo el tope de conexiones: el servidor debe arrancar con MAX_CONEXIONES=1.
const url = process.argv[2] ?? "ws://127.0.0.1:8080/wss";
const modo = process.argv[3] ?? "completo";
const http = url.replace(/^ws/, "http").replace(/\/wss$/, "/");

function falla(msg) {
  console.error(`humo-senal: ${msg}`);
  process.exit(1);
}

setTimeout(() => falla("tiempo agotado (10 s)"), 10_000).unref();

const r = await fetch(http).catch((e) => falla(`GET ${http}: ${e.message}`));
if (r.status !== 200) falla(`GET ${http} devolvió ${r.status}`);

function par() {
  return new Promise((ok, ko) => {
    const ws = new WebSocket(url);
    const mensajes = [];
    let espera = null;
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (espera) { const e = espera; espera = null; e(m); } else mensajes.push(m);
    };
    ws.onerror = () => ko(new Error(`no conecta a ${url}`));
    ws.onopen = () => ok({
      ws,
      enviar: (o) => ws.send(JSON.stringify(o)),
      siguiente: () => mensajes.length ? Promise.resolve(mensajes.shift()) : new Promise((res) => { espera = res; }),
    });
  });
}

if (modo === "tope") {
  const primera = await par().catch((e) => falla(e.message));
  const segunda = await par().then(() => "abierta", () => "rechazada");
  if (segunda !== "rechazada") falla("con MAX_CONEXIONES=1 la segunda conexión debía rechazarse");
  primera.ws.close();
  console.log(`humo-senal: tope de conexiones OK (${url})`);
  process.exit(0);
}

const emisor = await par().catch((e) => falla(e.message));
const espectador = await par().catch((e) => falla(e.message));
emisor.enviar({ request: "seed", streamID: "humo" });
espectador.enviar({ request: "play", streamID: "humo" });
const pedido = await emisor.siguiente();
if (pedido.request !== "offerSDP") falla(`se esperaba offerSDP y llegó ${JSON.stringify(pedido)}`);
emisor.ws.close();
espectador.ws.close();

// Límite de tamaño (src/senal/limites.cjs): un mensaje de 2 MiB cierra la conexión con 1009 (Message Too Big).
const grande = await par().catch((e) => falla(e.message));
const cierre = new Promise((res) => { grande.ws.onclose = (ev) => res(ev.code); });
grande.ws.send("x".repeat(2 * 1024 * 1024));
const codigo = await cierre;
if (codigo !== 1009) falla(`un mensaje de 2 MiB debía cerrar con 1009 y cerró con ${codigo}`);
console.log(`humo-senal: OK (${url})`);
