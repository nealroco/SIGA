// Global setup de Vitest (ver "globalSetup" en vitest.config.ts).
//
// Se ejecuta UNA sola vez antes de toda la suite (no por archivo de test) y dentro de
// un proceso Node aparte del que corre los tests. Su único trabajo es dejar el schema
// de MySQL de test limpio y con la estructura al día antes de que arranque cualquier test.
//
// SALVAGUARDA CRÍTICA: este script corre "prisma db push --force-reset", que BORRA
// todas las tablas del schema al que apunte DATABASE_URL. Por eso, antes de tocar nada,
// verificamos explícitamente que la URL termina en "_test". Si alguien corre "npm run test"
// sin .env.test cargado (o con un .env.test mal configurado apuntando a la BD real),
// este guard debe abortar con un error claro en vez de arrasar datos reales.
import { execFileSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

function assertTestDatabase(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error(
      "[vitest.global-setup] DATABASE_URL no está definida. ¿Falta .env.test? Revisa que dotenv lo haya cargado."
    );
  }

  let schema: string;
  try {
    // No usamos WHATWG URL con protocolo "mysql:" en todas las versiones de Node de forma
    // confiable para el pathname, así que parseamos a mano el segmento final de la ruta.
    const sinQuery = url.split("?")[0];
    schema = sinQuery.substring(sinQuery.lastIndexOf("/") + 1);
  } catch {
    throw new Error(`[vitest.global-setup] No se pudo interpretar DATABASE_URL: ${url}`);
  }

  if (!schema.endsWith("_test")) {
    throw new Error(
      `[vitest.global-setup] ABORTADO POR SEGURIDAD: el schema de DATABASE_URL ("${schema}") no termina ` +
        `en "_test". Este comando ejecuta "prisma db push --force-reset", que BORRA todo el schema. ` +
        `Nunca debe apuntar a la base de datos de dev/producción. Revisa .env.test.`
    );
  }
}

export default async function globalSetup() {
  // .env.test es la única fuente de verdad para la BD de test. Se carga aquí (y no basta
  // con NODE_ENV) porque vitest.config.ts también necesita la variable ya resuelta antes
  // de esto para test.env, así que la cargamos explícitamente en ambos lugares.
  const { parsed } = loadEnv({ path: ".env.test" });
  const databaseUrl = parsed?.DATABASE_URL ?? process.env.DATABASE_URL;

  assertTestDatabase(databaseUrl);

  console.log(`[vitest.global-setup] Reseteando schema de test: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`);

  execFileSync("npx", ["prisma", "db", "push", "--force-reset", "--skip-generate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  console.log("[vitest.global-setup] Schema de test listo.");
}
