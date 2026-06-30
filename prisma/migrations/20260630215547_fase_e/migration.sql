-- AlterTable
ALTER TABLE "escenarios" ADD COLUMN "lat" REAL;
ALTER TABLE "escenarios" ADD COLUMN "lng" REAL;

-- CreateTable
CREATE TABLE "territorios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "zona" TEXT,
    "poblacion" INTEGER,
    "lat" REAL,
    "lng" REAL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "territorios_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluaciones_esal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "terceroId" INTEGER NOT NULL,
    "convocatoriaId" INTEGER,
    "criterio" TEXT,
    "puntaje" REAL,
    "estado" TEXT NOT NULL DEFAULT 'Registrada',
    "motivoRechazo" TEXT,
    "createdById" INTEGER,
    "aprobadoById" INTEGER,
    "aprobadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluaciones_esal_terceroId_fkey" FOREIGN KEY ("terceroId") REFERENCES "terceros" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evaluaciones_esal_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "convocatorias" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "evaluaciones_esal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "evaluaciones_esal_aprobadoById_fkey" FOREIGN KEY ("aprobadoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluaciones_psicosociales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beneficiarioId" INTEGER NOT NULL,
    "fecha" DATETIME,
    "instrumento" TEXT,
    "resultado" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Registrada',
    "observacion" TEXT,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluaciones_psicosociales_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "beneficiarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evaluaciones_psicosociales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "territorios_codigo_key" ON "territorios"("codigo");
