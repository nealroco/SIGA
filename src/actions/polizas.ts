"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-014";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  contratoId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un contrato")),
  tipo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(60).optional()),
  aseguradora: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(120).optional()),
  // RN-020: los valores monetarios no pueden ser negativos
  valor: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0, "El valor no puede ser negativo")
  ),
  vigenciaDesde: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  vigenciaHasta: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
});

function readForm(fd: FormData) {
  return {
    contratoId: fd.get("contratoId"),
    tipo: fd.get("tipo"),
    aseguradora: String(fd.get("aseguradora") ?? ""),
    valor: fd.get("valor"),
    vigenciaDesde: fd.get("vigenciaDesde"),
    vigenciaHasta: fd.get("vigenciaHasta"),
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

export async function crearPoliza(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar pólizas requiere escritura (E) en MOD-014 (rol Financiera). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const desde = toDate(d.vigenciaDesde);
  const hasta = toDate(d.vigenciaHasta);
  if (desde && hasta && hasta <= desde) return { fieldErrors: { vigenciaHasta: "La vigencia hasta debe ser posterior a la vigencia desde." } };

  const contrato = await prisma.contrato.findUnique({ where: { id: d.contratoId } });
  if (!contrato) return { fieldErrors: { contratoId: "El contrato seleccionado no existe." } };

  const creada = await prisma.poliza.create({
    data: {
      contratoId: d.contratoId,
      tipo: d.tipo,
      aseguradora: d.aseguradora,
      valor: d.valor,
      vigenciaDesde: desde,
      vigenciaHasta: hasta,
      estado: "Registrada",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { contratoId: d.contratoId, valor: d.valor, estado: "Registrada" } });
  revalidatePath("/polizas");
  redirect("/polizas");
}

export async function editarPoliza(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar pólizas requiere escritura (E) en MOD-014. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Póliza no válida." };
  const actual = await prisma.poliza.findUnique({ where: { id } });
  if (!actual) return { error: "La póliza no existe." };
  if (actual.estado === "Aprobada") return { error: "Una póliza aprobada no puede editarse." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const desde = toDate(d.vigenciaDesde);
  const hasta = toDate(d.vigenciaHasta);
  if (desde && hasta && hasta <= desde) return { fieldErrors: { vigenciaHasta: "La vigencia hasta debe ser posterior a la vigencia desde." } };

  const contrato = await prisma.contrato.findUnique({ where: { id: d.contratoId } });
  if (!contrato) return { fieldErrors: { contratoId: "El contrato seleccionado no existe." } };

  await prisma.poliza.update({
    where: { id },
    data: {
      contratoId: d.contratoId,
      tipo: d.tipo,
      aseguradora: d.aseguradora,
      valor: d.valor,
      vigenciaDesde: desde,
      vigenciaHasta: hasta,
      estado: "Registrada", // tras editar vuelve a pendiente de aprobación
      motivoRechazo: null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { contratoId: d.contratoId, valor: d.valor } });
  revalidatePath("/polizas");
  redirect("/polizas");
}

// RN-025: solo un rol con Aprobación (A) puede aprobar, y nunca quien la registró (4 ojos)
export async function aprobarPoliza(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar pólizas requiere nivel Aprobación (A) en MOD-014. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const p = await prisma.poliza.findUnique({ where: { id } });
  if (!p || p.estado !== "Registrada") {
    revalidatePath(`/polizas/${id}`);
    redirect(`/polizas/${id}`);
  }
  if (p.createdById && p.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar lo que tú registraste.");

  await prisma.poliza.update({
    where: { id },
    data: { estado: "Aprobada", aprobadoById: Number(session.user.id), aprobadoEn: new Date(), motivoRechazo: null },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: id, valorAnterior: { estado: "Registrada" }, valorNuevo: { estado: "Aprobada" } });
  revalidatePath("/polizas");
  redirect(`/polizas/${id}`);
}

export async function rechazarPoliza(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-014.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim() || "Sin motivo especificado";
  const p = await prisma.poliza.findUnique({ where: { id } });
  if (!p || p.estado !== "Registrada") {
    redirect(`/polizas/${id}`);
  }

  await prisma.poliza.update({ where: { id }, data: { estado: "Rechazada", motivoRechazo: motivo } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: id, valorNuevo: { estado: "Rechazada", motivo } });
  revalidatePath("/polizas");
  redirect(`/polizas/${id}`);
}
