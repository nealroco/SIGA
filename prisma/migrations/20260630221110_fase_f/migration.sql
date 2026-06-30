-- CreateTable
CREATE TABLE "actas_comite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tema" TEXT NOT NULL,
    "decision" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Registrada',
    "motivoRechazo" TEXT,
    "createdById" INTEGER,
    "aprobadoById" INTEGER,
    "aprobadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "actas_comite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "actas_comite_aprobadoById_fkey" FOREIGN KEY ("aprobadoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "comunicaciones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL DEFAULT 'Interna',
    "canal" TEXT,
    "asunto" TEXT NOT NULL,
    "contenido" TEXT,
    "publico" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Borrador',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comunicaciones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipoEvento" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'Sistema',
    "destinatario" TEXT,
    "mensaje" TEXT NOT NULL,
    "estadoEnvio" TEXT NOT NULL DEFAULT 'Pendiente',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notificaciones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hallazgos_auditoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modulo" TEXT,
    "descripcion" TEXT NOT NULL,
    "gravedad" TEXT NOT NULL DEFAULT 'Media',
    "estado" TEXT NOT NULL DEFAULT 'Abierto',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hallazgos_auditoria_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accesos_emergencia_iam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER,
    "motivo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accesos_emergencia_iam_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "configuracion_cloud" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "actualizadoById" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "configuracion_cloud_actualizadoById_fkey" FOREIGN KEY ("actualizadoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_cloud_clave_key" ON "configuracion_cloud"("clave");
