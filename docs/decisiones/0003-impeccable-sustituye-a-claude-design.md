# ADR 0003 — Impeccable sustituye a Claude Design y a `frontend-design`

- **Estado:** Aceptado al fusionarse este PR (la fecha es la de la fusión en el historial de git).
- **Alcance:** diseño de toda interfaz del proyecto. Este repo no tiene web propia: `ui.paths` y `ui.routes` van vacíos en `harness.config.json`.

## Decisión

Por decisión de Pablo (CTO, 2026-11-19), la skill Impeccable (`.claude/skills/impeccable/`, `.agents/skills/impeccable/`, versión fijada 4.10.0) sustituye a Claude Design y a la skill `frontend-design` en todos los repos de Cenit-Digital. Llega con la plantilla v0.5.0; la puerta `.harness/impeccable-gate.mjs` y el workflow «Diseño (Impeccable)» la hacen cumplir. Detalle de uso en `docs/impeccable.md`.

## Consecuencias

- Los ADR anteriores y cualquier prototipo `.dc.html` que citen Claude Design se quedan como histórico: no se reescriben.
- Si el repo gana una web, se rellena `ui` y se cablea la puerta `--rendered` en su CI, como describe `docs/impeccable.md`.
- Las excepciones solo valen para la marca de un cliente y llevan su motivo escrito.
