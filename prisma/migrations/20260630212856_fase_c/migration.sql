-- CreateTable
CREATE TABLE "indicadores_fisicos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT,
    "programado" REAL NOT NULL DEFAULT 0,
    "periodo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "avances_meta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "indicadorId" INTEGER NOT NULL,
    "cantidadReportada" REAL NOT NULL,
    "cantidadAprobada" REAL,
    "estado" TEXT NOT NULL DEFAULT 'Reportado',
    "periodo" TEXT,
    "motivoRechazo" TEXT,
    "createdById" INTEGER,
    "aprobadoById" INTEGER,
    "aprobadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "avances_meta_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "indicadores_fisicos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "avances_meta_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "avances_meta_aprobadoById_fkey" FOREIGN KEY ("aprobadoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analisis_impacto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "periodo" TEXT NOT NULL,
    "gastoEjecutado" REAL NOT NULL DEFAULT 0,
    "cumplimientoFisico" REAL NOT NULL DEFAULT 0,
    "ejecucionFinanciera" REAL NOT NULL DEFAULT 0,
    "desviacion" REAL NOT NULL DEFAULT 0,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analisis_impacto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "indicadores_fisicos_codigo_key" ON "indicadores_fisicos"("codigo");
