"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-012";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  codigo: z.string().trim().min(3, "Código requerido (mín. 3 caracteres)").max(40),
  municipio: z.string().trim().min(3, "Municipio requerido (mín. 3 caracteres)").max(120),
  zona: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(120).optional()),
  poblacion: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int("La población debe ser un número entero").min(0, "La población no puede ser negativa").optional()
  ),
  lat: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().optional()
  ),
  lng: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().optional()
  ),
});

function readForm(fd: FormData) {
  return {
    codigo: String(fd.get("codigo") ?? ""),
    municipio: String(fd.get("municipio") ?? ""),
    zona: fd.get("zona"),
    poblacion: fd.get("poblacion"),
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

export async function crearTerritorio(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar territorios requiere escritura (E) en MOD-012. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.territorio.findUnique({ where: { codigo: d.codigo } });
  if (dup) return { fieldErrors: { codigo: "Ya existe un territorio con ese código." } };

  const creado = await prisma.territorio.create({
    data: {
      codigo: d.codigo,
      municipio: d.municipio,
      zona: d.zona ?? null,
      poblacion: d.poblacion ?? null,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      estado: "Activo",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { codigo: d.codigo, municipio: d.municipio, estado: "Activo" } });
  revalidatePath("/territorios");
  redirect("/territorios");
}

export async function editarTerritorio(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar territorios requiere escritura (E) en MOD-012. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Territorio no válido." };
  const actual = await prisma.territorio.findUnique({ where: { id } });
  if (!actual) return { error: "El territorio no existe." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.territorio.findUnique({ where: { codigo: d.codigo } });
  if (dup && dup.id !== id) return { fieldErrors: { codigo: "Otro territorio ya usa ese código." } };

  await prisma.territorio.update({
    where: { id },
    data: {
      codigo: d.codigo,
      municipio: d.municipio,
      zona: d.zona ?? null,
      poblacion: d.poblacion ?? null,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorAnterior: { codigo: actual.codigo, municipio: actual.municipio }, valorNuevo: { codigo: d.codigo, municipio: d.municipio } });
  revalidatePath("/territorios");
  redirect("/territorios");
}

// Baja lógica (sin SoD): estado pasa a Inactivo, nunca se elimina el histórico.
export async function darDeBajaTerritorio(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!(await can(session.user.rol, MOD, "eliminar"))) {
    throw new Error("No autorizado para dar de baja territorios.");
  }
  const id = Number(fd.get("id"));
  if (!id) return;

  const anterior = await prisma.territorio.findUnique({ where: { id } });
  if (!anterior || anterior.estado === "Inactivo") {
    revalidatePath("/territorios");
    redirect("/territorios");
  }

  await prisma.territorio.update({ where: { id }, data: { estado: "Inactivo" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "baja",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Activo" },
    valorNuevo: { estado: "Inactivo" },
  });

  revalidatePath("/territorios");
  redirect("/territorios");
}
