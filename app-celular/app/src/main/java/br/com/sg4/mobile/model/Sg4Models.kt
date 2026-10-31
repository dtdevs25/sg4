package br.com.sg4.mobile.model

enum class MobileTab(val title: String) {
    HOME("Painel"),
    AGENDA("Agenda"),
    KM("KM"),
    RELATORIOS("Relatórios")
}

data class LoginRequest(
    val email: String,
    val password: String = "",
    val action: String? = null
)

data class LoginResponse(
    val success: Boolean = false,
    val token: String? = null,
    val error: String? = null,
    val message: String? = null,
    val user: MobileUserDto? = null
)

data class MobileUserDto(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "TST",
    val tecnicoId: String? = null,
    val tecnico: TecnicoProfileDto? = null
)

data class TecnicoProfileDto(
    val id: String = "",
    val nome: String = "",
    val email: String? = null,
    val telefone: String? = null,
    val cargo: String = "Técnico de Segurança do Trabalho",
    val fotoUrl: String? = null,
    val veiculo: String? = null,
    val matriculaArkium: String? = null,
    val matriculaVivo: String? = null,
    val orcamentoAbastecimento: Double = 800.0,
    val baseFixaNome: String? = null,
    val unidades: List<String> = emptyList()
)

data class UnidadeDto(
    val id: String = "",
    val nome: String = "",
    val cidade: String = "",
    val estado: String = "SP"
)

data class MonthlyStatDto(
    val year: Int = 2026,
    val month: Int = 1,
    val dssCount: Int = 0,
    val dssMeta: Int = 8,
    val inspecoesCount: Int = 0,
    val inspecoesMeta: Int = 20,
    val relatoriosCount: Int = 0,
    val ncTotal: Int = 0,
    val ncAbertas: Int = 0,
    val ncFechadas: Int = 0,
    val kmTotal: Double = 0.0
)

data class DashboardSummaryDto(
    val mesReferencia: String = "",
    val dssRealizadosMes: Int = 0,
    val dssMetaMes: Int = 8,
    val inspecoesRealizadasMes: Int = 0,
    val inspecoesMetaMes: Int = 20,
    val relatoriosMes: Int = 0,
    val ncAbertasMes: Int = 0,
    val ncFechadasMes: Int = 0,
    val ncTotalMes: Int = 0,
    val orcamentoBase: Double = 800.0,
    val gastoMes: Double = 0.0,
    val recargasMes: Double = 0.0,
    val saldoAbastecimento: Double = 800.0,
    val kmRodadosMes: Double = 0.0,
    val ncPendentesCount: Int = 0,
    val atividadesPendentesCount: Int = 0,
    val docsVencidosOuAVencer: Int = 0
)

data class ChecklistItemDto(
    val id: String = "",
    val hora: String? = "08:00",
    val titulo: String? = "",
    val texto: String = "",
    val categoria: String? = "",
    val equipe: String? = "Individual",
    val local: String? = "",
    val cidade: String? = "",
    val estado: String? = "SP",
    val concluido: Boolean = false,
    val concluidoEm: String? = null,
    val descricaoExecutada: String? = null,
    val fotoUrl: String? = null
)

data class PlanejamentoDto(
    val id: String = "",
    val tecnicoId: String = "",
    val tecnicoNome: String = "",
    val dataAtividade: String = "",
    val hora: String = "08:00",
    val titulo: String = "",
    val categoria: String = "",
    val descricaoOriginal: String = "",
    val descricaoExecutada: String = "",
    val observacoes: String = "",
    val alteradaOriginal: Boolean = false,
    val equipe: String = "Individual",
    val local: String = "",
    val cidade: String = "",
    val estado: String = "SP",
    val prioridade: String = "MEDIA",
    val status: String = "PENDENTE",
    val checklist: List<ChecklistItemDto> = emptyList()
)

data class QuilometragemDto(
    val id: String = "",
    val tecnicoId: String = "",
    val tecnicoNome: String = "",
    val diaSemana: String = "",
    val dataInicial: String = "",
    val kmInicial: Double = 0.0,
    val fotoInicial: String? = null,
    val dataFinal: String? = null,
    val kmFinal: Double? = null,
    val fotoFinal: String? = null,
    val diferenca: Double? = null,
    val latitudeInicial: Double? = null,
    val longitudeInicial: Double? = null,
    val latitudeFinal: Double? = null,
    val longitudeFinal: Double? = null
)

data class AbastecimentoDto(
    val id: String = "",
    val tecnicoId: String = "",
    val tecnicoNome: String = "",
    val data: String = "",
    val valor: Double = 0.0,
    val tipo: String = "ABASTECIMENTO",
    val fotoCupom: String? = null
)

data class ManutencaoDto(
    val id: String = "",
    val tecnicoId: String = "",
    val tecnicoNome: String = "",
    val kmManutencao: Int = 0,
    val dataManutencao: String = "",
    val descricao: String? = null,
    val comprovanteUrl: String? = null
)

data class RelatorioCampoDto(
    val id: String = "",
    val tecnicoId: String = "",
    val tecnicoNome: String = "",
    val data: String = "",
    val empresa: String = "Telefônica Brasil S.A",
    val projeto: String = "VIVO",
    val local: String = "",
    val cidadeUf: String = "",
    val descricao: String = "",
    val fotoUrl: String? = null
)

data class RelatorioPdfDto(
    val id: String = "",
    val nomeArquivo: String = "",
    val url: String = "",
    val tamanhoBytes: Long = 0L,
    val tecnicoId: String? = null,
    val mesAno: String = "",
    val elaborador: String = "",
    val createdAt: String = ""
)

data class DssAliadoDto(
    val id: String = "",
    val tecnicoId: String = "",
    val tecnicoNome: String = "",
    val data: String = "",
    val tema: String = "",
    val fotoUrl: String? = null
)

data class NcUpdateDto(
    val date: String = "",
    val actionDate: String? = null,
    val text: String = "",
    val author: String = "",
    val fotoUrl: String? = null
)

data class NaoConformidadeDto(
    val id: String = "",
    val originalId: String = "",
    val executor: String = "",
    val tecnicoId: String? = null,
    val pergunta: String = "",
    val resposta: String = "",
    val classificacao: String = "Média",
    val localidade: String = "",
    val base: String = "",
    val questionario: String = "",
    val dataAbertura: String? = null,
    val status: String = "PENDENTE_NAO_VENCIDA",
    val updates: List<NcUpdateDto> = emptyList()
)

data class DocumentoDto(
    val id: String = "",
    val tecnicoId: String = "",
    val tecnicoNome: String = "",
    val tipoNome: String = "",
    val titulo: String = "",
    val arquivoUrl: String = "",
    val arquivoNome: String = "",
    val dataEmissao: String = "",
    val dataVencimento: String? = null,
    val status: String = "VALIDO"
)

data class ReuniaoDto(
    val id: String = "",
    val tecnicoId: String = "",
    val tecnicoNome: String = "",
    val data: String = "",
    val horaFim: String = "",
    val assunto: String = "",
    val presenca: String = "PRESENTE",
    val pontualidade: String = "PONTUAL",
    val justificada: String = "NAO_SE_APLICA",
    val motivo: String = ""
)

data class MobileSyncResponse(
    val success: Boolean = false,
    val syncedAt: String = "",
    val user: MobileUserDto? = null,
    val currentTecnico: TecnicoProfileDto? = null,
    val tecnicos: List<TecnicoProfileDto> = emptyList(),
    val unidades: List<UnidadeDto> = emptyList(),
    val availableYears: List<String> = emptyList(),
    val monthlyStats: List<MonthlyStatDto> = emptyList(),
    val summary: DashboardSummaryDto = DashboardSummaryDto(),
    val planejamentos: List<PlanejamentoDto> = emptyList(),
    val quilometragens: List<QuilometragemDto> = emptyList(),
    val abastecimentos: List<AbastecimentoDto> = emptyList(),
    val manutencoes: List<ManutencaoDto> = emptyList(),
    val relatoriosCampo: List<RelatorioCampoDto> = emptyList(),
    val relatoriosPdf: List<RelatorioPdfDto> = emptyList(),
    val dssAliados: List<DssAliadoDto> = emptyList(),
    val naoConformidades: List<NaoConformidadeDto> = emptyList(),
    val documentos: List<DocumentoDto> = emptyList(),
    val reunioes: List<ReuniaoDto> = emptyList()
)

data class MobileActionRequest(
    val actionType: String,
    val payload: Map<String, Any?>,
    val clientRequestId: String
)

data class MobileActionResponse(
    val success: Boolean = false,
    val actionType: String? = null,
    val correctedText: String? = null,
    val error: String? = null,
    val message: String? = null
)
