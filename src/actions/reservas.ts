"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-022";
const GAP_MS = 30 * 60 * 1000; // RN-024: margen de 30 minutos entre reservas

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const escenarioSchema = z.object({
  nombre: z.string().trim().min(3, "Nombre requerido (mínimo 3 caracteres)"),
  tipo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  direccion: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(200).optional()),
  capacidad: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(0, "La capacidad no puede ser negativa").optional()
  ),
});

export async function crearEscenario(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar escenarios requiere escritura (E) en MOD-022. Tu rol es ${session.user.rol}.` };

  const parsed = escenarioSchema.safeParse({
    nombre: fd.get("nombre"),
    tipo: fd.get("tipo"),
    direccion: fd.get("direccion"),
    capacidad: fd.get("capacidad"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const creado = await prisma.escenario.create({
    data: {
      nombre: d.nombre,
      tipo: d.tipo ?? null,
      direccion: d.direccion ?? null,
      capacidad: d.capacidad ?? null,
      estado: "Activo",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { nombre: d.nombre, tipo: d.tipo } });
  revalidatePath("/reservas/escenarios");
  redirect("/reservas/escenarios");
}

export async function editarEscenario(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar escenarios requiere escritura (E) en MOD-022. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Escenario no válido." };
  const actual = await prisma.escenario.findUnique({ where: { id } });
  if (!actual) return { error: "El escenario no existe." };

  const parsed = escenarioSchema.safeParse({
    nombre: fd.get("nombre"),
    tipo: fd.get("tipo"),
    direccion: fd.get("direccion"),
    capacidad: fd.get("capacidad"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  await prisma.escenario.update({
    where: { id },
    data: {
      nombre: d.nombre,
      tipo: d.tipo ?? null,
      direccion: d.direccion ?? null,
      capacidad: d.capacidad ?? null,
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { nombre: actual.nombre, tipo: actual.tipo, direccion: actual.direccion, capacidad: actual.capacidad },
    valorNuevo: { nombre: d.nombre, tipo: d.tipo, direccion: d.direccion, capacidad: d.capacidad },
  });
  revalidatePath("/reservas/escenarios");
  redirect("/reservas/escenarios");
}

// RN-002: la "eliminación" es baja lógica (estado = Inactivo), nunca DELETE físico.
export async function darDeBajaEscenario(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!(await can(session.user.rol, MOD, "eliminar"))) {
    throw new Error(`No autorizado: dar de baja escenarios requiere escritura (E) en MOD-022. Tu rol es ${session.user.rol}.`);
  }
  const id = Number(fd.get("id"));
  if (!id) return;

  const actual = await prisma.escenario.findUnique({ where: { id } });
  if (!actual || actual.estado === "Inactivo") {
    revalidatePath("/reservas/escenarios");
    redirect("/reservas/escenarios");
  }

  await prisma.escenario.update({ where: { id }, data: { estado: "Inactivo" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "baja",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Activo" },
    valorNuevo: { estado: "Inactivo" },
  });
  revalidatePath("/reservas/escenarios");
  redirect("/reservas/escenarios");
}

const reservaSchema = z.object({
  escenarioId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un escenario")),
  tipoUso: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  fechaInicio: z.string().trim().min(1, "Fecha de inicio requerida"),
  fechaFin: z.string().trim().min(1, "Fecha de fin requerida"),
  periodo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  esEmergencia: z.preprocess((v) => v === "true", z.boolean()),
  motivoEmergencia: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
});

export async function crearReserva(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  const puedeCrear = await can(session.user.rol, MOD, "crear");
  const puedeCargar = await can(session.user.rol, MOD, "cargar");
  if (!puedeCrear && !puedeCargar)
    return { error: `No autorizado: crear reservas requiere escritura (E) o carga (C) en MOD-022. Tu rol es ${session.user.rol}.` };

  const parsed = reservaSchema.safeParse({
    escenarioId: fd.get("escenarioId"),
    tipoUso: fd.get("tipoUso"),
    fechaInicio: fd.get("fechaInicio"),
    fechaFin: fd.get("fechaFin"),
    periodo: fd.get("periodo"),
    esEmergencia: fd.get("esEmergencia"),
    motivoEmergencia: fd.get("motivoEmergencia"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  // RN-024: validación de fechas (traducción de validarReserva() del documento maestro)
  const ini = new Date(d.fechaInicio);
  const fin = new Date(d.fechaFin);
  if (isNaN(ini.getTime()) || isNaN(fin.getTime()) || fin <= ini)
    return { fieldErrors: { fechaFin: "RN-024: fecha_fin debe ser posterior a fecha_inicio" } };

  // Cruce con Mantenimiento: un escenario con mantenimiento "En curso" que se solape
  // con el rango solicitado bloquea la reserva, tanto en flujo normal como de emergencia.
  const mantenimientosEnCurso = await prisma.mantenimiento.findMany({
    where: { escenarioId: d.escenarioId, estado: "En curso" },
  });

  for (const m of mantenimientosEnCurso) {
    // fechaInicio/fechaFin son nullable: si faltan, el mantenimiento sigue bloqueando
    // mientras esté "En curso" (no se excluye silenciosamente).
    const mIni = m.fechaInicio ? m.fechaInicio.getTime() : -Infinity;
    const mFin = m.fechaFin ? m.fechaFin.getTime() : Infinity;
    if (ini.getTime() < mFin && mIni < fin.getTime()) {
      await prisma.logConflicto.create({
        data: {
          escenarioId: d.escenarioId,
          tipo: "Mantenimiento",
          motivo: "Rechazo automático: escenario en mantenimiento activo (RN-024)",
          usuarioId: Number(session.user.id),
          fechaIntentoInicio: ini,
          fechaIntentoFin: fin,
        },
      });
      return {
        error:
          "RN-024: el escenario está en mantenimiento activo (" +
          (m.descripcion ?? "sin descripción") +
          ") desde " +
          (m.fechaInicio ? m.fechaInicio.toLocaleString() : "fecha sin definir") +
          " hasta " +
          (m.fechaFin ? m.fechaFin.toLocaleString() : "fecha sin definir") +
          ".",
      };
    }
  }

  if (d.esEmergencia) {
    // RN-024-B: el override de emergencia SOLO lo puede crear el rol Administrador (comprobación literal, no por nivel de permiso)
    if (session.user.rol !== "Administrador")
      return { error: "RN-024-B: el override de emergencia solo lo puede crear el rol Administrador." };

    const creada = await prisma.reservaEscenario.create({
      data: {
        escenarioId: d.escenarioId,
        tipoUso: d.tipoUso ?? null,
        fechaInicio: ini,
        fechaFin: fin,
        periodo: d.periodo ?? null,
        estado: "Emergencia",
        esEmergencia: true,
        motivoEmergencia: d.motivoEmergencia ?? null,
        createdById: Number(session.user.id),
      },
    });
    await prisma.logConflicto.create({
      data: {
        escenarioId: d.escenarioId,
        tipo: "Override",
        motivo: d.motivoEmergencia ?? null,
        usuarioId: Number(session.user.id),
        fechaIntentoInicio: ini,
        fechaIntentoFin: fin,
      },
    });
    // RN-024-B: notificación automática al Supervisor por cada override de emergencia.
    await prisma.notificacion.create({
      data: {
        tipoEvento: "RN-024-B",
        canal: "Sistema",
        destinatario: "Supervisor",
        estadoEnvio: "Pendiente",
        createdById: Number(session.user.id),
        mensaje:
          "Override de emergencia RN-024-B: reserva #" +
          creada.id +
          " creada para el escenario " +
          d.escenarioId +
          ". Motivo: " +
          (d.motivoEmergencia || "sin motivo especificado") +
          ".",
      },
    });
    await writeAudit({ usuarioId: Number(session.user.id), accion: "override_emergencia", modulo: MOD, registroId: creada.id, valorNuevo: { escenarioId: d.escenarioId, fechaInicio: ini, fechaFin: fin, motivoEmergencia: d.motivoEmergencia } });
    revalidatePath("/reservas");
    redirect("/reservas");
  }

  // RN-024: flujo normal — anti-solapamiento con margen de 30 minutos
  const existentes = await prisma.reservaEscenario.findMany({
    where: { escenarioId: d.escenarioId, estado: { not: "Cancelada" } },
  });

  for (const r of existentes) {
    const ei = r.fechaInicio.getTime();
    const ef = r.fechaFin.getTime();
    if (ini.getTime() < ef + GAP_MS && ei < fin.getTime() + GAP_MS) {
      await prisma.logConflicto.create({
        data: {
          escenarioId: d.escenarioId,
          reservaExistenteId: r.id,
          tipo: "Solapamiento",
          motivo: "Rechazo automático RN-024",
          usuarioId: Number(session.user.id),
          fechaIntentoInicio: ini,
          fechaIntentoFin: fin,
        },
      });
      return {
        error:
          "RN-024: la reserva se solapa (con margen de 30 min) con la reserva existente #" +
          r.id +
          " (" +
          r.fechaInicio.toLocaleString() +
          " - " +
          r.fechaFin.toLocaleString() +
          ").",
      };
    }
  }

  const creada = await prisma.reservaEscenario.create({
    data: {
      escenarioId: d.escenarioId,
      tipoUso: d.tipoUso ?? null,
      fechaInicio: ini,
      fechaFin: fin,
      periodo: d.periodo ?? null,
      estado: "Activa",
      esEmergencia: false,
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { escenarioId: d.escenarioId, fechaInicio: ini, fechaFin: fin, estado: "Activa" } });
  revalidatePath("/reservas");
  redirect("/reservas");
}

export async function cancelarReserva(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: cancelar reservas requiere escritura (E) en MOD-022. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const r = await prisma.reservaEscenario.findUnique({ where: { id } });
  if (!r) {
    revalidatePath("/reservas");
    redirect("/reservas");
  }

  await prisma.reservaEscenario.update({ where: { id }, data: { estado: "Cancelada" } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "cancelar", modulo: MOD, registroId: id, valorAnterior: { estado: r!.estado }, valorNuevo: { estado: "Cancelada" } });
  revalidatePath("/reservas");
  redirect("/reservas");
}
