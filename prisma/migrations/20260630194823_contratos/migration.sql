-- CreateTable
CREATE TABLE "terceros" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documento" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ESAL',
    "estado" TEXT NOT NULL DEFAULT 'Activo'
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "terceroId" INTEGER NOT NULL,
    "valorTotal" REAL NOT NULL DEFAULT 0,
    "fechaInicio" DATETIME,
    "fechaFin" DATETIME,
    "supervisor" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Registrado',
    "motivoRechazo" TEXT,
    "createdById" INTEGER,
    "aprobadoById" INTEGER,
    "aprobadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contratos_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "terceros" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contratos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contratos_aprobadoById_fkey" FOREIGN KEY ("aprobadoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "terceros_documento_key" ON "terceros"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numero_key" ON "contratos"("numero");
