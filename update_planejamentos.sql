-- 1. Criar Tipos Enum para Planejamento
CREATE TYPE "PrioridadePlanejamento" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');
CREATE TYPE "StatusPlanejamento" AS ENUM ('PENDENTE', 'CONCLUIDO', 'CANCELADO');

-- 2. Criar a Tabela
CREATE TABLE "planejamentos" (
    "id" TEXT NOT NULL,
    "tecnicoId" TEXT NOT NULL,
    "dataAtividade" TIMESTAMP(3) NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricaoOriginal" TEXT NOT NULL,
    "descricaoExecutada" TEXT,
    "alteradaOriginal" BOOLEAN NOT NULL DEFAULT false,
    "equipe" TEXT,
    "local" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "prioridade" "PrioridadePlanejamento" NOT NULL DEFAULT 'MEDIA',
    "status" "StatusPlanejamento" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planejamentos_pkey" PRIMARY KEY ("id")
);

-- 3. Índices para performance
CREATE INDEX "planejamentos_tecnicoId_idx" ON "planejamentos"("tecnicoId");
CREATE INDEX "planejamentos_dataAtividade_idx" ON "planejamentos"("dataAtividade");

-- 4. Chave estrangeira
ALTER TABLE "planejamentos" ADD CONSTRAINT "planejamentos_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "tecnicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
