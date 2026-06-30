-- CreateTable
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo'
);

-- CreateTable
CREATE TABLE "modulos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "esBase" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'Activo'
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rolId" INTEGER NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "nivel" TEXT NOT NULL,
    CONSTRAINT "permisos_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "permisos_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "modulos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rolId" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "ultimoAcceso" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "registroId" TEXT,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "ip" TEXT,
    "fechaHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "beneficiarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "edad" INTEGER,
    "sexo" TEXT,
    "programa" TEXT,
    "territorio" TEXT,
    "acudiente" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "modulos_codigo_key" ON "modulos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_rolId_moduloId_key" ON "permisos"("rolId", "moduloId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiarios_documento_key" ON "beneficiarios"("documento");
