"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-003";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  contratoId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un contrato")),
  rubroId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un rubro")),
  periodo: z.string().trim().min(4, "Período requerido"),
  // RN-023: los valores monetarios no pueden ser negativos
  valorCobrado: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0, "El valor no puede ser negativo")
  ),
  informeId: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
});

function readForm(fd: FormData) {
  return {
    contratoId: fd.get("contratoId"),
    rubroId: fd.get("rubroId"),
    periodo: String(fd.get("periodo") ?? ""),
    valorCobrado: fd.get("valorCobrado"),
    informeId: fd.get("informeId"),
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

export async function crearCuenta(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar cuentas de cobro requiere escritura (E) en MOD-003 (rol Financiera). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  // RN-005: la cuenta de cobro requiere un contrato Aprobado.
  const contrato = await prisma.contrato.findUnique({ where: { id: d.contratoId } });
  if (!contrato || contrato.estado !== "Aprobado")
    return { error: "RN-005: la cuenta de cobro requiere un contrato Aprobado." };

  // RN-006: si se indicó informe, debe estar Aprobado. Si no se indicó, se permite igual
  // (es opcional para no bloquear el flujo si el módulo Informes aún no aplica a ese contrato).
  if (d.informeId != null) {
    const informe = await prisma.informe.findUnique({ where: { id: d.informeId } });
    if (!informe || informe.estado !== "Aprobado")
      return { error: "RN-006: la cuenta requiere un informe aprobado." };
  }

  // RN-007: la cuenta queda imputada a un rubro presupuestal — rubroId es obligatorio
  // en el esquema (CuentaCobro.rubroId: Int, no nulo), así que ya queda satisfecho
  // por la validación de Zod (rubroId positivo) y el esquema de la base de datos.

  const creada = await prisma.cuentaCobro.create({
    data: {
      contratoId: d.contratoId,
      rubroId: d.rubroId,
      informeId: d.informeId ?? null,
      periodo: d.periodo,
      valorCobrado: d.valorCobrado,
      estado: "Registrada",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { contratoId: d.contratoId, rubroId: d.rubroId, periodo: d.periodo, valorCobrado: d.valorCobrado, estado: "Registrada" } });
  revalidatePath("/financiera");
  redirect("/financiera");
}

export async function editarCuenta(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar cuentas de cobro requiere escritura (E) en MOD-003. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Cuenta de cobro no válida." };
  const actual = await prisma.cuentaCobro.findUnique({ where: { id } });
  if (!actual) return { error: "La cuenta de cobro no existe." };
  if (actual.estado !== "Registrada" && actual.estado !== "Rechazada")
    return { error: "Solo se pueden editar cuentas en estado Registrada o Rechazada." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  // RN-005
  const contrato = await prisma.contrato.findUnique({ where: { id: d.contratoId } });
  if (!contrato || contrato.estado !== "Aprobado")
    return { error: "RN-005: la cuenta de cobro requiere un contrato Aprobado." };

  // RN-006
  if (d.informeId != null) {
    const informe = await prisma.informe.findUnique({ where: { id: d.informeId } });
    if (!informe || informe.estado !== "Aprobado")
      return { error: "RN-006: la cuenta requiere un informe aprobado." };
  }

  await prisma.cuentaCobro.update({
    where: { id },
    data: {
      contratoId: d.contratoId,
      rubroId: d.rubroId,
      informeId: d.informeId ?? null,
      periodo: d.periodo,
      valorCobrado: d.valorCobrado,
      estado: "Registrada", // tras editar vuelve a pendiente de aprobación
      motivoRechazo: null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { contratoId: d.contratoId, rubroId: d.rubroId, periodo: d.periodo, valorCobrado: d.valorCobrado } });
  revalidatePath("/financiera");
  redirect("/financiera");
}

// RN-025: solo un rol con Aprobación (A) puede aprobar, y nunca quien lo registró (4 ojos)
export async function aprobarCuenta(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar cuentas de cobro requiere nivel Aprobación (A) en MOD-003. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const cuenta = await prisma.cuentaCobro.findUnique({ where: { id } });
  if (!cuenta || cuenta.estado !== "Registrada") {
    revalidatePath(`/financiera/${id}`);
    redirect(`/financiera/${id}`);
  }
  if (cuenta.createdById && cuenta.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar lo que tú registraste.");

  // RN-018: si hay pólizas Aprobadas del contrato y alguna está vencida, bloquea la aprobación.
  const polizas = await prisma.poliza.findMany({ where: { contratoId: cuenta.contratoId, estado: "Aprobada" } });
  const hoy = new Date();
  const vencida = polizas.some((p) => p.vigenciaHasta && p.vigenciaHasta < hoy);
  if (vencida)
    throw new Error("RN-018: no se puede aprobar la cuenta — la póliza del contrato está vencida.");

  await prisma.cuentaCobro.update({
    where: { id },
    data: {
      estado: "Aprobada",
      valorAprobado: cuenta.valorAprobado ?? cuenta.valorCobrado,
      aprobadoById: Number(session.user.id),
      aprobadoEn: new Date(),
      motivoRechazo: null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: id, valorAnterior: { estado: "Registrada" }, valorNuevo: { estado: "Aprobada" } });
  revalidatePath("/financiera");
  redirect(`/financiera/${id}`);
}

export async function rechazarCuenta(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-003.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim() || "Sin motivo especificado";
  const cuenta = await prisma.cuentaCobro.findUnique({ where: { id } });
  if (!cuenta || cuenta.estado !== "Registrada") {
    redirect(`/financiera/${id}`);
  }

  await prisma.cuentaCobro.update({ where: { id }, data: { estado: "Rechazada", motivoRechazo: motivo } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: id, valorNuevo: { estado: "Rechazada", motivo } });
  revalidatePath("/financiera");
  redirect(`/financiera/${id}`);
}

export async function registrarPago(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "crear")))
    throw new Error(`No autorizado: registrar pagos requiere escritura (E) en MOD-003 (rol Financiera). Tu rol es ${session.user.rol}.`);

  const cuentaCobroId = Number(fd.get("cuentaCobroId"));
  const valorPagado = Number(fd.get("valorPagado"));
  const comprobante = String(fd.get("comprobante") ?? "").trim() || null;
  const medioPago = String(fd.get("medioPago") ?? "").trim() || null;

  const cuenta = await prisma.cuentaCobro.findUnique({
    where: { id: cuentaCobroId },
    include: { rubro: true, pagos: true },
  });
  if (!cuenta) throw new Error("La cuenta de cobro no existe.");
  if (cuenta.estado !== "Aprobada") throw new Error("Solo se puede pagar una cuenta Aprobada.");

  // RN-023: el valor pagado debe ser positivo.
  if (!valorPagado || valorPagado <= 0) throw new Error("RN-023: el valor del pago debe ser mayor a cero.");

  // RN-008: el pago (acumulado) no puede superar el valor aprobado de la cuenta.
  const sumaPagosCuenta = cuenta.pagos.reduce((acc, p) => acc + p.valorPagado, 0);
  if (sumaPagosCuenta + valorPagado > (cuenta.valorAprobado ?? 0))
    throw new Error("RN-008: el pago supera el valor aprobado de la cuenta.");

  // RN-009: el pago no puede superar el saldo disponible del rubro presupuestal.
  const pagosRubro = await prisma.pago.findMany({ where: { cuentaCobro: { rubroId: cuenta.rubroId } } });
  const sumaPagosRubro = pagosRubro.reduce((acc, p) => acc + p.valorPagado, 0);
  const saldoRubro = cuenta.rubro.valorAsignado - sumaPagosRubro;
  if (valorPagado > saldoRubro)
    throw new Error("RN-009: el pago supera el saldo disponible del rubro (" + saldoRubro + ").");

  const pago = await prisma.pago.create({
    data: {
      cuentaCobroId,
      valorPagado,
      comprobante,
      medioPago,
      createdById: Number(session.user.id),
    },
  });

  if (sumaPagosCuenta + valorPagado >= (cuenta.valorAprobado ?? 0)) {
    await prisma.cuentaCobro.update({ where: { id: cuentaCobroId }, data: { estado: "Pagada" } });
  }

  await writeAudit({ usuarioId: Number(session.user.id), accion: "pagar", modulo: MOD, registroId: pago.id, valorNuevo: { cuentaCobroId, valorPagado, medioPago } });
  revalidatePath("/financiera");
  redirect(`/financiera/${cuentaCobroId}`);
}
