"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-018";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  // RN-004 (análoga): la evaluación debe asociarse a un beneficiario
  beneficiarioId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un beneficiario")),
  fecha: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  instrumento: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(160).optional()),
  resultado: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(600).optional()),
});

function readForm(fd: FormData) {
  return {
    beneficiarioId: fd.get("beneficiarioId"),
    fecha: fd.get("fecha"),
    instrumento: fd.get("instrumento"),
    resultado: fd.get("resultado"),
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

export async function crearEvaluacionPsico(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar evaluaciones psicosociales requiere escritura (E) en MOD-018. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const beneficiario = await prisma.beneficiario.findUnique({ where: { id: d.beneficiarioId } });
  if (!beneficiario) return { fieldErrors: { beneficiarioId: "El beneficiario no existe." } };

  const creada = await prisma.evaluacionPsicosocial.create({
    data: {
      beneficiarioId: d.beneficiarioId,
      fecha: toDate(d.fecha),
      instrumento: d.instrumento ?? null,
      resultado: d.resultado ?? null,
      estado: "Registrada",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creada.id,
    valorNuevo: { beneficiarioId: d.beneficiarioId, instrumento: d.instrumento, estado: "Registrada" },
  });
  revalidatePath("/psicosocial");
  redirect("/psicosocial");
}

export async function marcarRevisada(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: marcar como revisada requiere escritura (E) en MOD-018. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const evaluacion = await prisma.evaluacionPsicosocial.findUnique({ where: { id } });
  if (!evaluacion) throw new Error("La evaluación no existe.");
  if (evaluacion.estado === "Revisada") {
    redirect(`/psicosocial/${id}`);
  }

  const observacion = String(fd.get("observacion") ?? "").trim() || evaluacion.observacion;

  await prisma.evaluacionPsicosocial.update({
    where: { id },
    data: { estado: "Revisada", observacion },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "revisar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: evaluacion.estado },
    valorNuevo: { estado: "Revisada", observacion },
  });
  revalidatePath("/psicosocial");
  redirect(`/psicosocial/${id}`);
}
