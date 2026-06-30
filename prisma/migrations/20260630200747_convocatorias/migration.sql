-- CreateTable
CREATE TABLE "convocatorias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Beneficiarios',
    "descripcion" TEXT,
    "cupos" INTEGER NOT NULL DEFAULT 0,
    "fechaApertura" DATETIME,
    "fechaCierre" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'Abierta',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "convocatorias_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "selecciones_beneficiario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "convocatoriaId" INTEGER NOT NULL,
    "beneficiarioId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Propuesto',
    "propuestoById" INTEGER,
    "aprobadoById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "selecciones_beneficiario_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "convocatorias" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "selecciones_beneficiario_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "beneficiarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "selecciones_beneficiario_propuestoById_fkey" FOREIGN KEY ("propuestoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "selecciones_beneficiario_aprobadoById_fkey" FOREIGN KEY ("aprobadoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "selecciones_beneficiario_convocatoriaId_beneficiarioId_key" ON "selecciones_beneficiario"("convocatoriaId", "beneficiarioId");
