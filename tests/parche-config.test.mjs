// Tests del parche de configuración de VDO.Ninja (src/web/parche-config.sh), KubernetesInfrastructure#64.
// El fixture es un extracto literal del index.html del tag v30.2 (commit d5a8b56) con las dos anclas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(raiz, "src/web/parche-config.sh");
const fixture = join(raiz, "tests/fixtures/index-v30.2-extracto.html");

function copia(contenido) {
  const dir = mkdtempSync(join(tmpdir(), "parche-"));
  const ruta = join(dir, "index.html");
  if (contenido === undefined) copyFileSync(fixture, ruta);
  else writeFileSync(ruta, contenido);
  return ruta;
}

function parchear(ruta) {
  return spawnSync("sh", [script, ruta], { encoding: "utf8", env: { PATH: process.env.PATH } });
}

test("configura la señalización propia con el servidor avanzado", () => {
  const ruta = copia();
  execFileSync("sh", [script, ruta], { env: { PATH: process.env.PATH } });
  const html = readFileSync(ruta, "utf8");
  assert.match(html, /^\t+session\.wss = "wss:\/\/reuniones\.cenitdigital\.es\/wss";/m);
  assert.match(html, /^\t+session\.customWSS = false;/m);
});

test("sustituye la contraseña por defecto de ejemplo y fija la sal propia", () => {
  const ruta = copia();
  execFileSync("sh", [script, ruta], { env: { PATH: process.env.PATH } });
  const html = readFileSync(ruta, "utf8");
  assert.doesNotMatch(html, /someEncryptionKey123/);
  assert.match(html, /^\t+session\.defaultPassword = "[0-9a-f]{32}";/m);
  assert.match(html, /^\t+session\.salt = "reuniones\.cenitdigital\.es";/m);
});

test("no toca STUN ni TURN y el resto del fichero queda igual", () => {
  const ruta = copia();
  const antes = readFileSync(ruta, "utf8").split("\n");
  execFileSync("sh", [script, ruta], { env: { PATH: process.env.PATH } });
  const despues = readFileSync(ruta, "utf8").split("\n");
  assert.equal(despues.length, antes.length + 3); // sal + wss + customWSS
  const anadidas = despues.filter((l) => !antes.includes(l));
  assert.equal(anadidas.length, 4); // las 3 nuevas + la de la contraseña sustituida
  assert.ok(despues.some((l) => l.includes('session.stunServers = [{ urls: ["stun:stun.l.google.com:19302"')));
  assert.ok(!despues.some((l) => /^\s*session\.configuration\s*=/.test(l)));
});

test("falla si falta un ancla (versión nueva de VDO.Ninja)", () => {
  const original = readFileSync(fixture, "utf8");
  const ruta = copia(original.replace("// session.customWSS = true;", "// otra cosa"));
  const r = parchear(ruta);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /aparece 0 veces/);
  assert.equal(readFileSync(ruta, "utf8"), original.replace("// session.customWSS = true;", "// otra cosa"));
});

test("falla si un ancla aparece dos veces", () => {
  const original = readFileSync(fixture, "utf8");
  const ruta = copia(original + original);
  const r = parchear(ruta);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /aparece 2 veces/);
});

test("falla si el fichero no existe", () => {
  const r = parchear("/no/existe/index.html");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no existe/);
});
