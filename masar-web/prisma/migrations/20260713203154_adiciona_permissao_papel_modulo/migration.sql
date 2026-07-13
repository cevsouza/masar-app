-- CreateTable
CREATE TABLE "PermissaoPapelModulo" (
    "id" TEXT NOT NULL,
    "role" "RoleUsuario" NOT NULL,
    "modulo" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PermissaoPapelModulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermissaoPapelModulo_role_modulo_key" ON "PermissaoPapelModulo"("role", "modulo");
