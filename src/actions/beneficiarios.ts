"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-001";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  documento: z.string().trim().min(5, "Documento: mínimo 5 caracteres").max(20, "Documento demasiado largo"),
  nombre: z.string().trim().min(3, "Nombre requerido").max(120),
  // RN-020: la edad no puede ser negativa
  edad: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int("La edad debe ser un entero").min(0, "La edad no puede ser negativa").max(120, "Edad fuera de rango").optional()
  ),
  sexo: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["M", "F", "Otro"]).optional()
  ),
  programa: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(120).optional()),
  territorioId: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  acudiente: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(120).optional()),
});

function readForm(fd: FormData) {
  return {
    documento: String(fd.get("documento") ?? ""),
    nombre: String(fd.get("nombre") ?? ""),
    edad: fd.get("edad"),
    sexo: fd.get("sexo"),
    programa: String(fd.get("programa") ?? ""),
    territorioId: fd.get("territorioId"),
    acudiente: String(fd.get("acudiente") ?? ""),
  };
}

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function crearBeneficiario(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  // RN-015: el permiso de rol prevalece (verificación en servidor)
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: tu rol (${session.user.rol}) no tiene escritura en Beneficiarios (MOD-001).` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const data = parsed.data;

  const dup = await prisma.beneficiario.findUnique({ where: { documento: data.documento } });
  if (dup) return { fieldErrors: { documento: "Ya existe un beneficiario con ese documento." } };

  const creado = await prisma.beneficiario.create({ data });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: data,
  });

  revalidatePath("/beneficiarios");
  revalidatePath("/dashboard");
  redirect("/beneficiarios");
}

export async function editarBeneficiario(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: tu rol (${session.user.rol}) no tiene escritura en Beneficiarios (MOD-001).` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Registro no válido." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const data = parsed.data;

  const anterior = await prisma.beneficiario.findUnique({ where: { id } });
  if (!anterior) return { error: "El beneficiario no existe." };

  const dup = await prisma.beneficiario.findUnique({ where: { documento: data.documento } });
  if (dup && dup.id !== id) return { fieldErrors: { documento: "Otro beneficiario ya usa ese documento." } };

  await prisma.beneficiario.update({ where: { id }, data });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: {
      documento: anterior.documento,
      nombre: anterior.nombre,
      edad: anterior.edad,
      programa: anterior.programa,
    },
    valorNuevo: data,
  });

  revalidatePath("/beneficiarios");
  revalidatePath("/dashboard");
  redirect("/beneficiarios");
}

// RN-002: la "eliminación" es baja lógica (estado = Inactivo), nunca DELETE físico.
export async function darDeBajaBeneficiario(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!(await can(session.user.rol, MOD, "eliminar"))) {
    throw new Error("No autorizado para dar de baja beneficiarios.");
  }
  const id = Number(fd.get("id"));
  if (!id) return;

  const anterior = await prisma.beneficiario.findUnique({ where: { id } });
  if (!anterior || anterior.estado === "Inactivo") {
    revalidatePath("/beneficiarios");
    redirect("/beneficiarios");
  }

  await prisma.beneficiario.update({ where: { id }, data: { estado: "Inactivo" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "baja",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Activo" },
    valorNuevo: { estado: "Inactivo" },
  });

  revalidatePath("/beneficiarios");
  revalidatePath("/dashboard");
  redirect("/beneficiarios");
}
