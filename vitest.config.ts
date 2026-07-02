import { defineConfig } from "vitest/config";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// Carga .env.test en el proceso principal de Vitest (el que evalúa este archivo de config)
// ANTES de construir la config. Vitest además propaga process.env a los workers, y
// "./vitest.setup.ts" (más abajo) vuelve a cargarlo dentro de cada worker por si acaso,
// ya que unos van en threads y otros en procesos aparte según el pool.
loadEnv({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  test: {
    // Los Server Actions (src/actions/*.ts) son código de servidor puro (Prisma + Zod):
    // no tocan el DOM, así que "node" alcanza y corre más rápido que "jsdom".
    environment: "node",
    // Se ejecuta dentro de cada worker antes de los archivos de test: garantiza que
    // "@/lib/db" (PrismaClient) y "@/lib/env" (exige AUTH_SECRET) vean .env.test aunque
    // el worker sea un proceso/thread nuevo que no heredó el loadEnv() de arriba.
    setupFiles: ["./vitest.setup.ts"],
    // globalSetup corre UNA vez por proceso de test (no por archivo), en un contexto
    // aparte, antes de que arranque cualquier test. Aquí es donde se resetea el schema.
    globalSetup: ["./vitest.global-setup.ts"],
    include: ["src/**/*.test.ts", "prisma/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      // Debe reflejar el path alias "@/*" -> "./src/*" de tsconfig.json.
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
