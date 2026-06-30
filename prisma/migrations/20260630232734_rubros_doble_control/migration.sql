-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_rubros" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fuenteId" INTEGER NOT NULL,
    "valorAsignado" REAL NOT NULL DEFAULT 0,
    "vigencia" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Registrado',
    "motivoRechazo" TEXT,
    "createdById" INTEGER,
    "aprobadoById" INTEGER,
    "aprobadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rubros_fuenteId_fkey" FOREIGN KEY ("fuenteId") REFERENCES "fuentes_financiacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rubros_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "rubros_aprobadoById_fkey" FOREIGN KEY ("aprobadoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_rubros" ("codigo", "createdAt", "fuenteId", "id", "nombre", "valorAsignado", "vigencia") SELECT "codigo", "createdAt", "fuenteId", "id", "nombre", "valorAsignado", "vigencia" FROM "rubros";
DROP TABLE "rubros";
ALTER TABLE "new_rubros" RENAME TO "rubros";
CREATE UNIQUE INDEX "rubros_codigo_key" ON "rubros"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
