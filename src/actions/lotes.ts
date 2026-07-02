"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-017";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  codigo: z.string().trim().min(2, "Código requerido (mín. 2 caracteres)").max(40),
  direccion: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(200).optional()),
  // Las áreas no pueden ser negativas.
  area: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().min(0, "El área no puede ser negativa").optional()
  ),
  territorioId: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
});

function readForm(fd: FormData) {
  return {
    codigo: String(fd.get("codigo") ?? ""),
    direccion: String(fd.get("direccion") ?? ""),
    area: fd.get("area"),
    territorioId: fd.get("territorioId"),
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

export async function crearLote(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar lotes requiere escritura (E) en MOD-017. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.lote.findUnique({ where: { codigo: d.codigo } });
  if (dup) return { fieldErrors: { codigo: "Ya existe un lote con ese código." } };

  const creado = await prisma.lote.create({
    data: {
      codigo: d.codigo,
      direccion: d.direccion ?? null,
      area: d.area ?? null,
      territorioId: d.territorioId ?? null,
      estado: "Activo",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { codigo: d.codigo, direccion: d.direccion, area: d.area, territorioId: d.territorioId, estado: "Activo" } });
  revalidatePath("/lotes");
  redirect("/lotes");
}

export async function editarLote(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar lotes requiere escritura (E) en MOD-017. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Lote no válido." };
  const actual = await prisma.lote.findUnique({ where: { id } });
  if (!actual) return { error: "El lote no existe." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.lote.findUnique({ where: { codigo: d.codigo } });
  if (dup && dup.id !== id) return { fieldErrors: { codigo: "Otro lote ya usa ese código." } };

  await prisma.lote.update({
    where: { id },
    data: {
      codigo: d.codigo,
      direccion: d.direccion ?? null,
      area: d.area ?? null,
      territorioId: d.territorioId ?? null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorAnterior: { codigo: actual.codigo, direccion: actual.direccion, area: actual.area, territorioId: actual.territorioId }, valorNuevo: { codigo: d.codigo, direccion: d.direccion, area: d.area, territorioId: d.territorioId } });
  revalidatePath("/lotes");
  redirect("/lotes");
}

// Baja lógica: pasa a estado Inactivo, nunca se elimina el registro físicamente.
export async function darDeBajaLote(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "eliminar"))) {
    throw new Error(`No autorizado: dar de baja lotes requiere escritura (E) en MOD-017. Tu rol es ${session.user.rol}.`);
  }

  const id = Number(fd.get("id"));
  if (!id) return;

  const actual = await prisma.lote.findUnique({ where: { id } });
  if (!actual || actual.estado === "Inactivo") {
    revalidatePath("/lotes");
    redirect("/lotes");
  }

  await prisma.lote.update({ where: { id }, data: { estado: "Inactivo" } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "baja", modulo: MOD, registroId: id, valorAnterior: { estado: "Activo" }, valorNuevo: { estado: "Inactivo" } });
  revalidatePath("/lotes");
  redirect("/lotes");
}
