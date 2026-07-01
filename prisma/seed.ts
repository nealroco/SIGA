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
    ["Admin SIGA", "admin@sigadeportes.co", "Administrador"],
    ["Carolina Revisora", "revisor@sigadeportes.co", "Revisor"],
    ["Coord. Deportiva", "coord@sigadeportes.co", "Coord. deportiva"],
    ["Fernanda Financiera", "financiera@sigadeportes.co", "Financiera"],
    ["Sergio Supervisor", "supervisor@sigadeportes.co", "Supervisor"],
    ["Óscar Operador", "operador@sigadeportes.co", "Operador"],
    ["Elena Entrenadora", "entrenador@sigadeportes.co", "Entrenador"],
    ["Iván Infraestructura", "infraestructura@sigadeportes.co", "Infraestructura"],
    ["Tatiana Tecnología", "tecnologia@sigadeportes.co", "Tecnología"],
  ];
  for (const [nombre, correo, rol] of usuarios) {
    await prisma.usuario.upsert({
      where: { correo },
      update: { nombre, rolId: rolesById[rol] },
      create: { nombre, correo, passwordHash: hash, rolId: rolesById[rol] },
    });
  }

  console.log("Seed: territorios…");
  const TERRITORIOS: [string, string, string, number, number, number][] = [
    ["TER-001", "Soacha", "Comuna 4", 450000, 4.5789, -74.2169],
    ["TER-002", "Bogotá", "Bosa", 700000, 4.6181, -74.1772],
    ["TER-003", "Girardot", "Centro", 105000, 4.3033, -74.8014],
    ["TER-004", "Fusagasugá", "Norte", 140000, 4.3453, -74.3644],
    ["TER-005", "Zipaquirá", "Centro", 130000, 5.0225, -74.0067],
    ["TER-006", "Chía", "La Balsa", 145000, 4.8615, -74.0356],
  ];
  const territorioByMunicipio: Record<string, number> = {};
  for (const [codigo, municipio, zona, poblacion, lat, lng] of TERRITORIOS) {
    const t = await prisma.territorio.upsert({ where: { codigo }, update: {}, create: { codigo, municipio, zona, poblacion, lat, lng } });
    territorioByMunicipio[municipio] = t.id;
  }

  console.log("Seed: beneficiarios de muestra…");
  for (const [documento, nombre, edad, sexo, programa, territorio, acudiente] of BENEFICIARIOS) {
    const municipio = String(territorio).split("—")[0].trim();
    await prisma.beneficiario.upsert({
      where: { documento: documento as string },
      update: {},
      create: {
        documento: documento as string,
        nombre: nombre as string,
        edad: edad as number,
        sexo: sexo as string,
        programa: programa as string,
        territorioId: territorioByMunicipio[municipio] ?? null,
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
  const fin = await prisma.usuario.findUnique({ where: { correo: "financiera@sigadeportes.co" } });
  const adminU = await prisma.usuario.findUnique({ where: { correo: "admin@sigadeportes.co" } });
  const CONTRATOS: [string, string, string, number, string, string][] = [
    ["CTO-2026-001", "Operación de escuelas de fútbol — Soacha", "8001234567", 120000000, "Registrado", "Soacha"],
    ["CTO-2026-002", "Dotación deportiva para programas de atletismo", "9009876543", 85000000, "Aprobado", "Bogotá"],
    ["CTO-2026-003", "Servicios profesionales de seguimiento", "79123456", 36000000, "Registrado", "Fusagasugá"],
  ];
  for (const [numero, objeto, terceroDoc, valorTotal, estado, municipio] of CONTRATOS) {
    const data = {
      numero,
      objeto,
      terceroId: terceroByDoc[terceroDoc],
      territorioId: territorioByMunicipio[municipio] ?? null,
      valorTotal,
      estado,
      createdById: fin?.id ?? null,
      aprobadoById: estado === "Aprobado" ? adminU?.id ?? null : null,
      aprobadoEn: estado === "Aprobado" ? new Date() : null,
    };
    await prisma.contrato.upsert({ where: { numero }, update: { territorioId: data.territorioId }, create: data });
  }

  console.log("Seed: convocatorias…");
  const sup = await prisma.usuario.findUnique({ where: { correo: "supervisor@sigadeportes.co" } });
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
  const operU = await prisma.usuario.findUnique({ where: { correo: "operador@sigadeportes.co" } });
  const supUPersonal = await prisma.usuario.findUnique({ where: { correo: "supervisor@sigadeportes.co" } });
  const PERSONAL: [string, string, string, string, string, string][] = [
    ["52111222", "Diana Torres", "Profesional de apoyo", "Administrativa", "Contratista", "Aprobado"],
    ["80333444", "Carlos Méndez", "Coordinador de programa", "Deportiva", "OPS", "Pendiente"],
    ["43555666", "Lucía Ramírez", "Entrenadora", "Deportiva", "OPS", "Pendiente"],
  ];
  for (const [documento, nombre, cargo, perfil, tipoVinculacion, estadoAprobacion] of PERSONAL) {
    await prisma.personal.upsert({
      where: { documento },
      update: {},
      create: {
        documento, nombre, cargo, perfil, tipoVinculacion, estadoAprobacion,
        createdById: operU?.id ?? null,
        aprobadoById: estadoAprobacion === "Aprobado" ? supUPersonal?.id ?? null : null,
        aprobadoEn: estadoAprobacion === "Aprobado" ? new Date() : null,
      },
    });
  }

  console.log("Seed: expediente documental + informe + seguimiento…");
  const supU = await prisma.usuario.findUnique({ where: { correo: "supervisor@sigadeportes.co" } });
  const tecU = await prisma.usuario.findUnique({ where: { correo: "tecnologia@sigadeportes.co" } });
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
      if (!ex) await prisma.documento.create({ data: { contratoId: c1.id, tipoDocumento, obligatorio, estado, createdById: tecU?.id ?? null } });
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
  const finU = await prisma.usuario.findUnique({ where: { correo: "financiera@sigadeportes.co" } });
  const adminU2 = await prisma.usuario.findUnique({ where: { correo: "admin@sigadeportes.co" } });
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
    const r = await prisma.rubro.upsert({
      where: { codigo },
      update: {},
      create: { codigo, nombre, fuenteId: fuenteByCodigo[fuenteCod], valorAsignado, estado: "Aprobado", createdById: finU?.id ?? null, aprobadoById: adminU2?.id ?? null, aprobadoEn: new Date() },
    });
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
      await prisma.pago.create({ data: { cuentaCobroId: cta.id, valorPagado: 4000000, comprobante: "CE-0001", medioPago: "Orden bancaria", estado: "Aprobado", createdById: finU?.id ?? null, aprobadoById: adminU2?.id ?? null, aprobadoEn: new Date() } });
    }
  }

  console.log("Seed: indicadores físicos y avances…");
  const coordU = await prisma.usuario.findUnique({ where: { correo: "coord@sigadeportes.co" } });
  const adminU3 = await prisma.usuario.findUnique({ where: { correo: "admin@sigadeportes.co" } });
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
  const infraU = await prisma.usuario.findUnique({ where: { correo: "infraestructura@sigadeportes.co" } });
  const item1 = await prisma.item.upsert({ where: { codigo: "ITM-001" }, update: {}, create: { codigo: "ITM-001", nombre: "Balones de fútbol", categoria: "Deportivo", ubicacion: "Bodega central", cantidad: 80 } });
  await prisma.item.upsert({ where: { codigo: "ITM-002" }, update: {}, create: { codigo: "ITM-002", nombre: "Uniformes talla M", categoria: "Dotación", ubicacion: "Bodega central", cantidad: 150 } });
  const ben1 = await prisma.beneficiario.findFirst();
  if (ben1) {
    const dotEx = await prisma.dotacionEntrega.findFirst({ where: { beneficiarioId: ben1.id, itemId: item1.id } });
    if (!dotEx) await prisma.dotacionEntrega.create({ data: { beneficiarioId: ben1.id, itemId: item1.id, cantidad: 1, createdById: infraU?.id ?? null } });
  }
  await prisma.lote.upsert({ where: { codigo: "LOT-001" }, update: {}, create: { codigo: "LOT-001", direccion: "Vía Soacha - Sibaté km 3", area: 4500, territorioId: territorioByMunicipio["Soacha"] ?? null } });

  console.log("Seed: escenarios, reservas y mantenimiento…");
  const geoEsc1 = { lat: territorioByMunicipio["Soacha"] ? 4.5801 : null, lng: territorioByMunicipio["Soacha"] ? -74.2158 : null, territorioId: territorioByMunicipio["Soacha"] ?? null };
  const geoEsc2 = { lat: territorioByMunicipio["Bogotá"] ? 4.6193 : null, lng: territorioByMunicipio["Bogotá"] ? -74.1786 : null, territorioId: territorioByMunicipio["Bogotá"] ?? null };
  let esc1 = await prisma.escenario.findFirst({ where: { nombre: "Coliseo Municipal" } });
  if (!esc1) esc1 = await prisma.escenario.create({ data: { nombre: "Coliseo Municipal", tipo: "Coliseo", direccion: "Calle 10 # 5-20", capacidad: 800, ...geoEsc1 } });
  else await prisma.escenario.update({ where: { id: esc1.id }, data: geoEsc1 });
  const esc2 = await prisma.escenario.findFirst({ where: { nombre: "Cancha sintética La Esperanza" } });
  if (!esc2) await prisma.escenario.create({ data: { nombre: "Cancha sintética La Esperanza", tipo: "Cancha", direccion: "Barrio La Esperanza", capacidad: 50, ...geoEsc2 } });
  else await prisma.escenario.update({ where: { id: esc2.id }, data: geoEsc2 });

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

  console.log("Seed: evaluación ESAL y psicosocial…");
  const adminU4 = await prisma.usuario.findUnique({ where: { correo: "admin@sigadeportes.co" } });
  const supU2 = await prisma.usuario.findUnique({ where: { correo: "supervisor@sigadeportes.co" } });
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
        data: { beneficiarioId: ben2.id, fecha: new Date(), instrumento: "SUSESO-ISTAS21 adaptado", resultado: "Riesgo bajo", nivelRiesgo: "Bajo", estado: "Revisada", createdById: adminU4?.id ?? null },
      });
    }
  }

  console.log("Seed: comité, comunicaciones y notificaciones…");
  const supU3 = await prisma.usuario.findUnique({ where: { correo: "supervisor@sigadeportes.co" } });
  const adminU5 = await prisma.usuario.findUnique({ where: { correo: "admin@sigadeportes.co" } });
  const c1acta = await prisma.contrato.findUnique({ where: { numero: "CTO-2026-001" } });
  const actaEx = await prisma.actaComite.findFirst();
  if (!actaEx) {
    await prisma.actaComite.create({
      data: { tema: "Revisión de avance trimestral", decision: "Se aprueba continuar con el cronograma vigente.", contratoId: c1acta?.id ?? null, estado: "Aprobada", createdById: supU3?.id ?? null, aprobadoById: adminU5?.id ?? null, aprobadoEn: new Date() },
    });
  }
  const convApertura = await prisma.convocatoria.findFirst({ where: { nombre: "Convocatoria Escuelas Deportivas 2026-1" } });
  const comEx = await prisma.comunicacion.findFirst();
  if (!comEx) {
    await prisma.comunicacion.create({ data: { tipo: "Interna", canal: "Correo", asunto: "Apertura de convocatoria 2026-1", contenido: "Se informa la apertura de la convocatoria de escuelas deportivas.", publico: "Coordinadores territoriales", convocatoriaId: convApertura?.id ?? null, estado: "Enviada", createdById: adminU5?.id ?? null } });
  }
  const notifEx = await prisma.notificacion.findFirst();
  if (!notifEx) {
    await prisma.notificacion.create({ data: { tipoEvento: "RN-025", canal: "Sistema", destinatario: "Administrador", mensaje: "Contrato CTO-2026-002 pendiente de aprobación.", estadoEnvio: "Enviada", createdById: adminU5?.id ?? null } });
  }

  console.log("Seed: configuración cloud…");
  const CONFIG: [string, string, string][] = [
    ["respaldo_automatico", "Activo", "Respaldo diario de la base de datos"],
    ["almacenamiento_usado_gb", "12.4", "Uso actual de almacenamiento de documentos"],
    ["proveedor", "Local (dev) — pendiente VPS/Hostinger en producción", "Infraestructura de hosting"],
  ];
  for (const [clave, valor, descripcion] of CONFIG) {
    await prisma.configuracionCloud.upsert({ where: { clave }, update: {}, create: { clave, valor, descripcion, actualizadoById: adminU5?.id ?? null } });
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
