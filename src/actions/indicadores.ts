"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-016";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const indicadorSchema = z.object({
  codigo: z.string().trim().min(3, "Código requerido (mínimo 3 caracteres)").max(40),
  nombre: z.string().trim().min(3, "Nombre requerido (mínimo 3 caracteres)").max(200),
  unidad: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(60).optional()),
  // RN-023: los valores/cantidades no pueden ser negativos
  programado: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0, "El valor programado no puede ser negativo")
  ),
  periodo: z.string().trim().min(4, "Período requerido"),
});

function readIndicadorForm(fd: FormData) {
  return {
    codigo: String(fd.get("codigo") ?? ""),
    nombre: String(fd.get("nombre") ?? ""),
    unidad: String(fd.get("unidad") ?? ""),
    programado: fd.get("programado"),
    periodo: String(fd.get("periodo") ?? ""),
  };
}

const avanceSchema = z.object({
  indicadorId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un indicador")),
  // RN-023: los valores/cantidades no pueden ser negativos
  cantidadReportada: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0, "La cantidad no puede ser negativa")
  ),
  periodo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(40).optional()),
});

function readAvanceForm(fd: FormData) {
  return {
    indicadorId: fd.get("indicadorId"),
    cantidadReportada: fd.get("cantidadReportada"),
    periodo: String(fd.get("periodo") ?? ""),
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

export async function crearIndicador(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar indicadores requiere escritura (E) en MOD-016. Tu rol es ${session.user.rol}.` };

  const parsed = indicadorSchema.safeParse(readIndicadorForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.indicadorFisico.findUnique({ where: { codigo: d.codigo } });
  if (dup) return { fieldErrors: { codigo: "Ya existe un indicador con ese código." } };

  const creado = await prisma.indicadorFisico.create({
    data: {
      codigo: d.codigo,
      nombre: d.nombre,
      unidad: d.unidad ?? null,
      programado: d.programado,
      periodo: d.periodo,
      estado: "Activo",
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { codigo: d.codigo, nombre: d.nombre, programado: d.programado, periodo: d.periodo } });
  revalidatePath("/indicadores");
  redirect("/indicadores");
}

export async function reportarAvance(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: reportar avances requiere escritura (E) en MOD-016. Tu rol es ${session.user.rol}.` };

  const parsed = avanceSchema.safeParse(readAvanceForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const indicador = await prisma.indicadorFisico.findUnique({ where: { id: d.indicadorId } });
  if (!indicador) return { error: "El indicador no existe." };

  const creado = await prisma.avanceMeta.create({
    data: {
      indicadorId: d.indicadorId,
      cantidadReportada: d.cantidadReportada,
      periodo: d.periodo ?? null,
      estado: "Reportado",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { indicadorId: d.indicadorId, cantidadReportada: d.cantidadReportada, estado: "Reportado" } });
  revalidatePath(`/indicadores/${d.indicadorId}`);
  redirect(`/indicadores/${d.indicadorId}`);
}

// MOD-016: a diferencia de Contratos/Financiera (RN-025, doble control con nivel A separado),
// la matriz de este módulo NO tiene nivel A — varios roles tienen E (Administrador, Operador,
// Coord. deportiva, Entrenador) y otros L (Supervisor, Revisor, Tecnología). Por eso la
// "aprobación" del avance se autoriza con el mismo nivel "editar" (E), SIN el chequeo de
// segregación de funciones (no aplica RN-025 aquí; quien reportó SÍ puede aprobar su propio avance).
export async function aprobarAvance(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: aprobar avances requiere escritura (E) en MOD-016. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const avance = await prisma.avanceMeta.findUnique({ where: { id } });
  if (!avance || avance.estado !== "Reportado") {
    redirect(`/indicadores/${avance?.indicadorId ?? ""}`);
  }

  // RN-011: solo lo Aprobado suma al cumplimiento. Por defecto, la cantidad aprobada
  // coincide con la reportada (no se permite, en este flujo, especificar otra cantidad).
  const cantidadAprobada = avance.cantidadAprobada ?? avance.cantidadReportada;

  await prisma.avanceMeta.update({
    where: { id },
    data: {
      estado: "Aprobado",
      cantidadAprobada,
      aprobadoById: Number(session.user.id),
      aprobadoEn: new Date(),
      motivoRechazo: null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: id, valorAnterior: { estado: "Reportado" }, valorNuevo: { estado: "Aprobado", cantidadAprobada } });
  revalidatePath(`/indicadores/${avance.indicadorId}`);
  revalidatePath("/indicadores");
  redirect(`/indicadores/${avance.indicadorId}`);
}

export async function rechazarAvance(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: rechazar avances requiere escritura (E) en MOD-016. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Debes indicar un motivo de rechazo.");

  const avance = await prisma.avanceMeta.findUnique({ where: { id } });
  if (!avance || avance.estado !== "Reportado") {
    redirect(`/indicadores/${avance?.indicadorId ?? ""}`);
  }

  await prisma.avanceMeta.update({
    where: { id },
    data: { estado: "Rechazado", motivoRechazo: motivo },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: id, valorNuevo: { estado: "Rechazado", motivo } });
  revalidatePath(`/indicadores/${avance.indicadorId}`);
  revalidatePath("/indicadores");
  redirect(`/indicadores/${avance.indicadorId}`);
}
