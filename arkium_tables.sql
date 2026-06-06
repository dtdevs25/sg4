-- =============================================================================
-- SG4 — TABELAS DE IMPORTAÇÃO ARKIUM
-- Execute este script diretamente no banco PostgreSQL do SG4.
-- Criado em: 2026-06-06
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABELA 1: arkium_inspecoes
-- Armazena os registros importados da planilha Arkium de INSPEÇÕES DE SEGURANÇA.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arkium_inspecoes (
  id                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Dados vindos do Excel Arkium
  numero               TEXT        NOT NULL,          -- Numero da inspeção no Arkium
  resultado            TEXT,                          -- Ex: "Conforme", "Não conforme"
  data_abertura        TEXT,                          -- Data de abertura (string do Excel)
  data_fechamento      TEXT,                          -- Data de fechamento (string do Excel)
  matricula_auditor    TEXT,                          -- Ex: "SG4-123"
  nome_auditor         TEXT,                          -- Nome do técnico/auditor
  identificador_objeto TEXT,                          -- ID do objeto auditado
  nome_questionario    TEXT,                          -- Nome do checklist/questionário
  cliente_objeto       TEXT,                          -- Cliente/empresa auditada
  localidade_objeto    TEXT,                          -- Local físico
  autocheck            TEXT,                          -- Campo autocheck do Arkium
  observacao           TEXT,                          -- Observações gerais

  -- Status de tratamento
  status               TEXT        NOT NULL DEFAULT 'ABERTO'
                        CHECK (status IN ('ABERTO', 'FECHADO')),

  -- Vínculo com técnico interno (opcional — matching pelo nome)
  tecnico_id           TEXT        REFERENCES tecnicos(id) ON DELETE SET NULL,

  -- Controle interno
  importado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  importado_por        TEXT                           -- userId de quem importou
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_arkium_inspecoes_numero
  ON arkium_inspecoes (numero);

CREATE INDEX IF NOT EXISTS idx_arkium_inspecoes_status
  ON arkium_inspecoes (status);

CREATE INDEX IF NOT EXISTS idx_arkium_inspecoes_matricula
  ON arkium_inspecoes (matricula_auditor);

CREATE INDEX IF NOT EXISTS idx_arkium_inspecoes_tecnico
  ON arkium_inspecoes (tecnico_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABELA 2: arkium_dss
-- Armazena os registros importados da planilha Arkium de DIÁLOGOS DE SEGURANÇA (DSS).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arkium_dss (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Dados vindos do Excel Arkium DSS
  numero_dialogo    TEXT        NOT NULL,             -- Número único do diálogo
  assunto           TEXT,                             -- Tema/assunto do DSS
  lider             TEXT,                             -- Nome do líder responsável
  base              TEXT,                             -- Base/unidade
  uf                TEXT,                             -- Estado
  localidade        TEXT,                             -- Cidade/localidade
  data_fechamento   TEXT,                             -- Data de fechamento (string)
  matricula         TEXT,                             -- Matrícula do técnico (ex: SG4-xxx)
  nome              TEXT,                             -- Nome do participante/técnico
  tipo              TEXT,                             -- Tipo de DSS
  status_dss        TEXT,                             -- Status vindo do Arkium
  assinado          TEXT,                             -- "Sim" / "Não"
  justificativa     TEXT,                             -- Justificativa caso não assinado

  -- Status de tratamento interno
  estado            TEXT        NOT NULL DEFAULT 'ABERTO'
                    CHECK (estado IN ('ABERTO', 'FECHADO')),

  -- Vínculo com técnico interno
  tecnico_id        TEXT        REFERENCES tecnicos(id) ON DELETE SET NULL,

  -- Controle interno
  importado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  importado_por     TEXT                              -- userId de quem importou
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_arkium_dss_numero_matricula
  ON arkium_dss (numero_dialogo, matricula);

CREATE INDEX IF NOT EXISTS idx_arkium_dss_estado
  ON arkium_dss (estado);

CREATE INDEX IF NOT EXISTS idx_arkium_dss_matricula
  ON arkium_dss (matricula);

CREATE INDEX IF NOT EXISTS idx_arkium_dss_tecnico
  ON arkium_dss (tecnico_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: atualiza 'atualizado_em' automaticamente em UPDATE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_arkium_inspecoes_updated ON arkium_inspecoes;
CREATE TRIGGER trg_arkium_inspecoes_updated
  BEFORE UPDATE ON arkium_inspecoes
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

DROP TRIGGER IF EXISTS trg_arkium_dss_updated ON arkium_dss;
CREATE TRIGGER trg_arkium_dss_updated
  BEFORE UPDATE ON arkium_dss
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
