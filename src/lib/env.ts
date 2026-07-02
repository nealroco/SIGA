import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria (cadena de conexión MySQL)."),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET es obligatoria — genera una con: npx auth secret"),
  AUTH_TRUST_HOST: z.string().optional(),
  GOOGLE_DRIVE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_DRIVE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const detalle = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(
    `Faltan o son inválidas las siguientes variables de entorno:\n${detalle}\n\nRevisa .env.example y copia los valores necesarios a .env.`
  );
}

export const env = parsed.data;
