"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-011";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  // beneficiario requerido (RN-004: el seguimiento debe asociarse a un beneficiario)
  beneficiarioId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un beneficiario")),
  actividad: z.string().trim().min(3, "Actividad: mínimo 3 caracteres").max(400),
  programa: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(120).optional()),
  fecha: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  observacion: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(600).optional()),
});

function readForm(fd: FormData) {
  return {
    beneficiarioId: fd.get("beneficiarioId"),
    actividad: String(fd.get("actividad") ?? ""),
    programa: String(fd.get("programa") ?? ""),
    fecha: fd.get("fecha"),
    observacion: String(fd.get("observacion") ?? ""),
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

function toDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function crearSeguimiento(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar seguimientos requiere escritura (E) en MOD-011. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const beneficiario = await prisma.beneficiario.findUnique({ where: { id: d.beneficiarioId } });
  if (!beneficiario) return { fieldErrors: { beneficiarioId: "El beneficiario no existe." } };

  const creado = await prisma.seguimiento.create({
    data: {
      beneficiarioId: d.beneficiarioId,
      programa: d.programa,
      fecha: toDate(d.fecha),
      actividad: d.actividad,
      observacion: d.observacion,
      estado: "Registrado",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: { beneficiarioId: d.beneficiarioId, actividad: d.actividad, estado: "Registrado" },
  });
  revalidatePath("/seguimiento");
  redirect("/seguimiento");
}

export async function editarSeguimiento(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar seguimientos requiere escritura (E) en MOD-011. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Seguimiento no válido." };
  const actual = await prisma.seguimiento.findUnique({ where: { id } });
  if (!actual) return { error: "El seguimiento no existe." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const beneficiario = await prisma.beneficiario.findUnique({ where: { id: d.beneficiarioId } });
  if (!beneficiario) return { fieldErrors: { beneficiarioId: "El beneficiario no existe." } };

  await prisma.seguimiento.update({
    where: { id },
    data: {
      beneficiarioId: d.beneficiarioId,
      programa: d.programa,
      fecha: toDate(d.fecha),
      actividad: d.actividad,
      observacion: d.observacion,
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { beneficiarioId: actual.beneficiarioId, actividad: actual.actividad },
    valorNuevo: { beneficiarioId: d.beneficiarioId, actividad: d.actividad },
  });
  revalidatePath("/seguimiento");
  redirect("/seguimiento");
}
