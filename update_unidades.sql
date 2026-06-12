-- 1. Tabela Unidades
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "responsavel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- Criar restrição de valor único para o nome da Unidade
CREATE UNIQUE INDEX "unidades_nome_key" ON "unidades"("nome");

-- 2. Tabela de Relacionamento N:M implícito do Prisma (Tecnico <-> Unidade)
CREATE TABLE "_TecnicoToUnidade" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Criar índices para a tabela de relacionamento
CREATE UNIQUE INDEX "_TecnicoToUnidade_AB_unique" ON "_TecnicoToUnidade"("A", "B");
CREATE INDEX "_TecnicoToUnidade_B_index" ON "_TecnicoToUnidade"("B");

-- Criar chaves estrangeiras com ação de deleção em cascata
ALTER TABLE "_TecnicoToUnidade" ADD CONSTRAINT "_TecnicoToUnidade_A_fkey" FOREIGN KEY ("A") REFERENCES "tecnicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TecnicoToUnidade" ADD CONSTRAINT "_TecnicoToUnidade_B_fkey" FOREIGN KEY ("B") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
