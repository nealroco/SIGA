import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Orden de roles = orden de columnas de la matriz del v4
const ROLES = [
  ["Administrador", "Acceso total con auditoría obligatoria; aprobador de doble control (RN-025/026)"],
  ["Supervisor", "Revisa cumplimiento técnico, convocatorias y auditoría interna"],
  ["Operador", "Operación diaria: registro de beneficiarios, seguimiento, reservas"],
  ["Revisor", "Consulta y revisión sin modificación (control)"],
  ["Coord. deportiva", "Coordina beneficiarios, programas, indicadores y escenarios"],
  ["Entrenador", "Carga de evidencias e indicadores físicos en campo"],
  ["Infraestructura", "Inventarios, escenarios, reservas y mantenimiento"],
  ["Financiera", "Cuentas, pagos, rubros, contratos, pólizas, SECOP II"],
  ["Tecnología", "IAM, infraestructura cloud, comunicaciones y notificaciones"],
] as const;

// MOD-001 … MOD-029 : [codigo, nombre, categoria, esBase]
const MODULOS: [string, string, string, boolean][] = [
  ["MOD-001", "Beneficiarios", "Operación base", true],
  ["MOD-002", "Personal", "Operación base", true],
  ["MOD-003", "Financiera", "Gobierno financiero", false],
  ["MOD-004", "Inventarios", "Recursos", false],
  ["MOD-005", "Documental", "Base", true],
  ["MOD-006", "Informes", "Control y evaluación", true],
  ["MOD-007", "Dashboard KPIs", "Base", true],
  ["MOD-008", "Convocatorias", "Operación base", false],
  ["MOD-009", "Evaluación ESAL", "Control y evaluación", false],
  ["MOD-010", "Contratos", "Gobierno financiero", false],
  ["MOD-011", "Seguimiento", "Control y evaluación", false],
  ["MOD-012", "Caracterización territorial", "Territorio", false],
  ["MOD-013", "Dotación deportiva", "Recursos", false],
  ["MOD-014", "Control pólizas", "Gobierno financiero", false],
  ["MOD-015", "Comité de control", "Gobernanza", false],
  ["MOD-016", "Indicadores físicos", "Planeación", false],
  ["MOD-017", "Gestión de lotes", "Recursos", false],
  ["MOD-018", "Eval. psicosocial", "Control y evaluación", false],
  ["MOD-019", "Comunicaciones", "Transversal", false],
  ["MOD-020", "Fuentes de financiación", "Gobierno financiero", false],
  ["MOD-021", "Notificaciones", "Transversal", false],
  ["MOD-022", "Reservas escenario", "Escenarios", false],
  ["MOD-023", "Mantenimiento de escenarios", "Escenarios", false],
  ["MOD-024", "Georeferenciación", "Territorio", false],
  ["MOD-025", "Análisis de impacto", "Reportes", false],
  ["MOD-026", "Auditoría interna", "Base", true],
  ["MOD-027", "Integración SECOP II", "Gobierno financiero", false],
  ["MOD-028", "Seguridad / IAM", "Base", true],
  ["MOD-029", "Infraestructura cloud", "Base", false],
];

// Matriz 9×29 (verbatim v4). Orden de columnas = ROLES. "—" => NONE
const MATRIX: string[][] = [
  ["E", "L", "E", "L", "E", "L", "—", "L", "L"], // 001
  ["E", "A", "E", "L", "L", "L", "—", "L", "L"], // 002
  ["A", "L", "—", "L", "L", "—", "—", "E", "L"], // 003
  ["E", "L", "L", "L", "L", "L", "E", "L", "L"], // 004
  ["E", "L", "C", "L", "C", "C", "C", "C", "E"], // 005
  ["E", "L", "L", "E", "L", "L", "L", "L", "E"], // 006
  ["E", "L", "—", "L", "L", "—", "L", "L", "E"], // 007
  ["A", "E", "L", "L", "L", "—", "—", "L", "L"], // 008
  ["E", "A", "L", "L", "L", "—", "—", "L", "L"], // 009
  ["A", "L", "—", "L", "L", "—", "—", "E", "L"], // 010
  ["E", "L", "E", "L", "E", "C", "L", "L", "L"], // 011
  ["E", "L", "E", "L", "E", "L", "—", "—", "L"], // 012
  ["E", "L", "E", "L", "E", "C", "E", "L", "L"], // 013
  ["A", "L", "—", "L", "L", "—", "—", "E", "L"], // 014
  ["A", "E", "L", "L", "E", "—", "—", "L", "L"], // 015
  ["E", "L", "E", "L", "E", "E", "—", "—", "L"], // 016
  ["E", "L", "E", "L", "E", "—", "L", "L", "L"], // 017
  ["E", "L", "E", "L", "E", "L", "—", "—", "L"], // 018
  ["E", "L", "L", "L", "E", "L", "L", "L", "E"], // 019
  ["A", "L", "—", "L", "—", "—", "—", "E", "L"], // 020
  ["E", "L", "L", "L", "L", "—", "L", "L", "E"], // 021
  ["E", "L", "E", "L", "E", "C", "E", "—", "L"], // 022
  ["E", "L", "L", "L", "L", "—", "E", "L", "L"], // 023
  ["E", "L", "E", "L", "E", "—", "L", "—", "L"], // 024
  ["E", "E", "L", "E", "L", "—", "L", "L", "L"], // 025
  ["L", "E", "—", "E", "L", "—", "L", "L", "L"], // 026
  ["A", "L", "—", "L", "—", "—", "—", "E", "L"], // 027
  ["E", "—", "—", "L", "—", "—", "—", "—", "E"], // 028
  ["E", "—", "—", "L", "—", "—", "L", "—", "E"], // 029
];

const BENEFICIARIOS = [
  ["1010101010", "Laura Gómez Restrepo", 14, "F", "Escuela de fútbol", "Soacha — Comuna 4", "Marta Restrepo"],
  ["1020202020", "Andrés Quintero Páez", 16, "M", "Atletismo", "Bogotá — Bosa", "Jorge Quintero"],
  ["1030303030", "Valentina Ruiz Mora", 12, "F", "Natación", "Girardot — Centro", "Diana Mora"],
  ["1040404040", "Santiago Lozano Díaz", 17, "M", "Baloncesto", "Fusagasugá — Norte", "Pedro Lozano"],
  ["1050505050", "Mariana Cortés Vega", 13, "F", "Gimnasia", "Soacha — Comuna 1", "Luz Vega"],
  ["1060606060", "Juan David Peña", 15, "M", "Fútbol de salón", "Bogotá — Kennedy", "Ana Peña"],
  ["1070707070", "Sofía Camargo León", 11, "F", "Patinaje", "Zipaquirá — Centro", "Carlos Camargo"],
  ["1080808080", "Mateo Herrera Niño", 18, "M", "Ciclismo", "Chía — La Balsa", "Rosa Niño"],
];

async function main() {
  console.log("Seed: roles…");
  const rolesById: Record<string, number> = {};
  for (const [nombre, descripcion] of ROLES) {
    const r = await prisma.rol.upsert({
      where: { nombre },
      update: { descripcion },
      create: { nombre, descripcion },
    });
    rolesById[nombre] = r.id;
  }

  console.log("Seed: módulos…");
  const modulosByCodigo: Record<string, number> = {};
  for (const [codigo, nombre, categoria, esBase] of MODULOS) {
    const m = await prisma.modulo.upsert({
      where: { codigo },
      update: { nombre, categoria, esBase },
      create: { codigo, nombre, categoria, esBase },
    });
    modulosByCodigo[codigo] = m.id;
  }

  console.log("Seed: matriz de permisos (9×29)…");
  for (let i = 0; i < MODULOS.length; i++) {
    const codigo = MODULOS[i][0];
    const moduloId = modulosByCodigo[codigo];
    for (let j = 0; j < ROLES.length; j++) {
      const rolId = rolesById[ROLES[j][0]];
      const raw = MATRIX[i][j];
      const nivel = raw === "—" ? "NONE" : raw;
      await prisma.permiso.upsert({
        where: { rolId_moduloId: { rolId, moduloId } },
        update: { nivel },
        create: { rolId, moduloId, nivel },
      });
    }
  }

  console.log("Seed: usuarios…");
  const hash = await bcrypt.hash("siga2026", 10);
  const usuarios = [
    ["Admin SIGA", "admin@siga.gov.co", "Administrador"],
    ["Carolina Revisora", "revisor@siga.gov.co", "Revisor"],
    ["Coord. Deportiva", "coord@siga.gov.co", "Coord. deportiva"],
    ["Fernanda Financiera", "financiera@siga.gov.co", "Financiera"],
  ];
  for (const [nombre, correo, rol] of usuarios) {
    await prisma.usuario.upsert({
      where: { correo },
      update: { nombre, rolId: rolesById[rol] },
      create: { nombre, correo, passwordHash: hash, rolId: rolesById[rol] },
    });
  }

  console.log("Seed: beneficiarios de muestra…");
  for (const [documento, nombre, edad, sexo, programa, territorio, acudiente] of BENEFICIARIOS) {
    await prisma.beneficiario.upsert({
      where: { documento: documento as string },
      update: {},
      create: {
        documento: documento as string,
        nombre: nombre as string,
        edad: edad as number,
        sexo: sexo as string,
        programa: programa as string,
        territorio: territorio as string,
        acudiente: acudiente as string,
      },
    });
  }

  console.log("Seed: terceros…");
  const TERCEROS: [string, string, string][] = [
    ["8001234567", "Fundación Deporte y Vida", "ESAL"],
    ["9009876543", "Corporación Atlética Andina", "ESAL"],
    ["79123456", "Juan Carlos Méndez", "Persona natural"],
  ];
  const terceroByDoc: Record<string, number> = {};
  for (const [documento, razonSocial, tipo] of TERCEROS) {
    const t = await prisma.tercero.upsert({
      where: { documento },
      update: { razonSocial, tipo },
      create: { documento, razonSocial, tipo },
    });
    terceroByDoc[documento] = t.id;
  }

  console.log("Seed: contratos de muestra…");
  const fin = await prisma.usuario.findUnique({ where: { correo: "financiera@siga.gov.co" } });
  const adminU = await prisma.usuario.findUnique({ where: { correo: "admin@siga.gov.co" } });
  const CONTRATOS: [string, string, string, number, string][] = [
    ["CTO-2026-001", "Operación de escuelas de fútbol — Soacha", "8001234567", 120000000, "Registrado"],
    ["CTO-2026-002", "Dotación deportiva para programas de atletismo", "9009876543", 85000000, "Aprobado"],
    ["CTO-2026-003", "Servicios profesionales de seguimiento", "79123456", 36000000, "Registrado"],
  ];
  for (const [numero, objeto, terceroDoc, valorTotal, estado] of CONTRATOS) {
    await prisma.contrato.upsert({
      where: { numero },
      update: {},
      create: {
        numero,
        objeto,
        terceroId: terceroByDoc[terceroDoc],
        valorTotal,
        estado,
        createdById: fin?.id ?? null,
        aprobadoById: estado === "Aprobado" ? adminU?.id ?? null : null,
        aprobadoEn: estado === "Aprobado" ? new Date() : null,
      },
    });
  }

  console.log("Seed completado ✓");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
