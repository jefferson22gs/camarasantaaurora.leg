# VotingEngine e QuorumEngine

Todas as regras de votação ficam centralizadas em dois módulos de **funções puras** (sem I/O, sem React, sem `Date.now()` implícito quando relevante para o resultado):

- `src/domain/quorum/quorumEngine.ts`
- `src/domain/voting/votingEngine.ts`

Nenhuma tela calcula quórum ou resultado por conta própria. Na Fase 2 o backend passa a ser a fonte da verdade, replicando (ou reutilizando) estas regras numa RPC/Edge Function; o módulo continua útil para pré-visualização na interface.

## Configuração

### Regra de quórum — `QuorumRule` (`src/types/quorum.ts`)

```ts
interface QuorumRule {
  id: string
  name: string
  type: 'simple_majority' | 'absolute_majority' | 'qualified_majority' | 'two_thirds' | 'specific' | 'custom'
  base: 'votes_cast' | 'present' | 'eligible' | 'members'
  threshold: 'majority' | 'fraction' | 'fixed'
  numerator?: number
  denominator?: number
  fixedVotes?: number
  abstentions: 'exclude' | 'include'
  description: string
}
```

| Base | Valor usado |
|---|---|
| `votes_cast` | SIM + NÃO (+ abstenções se `abstentions = 'include'`) |
| `present` | presentes aptos (`tally.eligible`) |
| `eligible` | membros − impedidos |
| `members` | composição total |

| Threshold | Votos SIM necessários |
|---|---|
| `majority` | `floor(base / 2) + 1` |
| `fraction` | `ceil(base × numerator / denominator)` (com tolerância a erro de ponto flutuante) |
| `fixed` | `fixedVotes` |

Regras pré-configuradas para a Câmara de demonstração (`src/mocks/organization.ts`):

| id | Nome | Base | Threshold |
|---|---|---|---|
| `q_simple` | Maioria simples | votos válidos | maioria |
| `q_absolute` | Maioria absoluta | membros | maioria |
| `q_qualified` | Maioria qualificada (3/5) | membros | 3/5 |
| `q_two_thirds` | Dois terços | membros | 2/3 |
| `q_present` | Maioria dos presentes | presentes | maioria (abstenções incluídas) |
| `q_one_third` | Um terço | membros | 1/3 |

### Configuração de votação — `VotingSettings`

| Campo | Efeito |
|---|---|
| `defaultDurationSeconds` | Duração do cronômetro (padrão 120 s) |
| `automaticClose` | Encerrar automaticamente ao zerar o cronômetro |
| `allowAbstention` | Habilita a opção ABSTENÇÃO |
| `labels` | Nomenclatura das opções (`SIM`, `NÃO`, `ABSTENÇÃO`) |
| `deliberationQuorum` | Presença mínima: `absolute_majority`, `one_third` ou `none` |
| `withoutQuorumBehavior` | Sem quórum: `block` (impede abertura) ou `warn` (abre com alerta na auditoria) |
| `allowReopen` | Permite reabrir votação (nova rodada) |
| `tieOutcome` | Resultado do empate sem desempate: `rejected` ou `tie` |

### Regra do Presidente — `PresidentRule`

| Campo | Efeito |
|---|---|
| `mode: 'normal'` | Presidente vota sempre |
| `mode: 'never'` | Presidente não vota (exceto desempate) |
| `mode: 'specific'` | Vota apenas nos tipos de quórum em `votesOnQuorumTypes` ou em votação secreta se `votesOnSecret` |
| `tiebreak` | Possui voto de desempate (minerva) |

Padrão da demonstração: `specific` (vota em maioria absoluta, qualificada, 2/3 e secreta) com desempate.

## QuorumEngine — API

```ts
getQuorumBaseValue(rule: QuorumRule, tally: VoteTally): number
getRequiredVotes(rule: QuorumRule, baseValue: number): number
calculateQuorum(rule: QuorumRule, tally: VoteTally): { base; baseValue; requiredVotes }
getDeliberationQuorum(members: number, kind: DeliberationQuorum): number
hasQuorum(present: number, members: number, kind: DeliberationQuorum): boolean
describeQuorumRule(rule: QuorumRule): string
QUORUM_BASE_LABEL: Record<QuorumBase, string>
```

### Exemplos — Câmara com 12 membros

| Regra | Cálculo | Votos SIM necessários |
|---|---|---|
| Maioria absoluta | floor(12/2) + 1 | **7** |
| 2/3 | ceil(12 × 2/3) | **8** |
| 3/5 | ceil(12 × 3/5) | **8** |
| 1/3 | ceil(12 / 3) | **4** |
| Maioria simples, 8 SIM + 2 NÃO + 1 abst. | base 10 → floor(10/2) + 1 | **6** (aprovado) |
| Maioria simples com abstenções incluídas, 5 SIM + 2 NÃO + 4 abst. | base 11 → 6 | rejeitado |
| Quórum de deliberação (maioria absoluta) | floor(12/2) + 1 | **7 presentes** |

## VotingEngine — API

```ts
canPresidentVote(rule: PresidentRule, quorumType: QuorumType, method: VotingMethod): boolean

getEligibleVoters(ctx: {
  memberIds; presentIds; impededIds; presidentId; presidentRule; quorumType; method
}): ID[]

canCouncilorVote(voting: Voting, councilorId: ID):
  { allowed: true } | { allowed: false; reason: VoteDenial }

tallyVotes(voting, votes): VoteTally

calculateResult(input: {
  rule; tally; presidentRule; deliberationQuorum; tieOutcome; tiebreakVote?; now?
}): VotingResult

isTie(tally): boolean
needsTiebreak(input): boolean
formatVoteCode(year: number, sequence: number): string   // VOT-2026-000125
getRemainingSeconds(voting, now?): number

OUTCOME_LABEL       // APROVADO | REJEITADO | EMPATE | SEM QUÓRUM
VOTE_DENIAL_LABEL   // mensagens de bloqueio exibidas ao vereador
```

### Elegibilidade

Um vereador é **apto** quando: é membro em exercício, está **presente**, **não está impedido** naquela matéria e, se for o Presidente, a `PresidentRule` permite que vote.

`canCouncilorVote` retorna o motivo da recusa:

| `VoteDenial` | Situação |
|---|---|
| `not_open` | Votação não está aberta |
| `symbolic` | Votação simbólica — resultado declarado pela Presidência |
| `not_member` | Não integra a composição |
| `impeded` | Impedido/suspeito na matéria |
| `absent` | Presença não registrada |
| `already_voted` | Voto já registrado (impede segundo voto) |
| `president_rule` | Presidente não vota nesta matéria |

### Impedimento e suspeição

Registrados em `impediments` (vereador, matéria, tipo, motivo, responsável, data/hora, documento). Na abertura da votação os impedidos entram em `impededIds` e são removidos de `eligibleIds`. Na interface aparecem com o selo **IMPEDIDO**.

### Contagem — `tallyVotes`

Produz `VoteTally`: `yes`, `no`, `abstention`, `notVoted` (aptos − votos), `present`, `eligible`, `impeded`, `absent`, `members`. Em votação simbólica, usa o placar declarado em `voting.symbolicTally`.

### Apuração — `calculateResult`

Ordem de avaliação:

1. **Sem quórum de deliberação** — presentes < `getDeliberationQuorum(members, deliberationQuorum)` → `no_quorum`.
2. **Aprovação** — `yes >= requiredVotes` → `approved`.
3. **Empate** (`yes === no`, com ao menos um voto):
   - Presidente com `tiebreak` e `tiebreakVote` informado → soma o voto do Presidente, recalcula o quórum e marca `tieBrokenByPresident = true`.
   - Caso contrário → `tieOutcome` configurado (`rejected` ou `tie`).
4. **Demais casos** → `rejected`.

O `VotingResult` inclui a contagem, `requiredVotes`, `base`, `baseValue`, `explanation` legível e `computedAt`.

`needsTiebreak()` informa à tela da Presidência quando deve solicitar o voto de minerva antes de encerrar.

## Modalidades

| Método | Comportamento |
|---|---|
| `nominal` | Voto individual identificado; Presidência vê a tabela Vereador / Situação / Voto em tempo real; publicação nominal no portal conforme `transparency.publishNominalVotes` |
| `symbolic` | Sem voto individual; a Presidência declara o placar (`setSymbolicTally`, limitado ao número de aptos) |
| `secret` | Voto gravado com `councilorId = null`; a participação fica em `voting.participantIds` (impede voto duplicado); auditoria registra a participação, nunca a escolha; telas mostram apenas "Votou / Aguardando" |

> O sigilo na Fase 1 é apenas de interface. Garantia real de anonimato (separação física, criptografia, mixagem) é responsabilidade do backend — ver [SECURITY-ROADMAP.md](SECURITY-ROADMAP.md).

## Estados da votação

`VotingStatus`: `idle` (IDLE) → `preparing` (PREPARANDO) → `open` (ABERTA) → `closed` (ENCERRADA) | `cancelled` (ANULADA).

```
            iniciar                 encerrar / cronômetro zerado (automaticClose)
 IDLE ───► PREPARANDO ───► ABERTA ─────────────────────────────────► ENCERRADA
                              │                                         │
                              └──────────── anular (com motivo) ───────►│──► ANULADA
                                                                        │
                                       reabrir (allowReopen) ◄──────────┘  nova rodada
```

Na abertura (`votingService.start`) são gravados **snapshots**: regra de quórum, membros, presentes, impedidos, aptos e Presidente. A apuração usa esses snapshots, garantindo rastreabilidade mesmo que a configuração mude depois.

Reabrir (`votingService.reopen`) anula a rodada anterior (preservada no histórico) e abre nova rodada (`round + 1`).

## Cronômetro

`closesAt = openedAt + durationSeconds`. `getRemainingSeconds(voting, now)` alimenta o cronômetro das telas. Ao zerar:

- `automaticClose = true` → a tela de operação chama `votingService.close(id, { automatic: true })` (auditado como "Encerramento automático").
- `automaticClose = false` → o cronômetro apenas sinaliza tempo esgotado; o Presidente encerra manualmente.

Na Fase 2 o encerramento automático deve ser executado no servidor (job/cron ou validação de janela na RPC de voto), nunca dependendo de uma aba aberta.

## Identificador do voto

`formatVoteCode(2026, 125)` → `VOT-2026-000125`. A sequência vem de `dataSource.nextSequence('vote')`. Cada `Vote` registra: código, votação, sessão, matéria, vereador (ou `null` se secreta), escolha, data/hora e dispositivo.

## Testes

```bash
npm run test
```

Arquivos:

- `src/domain/voting/votingEngine.test.ts` — maioria simples, absoluta, 2/3, quórum fixo, abstenções na base, impedidos na base, quórum de deliberação, sem quórum, empate com e sem desempate, regra do Presidente (normal/never/specific/secreta), elegibilidade, voto duplicado, ausente, impedido, contagem, simbólica, identificador.
- `src/domain/misc.test.ts` — RBAC, formatação pt-BR, busca sem acentos, identificação e numeração de proposições.
