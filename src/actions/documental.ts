"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-005";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const DECISIONES = ["Aprobado", "Rechazado", "Con observaciones"] as const;

const schema = z.object({
  // RN-017: el documento pertenece a un contrato (expediente)
  contratoId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un contrato")),
  tipoDocumento: z.string().trim().min(3, "Tipo de documento: mínimo 3 caracteres").max(120),
  // checkbox -> boolean
  obligatorio: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

function readForm(fd: FormData) {
  return {
    contratoId: fd.get("contratoId"),
    tipoDocumento: String(fd.get("tipoDocumento") ?? ""),
    obligatorio: fd.get("obligatorio"),
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

export async function crearDocumento(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: registrar documentos requiere escritura (E) en MOD-005. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const contrato = await prisma.contrato.findUnique({ where: { id: d.contratoId } });
  if (!contrato) return { fieldErrors: { contratoId: "El contrato no existe." } };

  const creado = await prisma.documento.create({
    data: {
      contratoId: d.contratoId,
      tipoDocumento: d.tipoDocumento,
      obligatorio: d.obligatorio,
      estado: "Pendiente",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: { contratoId: d.contratoId, tipoDocumento: d.tipoDocumento, obligatorio: d.obligatorio, estado: "Pendiente" },
  });
  revalidatePath("/documental");
  redirect(`/documental/${creado.id}`);
}

// RN-012: la carga crea una NUEVA versión (append-only), nunca sobrescribe la evidencia histórica.
export async function cargarVersion(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "cargar")))
    throw new Error(`No autorizado: cargar versiones requiere escritura (E) o carga (C) en MOD-005. Tu rol es ${session.user.rol}.`);

  const documentoId = Number(fd.get("documentoId"));
  if (!documentoId) throw new Error("Documento no válido.");
  const archivoUrl = String(fd.get("archivoUrl") ?? "").trim();
  if (!archivoUrl) {
    redirect(`/documental/${documentoId}`);
  }

  const doc = await prisma.documento.findUnique({ where: { id: documentoId } });
  if (!doc) {
    revalidatePath("/documental");
    redirect("/documental");
  }

  // RN-012: version = (versiones actuales + 1); fila nueva, nunca se reescribe una anterior
  const count = await prisma.versionDocumento.count({ where: { documentoId } });
  const usuarioCarga = session.user.name || session.user.email || `usuario#${session.user.id}`;

  await prisma.versionDocumento.create({
    data: {
      documentoId,
      archivoUrl,
      version: count + 1,
      usuarioCarga,
    },
  });
  await prisma.documento.update({
    where: { id: documentoId },
    data: { archivoUrl, estado: "Cargado" },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "cargar",
    modulo: MOD,
    registroId: documentoId,
    valorNuevo: { version: count + 1, archivoUrl, estado: "Cargado" },
  });
  revalidatePath("/documental");
  redirect(`/documental/${documentoId}`);
}

// RN-012: al rechazar NO se borran versiones (son append-only); solo cambia el estado del documento.
// RN-025: quien cargó el documento (createdById) no puede revisarlo/aprobarlo, aunque tenga el mismo nivel E.
export async function revisarDocumento(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: revisar documentos requiere escritura (E) en MOD-005. Tu rol es ${session.user.rol}.`);

  const documentoId = Number(fd.get("documentoId"));
  if (!documentoId) throw new Error("Documento no válido.");
  const decision = String(fd.get("decision") ?? "");
  if (!DECISIONES.includes(decision as (typeof DECISIONES)[number])) {
    redirect(`/documental/${documentoId}`);
  }
  const observacion = String(fd.get("observacion") ?? "").trim() || null;

  const doc = await prisma.documento.findUnique({ where: { id: documentoId } });
  if (!doc) {
    revalidatePath("/documental");
    redirect("/documental");
  }
  if (doc!.createdById && doc!.createdById === Number(session.user.id))
    throw new Error("RN-025: no puedes revisar un documento que tú mismo cargaste.");

  await prisma.documento.update({
    where: { id: documentoId },
    data: { estado: decision, observacion },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: documentoId,
    valorAnterior: { estado: doc.estado },
    valorNuevo: { estado: decision, observacion },
  });
  revalidatePath("/documental");
  redirect(`/documental/${documentoId}`);
}
