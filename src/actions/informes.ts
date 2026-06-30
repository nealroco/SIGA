"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-006";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  contratoId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un contrato")),
  // periodo: formato AAAA-MM (p. ej. 2026-01) o al menos 4 caracteres
  periodo: z
    .string()
    .trim()
    .min(4, "Periodo requerido (p. ej. 2026-01)")
    .max(20)
    .refine((v) => /^\d{4}-\d{2}$/.test(v) || v.length >= 4, "Formato de periodo no válido (p. ej. 2026-01)"),
  observacion: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(600).optional()),
});

function readForm(fd: FormData) {
  return {
    contratoId: fd.get("contratoId"),
    periodo: String(fd.get("periodo") ?? ""),
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

export async function crearInforme(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: radicar informes requiere escritura (E) en MOD-006. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const contrato = await prisma.contrato.findUnique({ where: { id: d.contratoId } });
  if (!contrato) return { fieldErrors: { contratoId: "El contrato no existe." } };

  // RN-022: no se puede radicar en un periodo cerrado del mismo contrato.
  const cerrado = await prisma.informe.findFirst({
    where: { contratoId: d.contratoId, periodo: d.periodo, periodoCerrado: true },
  });
  if (cerrado) return { error: "El periodo está cerrado." };

  const creado = await prisma.informe.create({
    data: {
      contratoId: d.contratoId,
      periodo: d.periodo,
      observacion: d.observacion,
      estado: "Radicado",
      fechaRadicacion: new Date(),
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: { contratoId: d.contratoId, periodo: d.periodo, estado: "Radicado" },
  });
  revalidatePath("/informes");
  redirect("/informes");
}

export async function editarInforme(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar informes requiere escritura (E) en MOD-006. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Informe no válido." };
  const actual = await prisma.informe.findUnique({ where: { id } });
  if (!actual) return { error: "El informe no existe." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const contrato = await prisma.contrato.findUnique({ where: { id: d.contratoId } });
  if (!contrato) return { fieldErrors: { contratoId: "El contrato no existe." } };

  // RN-022: no se puede mover el informe a un periodo cerrado de ese contrato.
  const cerrado = await prisma.informe.findFirst({
    where: { contratoId: d.contratoId, periodo: d.periodo, periodoCerrado: true, id: { not: id } },
  });
  if (cerrado) return { error: "El periodo está cerrado." };

  await prisma.informe.update({
    where: { id },
    data: {
      contratoId: d.contratoId,
      periodo: d.periodo,
      observacion: d.observacion,
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorNuevo: { contratoId: d.contratoId, periodo: d.periodo },
  });
  revalidatePath("/informes");
  redirect("/informes");
}

// MOD-006: las transiciones de estado las hace quien tiene E (no hay nivel A en la matriz).
export async function aprobarInforme(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: aprobar informes requiere escritura (E) en MOD-006. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const inf = await prisma.informe.findUnique({ where: { id } });
  if (!inf) {
    revalidatePath(`/informes/${id}`);
    redirect(`/informes/${id}`);
  }

  await prisma.informe.update({ where: { id }, data: { estado: "Aprobado" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "aprobar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: inf.estado },
    valorNuevo: { estado: "Aprobado" },
  });
  revalidatePath("/informes");
  redirect(`/informes/${id}`);
}

export async function devolverInforme(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: devolver informes requiere escritura (E) en MOD-006. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const observacion = String(fd.get("observacion") ?? "").trim();
  if (!observacion) throw new Error("Para devolver el informe debes indicar una observación.");

  const inf = await prisma.informe.findUnique({ where: { id } });
  if (!inf) {
    revalidatePath(`/informes/${id}`);
    redirect(`/informes/${id}`);
  }

  await prisma.informe.update({ where: { id }, data: { estado: "Devuelto", observacion } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: inf.estado },
    valorNuevo: { estado: "Devuelto", observacion },
  });
  revalidatePath("/informes");
  redirect(`/informes/${id}`);
}

// RN-022: cierre de periodo (impide radicar nuevos informes en ese contrato+periodo).
export async function cerrarPeriodo(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: cerrar periodo requiere escritura (E) en MOD-006. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const inf = await prisma.informe.findUnique({ where: { id } });
  if (!inf || inf.periodoCerrado) {
    revalidatePath(`/informes/${id}`);
    redirect(`/informes/${id}`);
  }

  await prisma.informe.update({ where: { id }, data: { periodoCerrado: true } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { periodoCerrado: false },
    valorNuevo: { periodoCerrado: true },
  });
  revalidatePath("/informes");
  redirect(`/informes/${id}`);
}

// RN-023/RN-026: el certificado SOLO se genera sobre un informe aprobado.
export async function generarCertificado(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: generar certificado requiere escritura (E) en MOD-006. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const inf = await prisma.informe.findUnique({ where: { id } });
  if (!inf) throw new Error("El informe no existe.");
  if (inf.estado !== "Aprobado")
    throw new Error("RN-023/RN-026: solo se puede generar el certificado de un informe aprobado.");

  await prisma.informe.update({ where: { id }, data: { certificadoGenerado: true } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { certificadoGenerado: false },
    valorNuevo: { certificadoGenerado: true },
  });
  revalidatePath("/informes");
  redirect(`/informes/${id}`);
}
