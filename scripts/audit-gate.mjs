// Puerta de audit con excepciones acotadas en el tiempo (ver ADR-001 y ADR-012, ya retiradas).
// Cross-platform: sin shell. Filtra el JSON de `pnpm audit` en lugar de
// depender de flags que varían entre versiones de pnpm.
import { spawnSync } from 'node:child_process';

// Sin excepciones activas: la de `braces` (ADR-001) se retiró el 2026-10-24 (T-096) y la de `zod` (ADR-012) el mismo día (T-095).
// Para aceptar un hallazgo con ADR y caducidad, añade { id: 'GHSA-…', package: '…', adr: 'ADR-…', expires: 'AAAA-MM-DD' }.
const EXCEPTIONS = [];

const BLOCKING = new Set(['high', 'critical']);

const today = new Date().toISOString().slice(0, 10);
const active = EXCEPTIONS.filter((e) => today <= e.expires);
const expired = EXCEPTIONS.filter((e) => today > e.expires);

for (const e of expired) {
  console.error(
    `[audit-gate] Excepción caducada: ${e.id} (${e.package}, ${e.adr}, venció ${e.expires}).`,
  );
}
for (const e of active) {
  console.warn(
    `[audit-gate] Excepción activa: ${e.id} (${e.package}, ${e.adr}, caduca ${e.expires}).`,
  );
}

const pnpmPath = process.env.npm_execpath;
if (!pnpmPath) {
  console.error('[audit-gate] Ejecútalo con "pnpm run audit:gate" (falta npm_execpath).');
  process.exit(2);
}

// npm_execpath puede ser un script JS (se lanza con Node) o un binario (pnpm.exe).
const isScript = /\.(c|m)?js$/i.test(pnpmPath);
const auditArgs = ['audit', '--json'];
const result = isScript
  ? spawnSync(process.execPath, [pnpmPath, ...auditArgs], { encoding: 'utf8' })
  : spawnSync(pnpmPath, auditArgs, { encoding: 'utf8' });

if (result.error) {
  console.error(`[audit-gate] No se pudo ejecutar pnpm audit: ${result.error.message}`);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error('[audit-gate] Salida de pnpm audit no es JSON válido (¿error de red?).');
  console.error(result.stdout.slice(0, 500));
  console.error(result.stderr.slice(0, 500));
  process.exit(2);
}

const advisories = Object.values(report.advisories ?? {});
const allowed = new Set(active.map((e) => e.id));

const blocking = advisories.filter(
  (a) => BLOCKING.has(a.severity) && !allowed.has(a.github_advisory_id),
);
const tolerated = advisories.filter(
  (a) => BLOCKING.has(a.severity) && allowed.has(a.github_advisory_id),
);

for (const a of tolerated) {
  console.warn(`[audit-gate] Tolerado: ${a.severity} ${a.github_advisory_id} ${a.module_name}`);
}
for (const a of blocking) {
  console.error(`[audit-gate] BLOQUEA: ${a.severity} ${a.github_advisory_id} ${a.module_name}`);
}

if (blocking.length > 0) {
  console.error(`[audit-gate] FALLA: ${blocking.length} hallazgo(s) alto/crítico sin excepción.`);
  process.exit(1);
}
console.warn('[audit-gate] OK: sin hallazgos altos o críticos fuera de excepción.');
