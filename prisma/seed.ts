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
    ["Sergio Supervisor", "supervisor@siga.gov.co", "Supervisor"],
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

  console.log("Seed: convocatorias…");
  const sup = await prisma.usuario.findUnique({ where: { correo: "supervisor@siga.gov.co" } });
  const CONVOCATORIAS: [string, string, number, string][] = [
    ["Convocatoria Escuelas Deportivas 2026-1", "Inscripción a escuelas de formación deportiva", 50, "Abierta"],
    ["Convocatoria Semillero de Atletismo", "Selección para el semillero juvenil de atletismo", 20, "En selección"],
  ];
  for (const [nombre, descripcion, cupos, estado] of CONVOCATORIAS) {
    const existe = await prisma.convocatoria.findFirst({ where: { nombre } });
    if (!existe) {
      await prisma.convocatoria.create({
        data: { nombre, descripcion, cupos, estado, createdById: sup?.id ?? null },
      });
    }
  }

  console.log("Seed: personal…");
  const PERSONAL: [string, string, string, string, string][] = [
    ["52111222", "Diana Torres", "Profesional de apoyo", "Administrativa", "Contratista"],
    ["80333444", "Carlos Méndez", "Coordinador de programa", "Deportiva", "OPS"],
    ["43555666", "Lucía Ramírez", "Entrenadora", "Deportiva", "OPS"],
  ];
  for (const [documento, nombre, cargo, perfil, tipoVinculacion] of PERSONAL) {
    await prisma.personal.upsert({ where: { documento }, update: {}, create: { documento, nombre, cargo, perfil, tipoVinculacion } });
  }

  console.log("Seed: expediente documental + informe + seguimiento…");
  const supU = await prisma.usuario.findUnique({ where: { correo: "supervisor@siga.gov.co" } });
  const c1 = await prisma.contrato.findUnique({ where: { numero: "CTO-2026-001" } });
  if (c1) {
    const DOCS: [string, boolean, string][] = [
      ["Contrato firmado", true, "Aprobado"],
      ["Registro presupuestal / RP", true, "Aprobado"],
      ["Acta de inicio", true, "Cargado"],
      ["Póliza", false, "Pendiente"],
      ["Informe mensual", true, "Pendiente"],
    ];
    for (const [tipoDocumento, obligatorio, estado] of DOCS) {
      const ex = await prisma.documento.findFirst({ where: { contratoId: c1.id, tipoDocumento } });
      if (!ex) await prisma.documento.create({ data: { contratoId: c1.id, tipoDocumento, obligatorio, estado } });
    }
    const infEx = await prisma.informe.findFirst({ where: { contratoId: c1.id, periodo: "2026-01" } });
    if (!infEx) await prisma.informe.create({ data: { contratoId: c1.id, periodo: "2026-01", estado: "Radicado", fechaRadicacion: new Date(), createdById: supU?.id ?? null } });
  }
  const ben = await prisma.beneficiario.findFirst();
  if (ben) {
    const segEx = await prisma.seguimiento.findFirst({ where: { beneficiarioId: ben.id } });
    if (!segEx) await prisma.seguimiento.create({ data: { beneficiarioId: ben.id, programa: ben.programa, actividad: "Sesión de entrenamiento inicial", estado: "Registrado", fecha: new Date(), createdById: supU?.id ?? null } });
  }

  console.log("Seed: fuentes de financiación y rubros…");
  const finU = await prisma.usuario.findUnique({ where: { correo: "financiera@siga.gov.co" } });
  const adminU2 = await prisma.usuario.findUnique({ where: { correo: "admin@siga.gov.co" } });
  const FUENTES: [string, string, string, number, string][] = [
    ["FUE-001", "Nación — Mindeporte", "Nación", 300000000, "2026"],
    ["FUE-002", "Recursos propios ESAL-JDEC", "Propios", 80000000, "2026"],
  ];
  const fuenteByCodigo: Record<string, number> = {};
  for (const [codigo, nombre, tipo, valorDisponible, vigencia] of FUENTES) {
    const f = await prisma.fuenteFinanciacion.upsert({
      where: { codigo },
      update: {},
      create: { codigo, nombre, tipo, valorDisponible, vigencia, estado: "Aprobada", createdById: finU?.id ?? null, aprobadoById: adminU2?.id ?? null, aprobadoEn: new Date() },
    });
    fuenteByCodigo[codigo] = f.id;
  }
  const RUBROS: [string, string, string, number][] = [
    ["RUB-001", "Operación escuelas deportivas", "FUE-001", 150000000],
    ["RUB-002", "Dotación e implementos", "FUE-002", 40000000],
  ];
  const rubroByCodigo: Record<string, number> = {};
  for (const [codigo, nombre, fuenteCod, valorAsignado] of RUBROS) {
    const r = await prisma.rubro.upsert({ where: { codigo }, update: {}, create: { codigo, nombre, fuenteId: fuenteByCodigo[fuenteCod], valorAsignado } });
    rubroByCodigo[codigo] = r.id;
  }

  console.log("Seed: póliza, cuenta de cobro y pago de muestra…");
  const c1b = await prisma.contrato.findUnique({ where: { numero: "CTO-2026-001" } });
  if (c1b) {
    const polEx = await prisma.poliza.findFirst({ where: { contratoId: c1b.id } });
    if (!polEx) {
      await prisma.poliza.create({
        data: {
          contratoId: c1b.id, tipo: "Cumplimiento", aseguradora: "Seguros Andinos",
          valor: 12000000, vigenciaDesde: new Date("2026-01-01"), vigenciaHasta: new Date("2026-12-31"),
          estado: "Aprobada", createdById: finU?.id ?? null, aprobadoById: adminU2?.id ?? null, aprobadoEn: new Date(),
        },
      });
    }
    const cuentaEx = await prisma.cuentaCobro.findFirst({ where: { contratoId: c1b.id, periodo: "2026-01" } });
    if (!cuentaEx) {
      const cta = await prisma.cuentaCobro.create({
        data: {
          contratoId: c1b.id, rubroId: rubroByCodigo["RUB-001"], periodo: "2026-01",
          valorCobrado: 10000000, valorAprobado: 10000000, estado: "Aprobada",
          createdById: finU?.id ?? null, aprobadoById: adminU2?.id ?? null, aprobadoEn: new Date(),
        },
      });
      await prisma.pago.create({ data: { cuentaCobroId: cta.id, valorPagado: 4000000, comprobante: "CE-0001", medioPago: "Transferencia", createdById: finU?.id ?? null } });
    }
  }

  console.log("Seed: indicadores físicos y avances…");
  const coordU = await prisma.usuario.findUnique({ where: { correo: "coord@siga.gov.co" } });
  const adminU3 = await prisma.usuario.findUnique({ where: { correo: "admin@siga.gov.co" } });
  const ind = await prisma.indicadorFisico.upsert({
    where: { codigo: "IND-001" },
    update: {},
    create: { codigo: "IND-001", nombre: "Beneficiarios activos en escuelas deportivas", unidad: "beneficiarios", programado: 500, periodo: "2026" },
  });
  const avEx = await prisma.avanceMeta.findFirst({ where: { indicadorId: ind.id, periodo: "2026-01" } });
  if (!avEx) {
    await prisma.avanceMeta.create({
      data: { indicadorId: ind.id, cantidadReportada: 120, cantidadAprobada: 120, estado: "Aprobado", periodo: "2026-01", createdById: coordU?.id ?? null, aprobadoById: adminU3?.id ?? null, aprobadoEn: new Date() },
    });
    await prisma.avanceMeta.create({
      data: { indicadorId: ind.id, cantidadReportada: 95, estado: "Reportado", periodo: "2026-02", createdById: coordU?.id ?? null },
    });
  }

  console.log("Seed: inventarios, dotación y lotes…");
  const infraU = await prisma.usuario.findUnique({ where: { correo: "supervisor@siga.gov.co" } }); // placeholder hasta sembrar Infraestructura
  const item1 = await prisma.item.upsert({ where: { codigo: "ITM-001" }, update: {}, create: { codigo: "ITM-001", nombre: "Balones de fútbol", categoria: "Deportivo", ubicacion: "Bodega central", cantidad: 80 } });
  await prisma.item.upsert({ where: { codigo: "ITM-002" }, update: {}, create: { codigo: "ITM-002", nombre: "Uniformes talla M", categoria: "Dotación", ubicacion: "Bodega central", cantidad: 150 } });
  const ben1 = await prisma.beneficiario.findFirst();
  if (ben1) {
    const dotEx = await prisma.dotacionEntrega.findFirst({ where: { beneficiarioId: ben1.id, itemId: item1.id } });
    if (!dotEx) await prisma.dotacionEntrega.create({ data: { beneficiarioId: ben1.id, itemId: item1.id, cantidad: 1, createdById: infraU?.id ?? null } });
  }
  await prisma.lote.upsert({ where: { codigo: "LOT-001" }, update: {}, create: { codigo: "LOT-001", direccion: "Vía Soacha - Sibaté km 3", area: 4500, territorio: "Soacha" } });

  console.log("Seed: escenarios, reservas y mantenimiento…");
  let esc1 = await prisma.escenario.findFirst({ where: { nombre: "Coliseo Municipal" } });
  if (!esc1) esc1 = await prisma.escenario.create({ data: { nombre: "Coliseo Municipal", tipo: "Coliseo", direccion: "Calle 10 # 5-20", capacidad: 800 } });
  const esc2 = await prisma.escenario.findFirst({ where: { nombre: "Cancha sintética La Esperanza" } });
  if (!esc2) await prisma.escenario.create({ data: { nombre: "Cancha sintética La Esperanza", tipo: "Cancha", direccion: "Barrio La Esperanza", capacidad: 50 } });

  const resEx = await prisma.reservaEscenario.findFirst({ where: { escenarioId: esc1.id } });
  if (!resEx) {
    await prisma.reservaEscenario.create({
      data: {
        escenarioId: esc1.id, tipoUso: "Entrenamiento", periodo: "2026-01",
        fechaInicio: new Date("2026-07-05T08:00:00"), fechaFin: new Date("2026-07-05T10:00:00"),
        estado: "Activa", createdById: infraU?.id ?? null,
      },
    });
  }
  const mantEx = await prisma.mantenimiento.findFirst({ where: { escenarioId: esc1.id } });
  if (!mantEx) {
    await prisma.mantenimiento.create({
      data: { escenarioId: esc1.id, tipo: "Programado", descripcion: "Mantenimiento de piso y graderías", fechaInicio: new Date("2026-06-01"), fechaFin: new Date("2026-06-03"), cerradoATiempo: true, costo: 2500000, estado: "Cerrado", createdById: infraU?.id ?? null },
    });
  }

  console.log("Seed: territorios…");
  const TERRITORIOS: [string, string, string, number, number, number][] = [
    ["TER-001", "Soacha", "Comuna 4", 450000, 4.5789, -74.2169],
    ["TER-002", "Bogotá", "Bosa", 700000, 4.6181, -74.1772],
  ];
  for (const [codigo, municipio, zona, poblacion, lat, lng] of TERRITORIOS) {
    await prisma.territorio.upsert({ where: { codigo }, update: {}, create: { codigo, municipio, zona, poblacion, lat, lng } });
  }

  console.log("Seed: evaluación ESAL y psicosocial…");
  const adminU4 = await prisma.usuario.findUnique({ where: { correo: "admin@siga.gov.co" } });
  const supU2 = await prisma.usuario.findUnique({ where: { correo: "supervisor@siga.gov.co" } });
  const tercero1 = await prisma.tercero.findFirst();
  if (tercero1) {
    const evEx = await prisma.evaluacionEsal.findFirst({ where: { terceroId: tercero1.id } });
    if (!evEx) {
      await prisma.evaluacionEsal.create({
        data: { terceroId: tercero1.id, criterio: "Capacidad operativa y experiencia", puntaje: 88, estado: "Aprobada", createdById: adminU4?.id ?? null, aprobadoById: supU2?.id ?? null, aprobadoEn: new Date() },
      });
    }
  }
  const ben2 = await prisma.beneficiario.findFirst({ skip: 1 });
  if (ben2) {
    const psicEx = await prisma.evaluacionPsicosocial.findFirst({ where: { beneficiarioId: ben2.id } });
    if (!psicEx) {
      await prisma.evaluacionPsicosocial.create({
        data: { beneficiarioId: ben2.id, fecha: new Date(), instrumento: "SUSESO-ISTAS21 adaptado", resultado: "Riesgo bajo", estado: "Revisada", createdById: adminU4?.id ?? null },
      });
    }
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
