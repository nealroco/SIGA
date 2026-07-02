import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// Carga .env.test en ESTE proceso (el que evalúa playwright.config.ts) ANTES de construir
// la config, para que `process.env` ya tenga DATABASE_URL/AUTH_SECRET de test cuando
// webServer.env haga `...process.env` más abajo.
loadEnv({ path: path.resolve(__dirname, ".env.test") });

// Puerto dedicado a e2e (distinto del 3000 de "npm run dev") para poder correr Playwright
// sin chocar con un servidor de desarrollo que ya esté arriba en la máquina del dev.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  // Un único proyecto (chromium) por ahora — mantiene la suite simple y rápida. Agregar
  // firefox/webkit más adelante es solo sumar entradas a este array.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Levanta la app en modo producción (build + start) contra la base de datos de TEST,
  // no contra dev: NODE_ENV/DATABASE_URL salen de .env.test, igual que en Vitest, para que
  // los e2e no dependan de datos manuales que alguien haya dejado en la BD de dev y para
  // no arriesgar la BD de dev con lo que un flujo de e2e escriba.
  //
  // NOTA IMPORTANTE (paso manual pendiente): esta config asume que los browsers de
  // Playwright ya están instalados localmente. Si "npm run test:e2e" falla con un error
  // tipo "Executable doesn't exist", corre una vez (requiere acceso de red para descargar
  // el binario del browser, que este entorno puede no tener):
  //   npx playwright install chromium
  webServer: {
    command: "npm run build && npm run start -- -p " + PORT,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(PORT),
      // Fuerza a que el build/start de e2e lea .env.test y no .env: Next.js solo carga
      // .env.<NODE_ENV> automáticamente para NODE_ENV=test cuando se invoca vía next-router
      // interno, así que aquí se resuelve explícito con dotenv al lanzar el proceso hijo.
      NODE_ENV: "test",
    },
  },
});
