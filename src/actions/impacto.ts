"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-025";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  periodo: z.string().trim().min(4, "Período requerido (ej. 2026-01)"),
});

function readForm(fd: FormData) {
  return {
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

export async function generarAnalisis(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: generar un análisis de impacto requiere escritura (E) en MOD-025. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  // Gasto ejecutado: SUMA de todos los pagos existentes (total acumulado).
  const pagos = await prisma.pago.findMany({ select: { valorPagado: true } });
  const gastoEjecutado = pagos.reduce((acc, p) => acc + p.valorPagado, 0);

  // Ejecución financiera %: SUMA(pagos) / SUMA(cuentaCobro.valorAprobado de cuentas Aprobada o Pagada) * 100.
  const cuentas = await prisma.cuentaCobro.findMany({
    where: { estado: { in: ["Aprobada", "Pagada"] } },
    select: { valorAprobado: true, valorCobrado: true },
  });
  const totalAprobado = cuentas.reduce((acc, c) => acc + (c.valorAprobado ?? c.valorCobrado ?? 0), 0);
  const ejecucionFinanciera = totalAprobado > 0 ? (gastoEjecutado / totalAprobado) * 100 : 0;

  // Cumplimiento físico %: para cada indicador activo, SUMA(avances Aprobados.cantidadAprobada)/programado;
  // se promedia ese % entre todos los indicadores activos.
  const indicadores = await prisma.indicadorFisico.findMany({
    where: { estado: "Activo" },
    include: { avances: { where: { estado: "Aprobado" } } },
  });
  let cumplimientoFisico = 0;
  if (indicadores.length > 0) {
    const porcentajes = indicadores.map((ind) => {
      const sumaAprobada = ind.avances.reduce((acc, a) => acc + (a.cantidadAprobada ?? 0), 0);
      return ind.programado > 0 ? (sumaAprobada / ind.programado) * 100 : 0;
    });
    cumplimientoFisico = porcentajes.reduce((acc, p) => acc + p, 0) / porcentajes.length;
  }

  // RN-021: la desviación mide la brecha entre ejecución financiera y cumplimiento físico.
  const desviacion = ejecucionFinanciera - cumplimientoFisico;

  const creado = await prisma.analisisImpacto.create({
    data: {
      periodo: d.periodo,
      gastoEjecutado,
      cumplimientoFisico,
      ejecucionFinanciera,
      desviacion,
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: { periodo: d.periodo, gastoEjecutado, cumplimientoFisico, ejecucionFinanciera, desviacion },
  });
  revalidatePath("/impacto");
  redirect("/impacto");
}
