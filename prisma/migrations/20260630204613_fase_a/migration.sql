-- CreateTable
CREATE TABLE "personal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "perfil" TEXT,
    "tipoVinculacion" TEXT,
    "fechaIngreso" DATETIME,
    "correo" TEXT,
    "telefono" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "seguimientos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beneficiarioId" INTEGER NOT NULL,
    "programa" TEXT,
    "fecha" DATETIME,
    "actividad" TEXT NOT NULL,
    "observacion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Registrado',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seguimientos_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "beneficiarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "seguimientos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "informes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contratoId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "fechaRadicacion" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'Radicado',
    "observacion" TEXT,
    "periodoCerrado" BOOLEAN NOT NULL DEFAULT false,
    "certificadoGenerado" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "informes_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "informes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contratoId" INTEGER NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "archivoUrl" TEXT,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documentos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "versiones_documento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documentoId" INTEGER NOT NULL,
    "archivoUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "usuarioCarga" TEXT,
    "nota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "versiones_documento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_documento_key" ON "personal"("documento");
