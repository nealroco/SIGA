"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-024";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const TIPOS = ["Territorio", "Escenario"] as const;

const schema = z.object({
  tipo: z.enum(TIPOS, { message: "Tipo no válido" }),
  id: z.preprocess((v) => Number(v), z.number().int().positive("Registro no válido")),
  lat: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ message: "Latitud no válida" }).min(-90, "Latitud fuera de rango").max(90, "Latitud fuera de rango")
  ),
  lng: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ message: "Longitud no válida" }).min(-180, "Longitud fuera de rango").max(180, "Longitud fuera de rango")
  ),
});

function readForm(fd: FormData) {
  return {
    tipo: String(fd.get("tipo") ?? ""),
    id: fd.get("id"),
    lat: fd.get("lat"),
    lng: fd.get("lng"),
  };
}

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export async function actualizarCoordenadas(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: georeferenciar requiere escritura (E) en MOD-024. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  if (d.tipo === "Territorio") {
    const actual = await prisma.territorio.findUnique({ where: { id: d.id } });
    if (!actual) return { error: "El territorio no existe." };
    await prisma.territorio.update({ where: { id: d.id }, data: { lat: d.lat, lng: d.lng } });
  } else {
    const actual = await prisma.escenario.findUnique({ where: { id: d.id } });
    if (!actual) return { error: "El escenario no existe." };
    await prisma.escenario.update({ where: { id: d.id }, data: { lat: d.lat, lng: d.lng } });
  }

  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "georeferenciar",
    modulo: MOD,
    registroId: d.id,
    valorNuevo: { tipo: d.tipo, lat: d.lat, lng: d.lng },
  });
  revalidatePath("/georeferenciacion");
  redirect("/georeferenciacion");
}
