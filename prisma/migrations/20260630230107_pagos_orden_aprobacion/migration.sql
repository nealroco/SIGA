-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pagos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cuentaCobroId" INTEGER NOT NULL,
    "valorPagado" REAL NOT NULL,
    "fechaPago" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comprobante" TEXT,
    "medioPago" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Ordenado',
    "motivoRechazo" TEXT,
    "createdById" INTEGER,
    "aprobadoById" INTEGER,
    "aprobadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_cuentaCobroId_fkey" FOREIGN KEY ("cuentaCobroId") REFERENCES "cuentas_cobro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pagos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pagos_aprobadoById_fkey" FOREIGN KEY ("aprobadoById") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pagos" ("comprobante", "createdAt", "createdById", "cuentaCobroId", "fechaPago", "id", "medioPago", "valorPagado") SELECT "comprobante", "createdAt", "createdById", "cuentaCobroId", "fechaPago", "id", "medioPago", "valorPagado" FROM "pagos";
DROP TABLE "pagos";
ALTER TABLE "new_pagos" RENAME TO "pagos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
