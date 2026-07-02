// setupFile de Vitest: corre dentro de cada worker, antes de los archivos de test de ese
// worker. Carga .env.test para que process.env.DATABASE_URL / AUTH_SECRET estén disponibles
// sin importar si el worker es un thread o un proceso hijo nuevo.
import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.resolve(__dirname, ".env.test") });
