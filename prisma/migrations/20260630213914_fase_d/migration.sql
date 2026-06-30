-- CreateTable
CREATE TABLE "items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "ubicacion" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dotacion_entregas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beneficiarioId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "fechaEntrega" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'Entregada',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dotacion_entregas_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "beneficiarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dotacion_entregas_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dotacion_entregas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "direccion" TEXT,
    "area" REAL,
    "territorio" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "escenarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "direccion" TEXT,
    "capacidad" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "escenarios_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reservas_escenario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "escenarioId" INTEGER NOT NULL,
    "tipoUso" TEXT,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activa',
    "periodo" TEXT,
    "esEmergencia" BOOLEAN NOT NULL DEFAULT false,
    "motivoEmergencia" TEXT,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reservas_escenario_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reservas_escenario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "log_conflictos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "escenarioId" INTEGER NOT NULL,
    "reservaExistenteId" INTEGER,
    "tipo" TEXT NOT NULL,
    "fechaIntentoInicio" DATETIME,
    "fechaIntentoFin" DATETIME,
    "motivo" TEXT,
    "usuarioId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "log_conflictos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mantenimientos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "escenarioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Programado',
    "descripcion" TEXT,
    "fechaInicio" DATETIME,
    "fechaFin" DATETIME,
    "cerradoATiempo" BOOLEAN,
    "costo" REAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'Programado',
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mantenimientos_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mantenimientos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "items_codigo_key" ON "items"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_codigo_key" ON "lotes"("codigo");
