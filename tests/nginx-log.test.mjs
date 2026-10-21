// La configuración de nginx (src/web/nginx/default.conf) no deja la query en los logs (KubernetesInfrastructure#75).
// Los enlaces de VDO.Ninja llevan ?room=…&password=…: con el formato `main` de la base, la contraseña quedaba en claro en
// el log del pod, sobre todo por el Referer de cada recurso que pide la página. Este test es estático (no hay nginx en el
// entorno local); la prueba de comportamiento, con la imagen arrancada, está en la «Prueba de arranque» de imagen.yml.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
// Sin comentarios: solo cuentan las directivas.
const conf = readFileSync(join(raiz, "src/web/nginx/default.conf"), "utf8").replace(/#.*$/gm, "");

// Variables que contienen la query o pueden contenerla (el Referer es la URL entera de la página que pide el recurso).
const PROHIBIDAS = [/\$request\b/, /\$request_uri\b/, /\$args\b/, /\$query_string\b/, /\$arg_\w+/, /\$http_referer\b/];

function directivas(nombre) {
  return [...conf.matchAll(new RegExp(`(?:^|[;{}\\s])${nombre}\\s+([^;]*);`, "g"))].map((m) => m[1].trim());
}

test("el formato del access log no lleva la query ni el Referer", () => {
  const formatos = directivas("log_format");
  assert.equal(formatos.length, 1, "default.conf define un log_format propio");
  const [nombre, ...resto] = formatos[0].split(/\s+/);
  assert.notEqual(nombre, "main", "no reutiliza el nombre del formato de la base");
  const cuerpo = resto.join(" ");
  assert.match(cuerpo, /\$uri\b/, "registra la ruta con $uri");
  for (const v of PROHIBIDAS) assert.doesNotMatch(cuerpo, v, `el formato no usa ${v.source}`);
});

test("el access log del servidor usa ese formato", () => {
  const [nombre] = directivas("log_format")[0].split(/\s+/);
  const logs = directivas("access_log");
  assert.ok(logs.length > 0, "default.conf declara access_log (si no, hereda `main` de nginx.conf)");
  for (const l of logs) assert.equal(l.split(/\s+/)[1], nombre, `access_log ${l} usa el formato ${nombre}`);
});

test("el error log no baja de crit (las líneas de error llevan request y referrer)", () => {
  const errores = directivas("error_log");
  assert.ok(errores.length > 0, "default.conf declara error_log");
  for (const e of errores) assert.match(e, /\s(crit|alert|emerg)$/, `error_log ${e} en crit o superior`);
});

