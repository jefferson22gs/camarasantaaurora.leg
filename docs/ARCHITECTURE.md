# Arquitetura

## Princípios

- A UI não conhece `localStorage`, Supabase nem regras críticas.
- Regras de domínio (quórum, apuração, elegibilidade, permissões, fluxo legislativo) são **funções puras** em `src/domain`.
- Persistência passa por contratos (`DataSource`, `CollectionRepository`, `DocumentRepository`).
- Tempo real passa por `RealtimeProvider`.
- Autenticação passa por `AuthService`.
- Nenhum dado institucional (nome, brasão, cores) é fixado em componentes: tudo vem de `Organization` / `OrganizationSettings`.

## Camadas

```
┌──────────────────────────────────────────────────────────────────────┐
│ UI  (src/features/*, src/components/*)                               │
│   páginas, formulários, tabelas, telas de votação                    │
└───────────────┬───────────────────────────────────┬──────────────────┘
                │ leitura                           │ ações
                ▼                                   ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│ Hooks (src/hooks/useData.ts) │   │ Services (src/services/*)         │
│ useCollection / useDocument  │   │ propositionService, votingService │
│ useLookups / usePermission   │   │ sessionLifecycle, agendaService…  │
│ useAction / useRealtimeSync  │   │ audit(), notify(), broadcast()    │
└───────────────┬──────────────┘   └──────┬──────────────────┬────────┘
                │ TanStack Query          │ usa regras       │ publica eventos
                ▼                         ▼                  ▼
┌──────────────────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│ Repositories (contratos)     │ │ Domain (puro)   │ │ RealtimeProvider │
│ DataSource                   │ │ quorumEngine    │ │  Local (agora)   │
│  ├ CollectionRepository<T>   │ │ votingEngine    │ │  Supabase (fase2)│
│  └ DocumentRepository<T>     │ │ process         │ └──────────────────┘
└───────────────┬──────────────┘ │ permissions     │
                │                │ labels          │
       ┌────────┴────────┐       └─────────────────┘
       ▼                 ▼
  Local (agora)     Supabase (fase 2)
  localStorage      PostgreSQL + RLS
  + seeds mock      + Storage + RPC
```

### 1. UI

Páginas por funcionalidade em `src/features/<módulo>`. Componentes reutilizáveis em `src/components/ui` (design system) e `src/components/common` (composições de domínio, como `LegislativeTimeline` e `VotingSummary`). Todas as páginas são carregadas com `React.lazy` em `src/app/router.tsx` (code splitting por rota).

### 2. Hooks — `src/hooks/useData.ts`

| Hook | Função |
|---|---|
| `useCollection(name)` | Lista uma coleção (`queryKey = [name]`) |
| `useDocument(name)` / `useOrganization()` / `useSettings()` | Documentos únicos: organização, configurações, permissões |
| `useLookups()` | Índices por ID (vereadores, partidos, comissões, tipos, quóruns) e helpers `code()` / `title()` de proposições |
| `usePermission()` | Retorna `(module, action) => boolean` a partir da matriz de permissões |
| `useAction(fn, opts)` | Executa um service com estado `pending` e toast de sucesso/erro |
| `useRealtimeSync()` | Assina o `RealtimeProvider` e invalida as coleções afetadas no cache |
| `useAreaBase()` | Prefixo da área atual (`/admin`, `/presidencia`, `/vereador`) para páginas compartilhadas |
| `useNow(ms)` | Relógio para cronômetros e painel |

### 3. Services — `src/services`

Casos de uso que orquestram repositórios, regras de domínio, auditoria, notificações e eventos.

| Arquivo | Responsabilidade |
|---|---|
| `storage.ts` | `storageService` — único ponto de acesso a `localStorage`/`sessionStorage` (prefixo `spl:`) |
| `activity.ts` | `audit()`, `notify()`, `broadcast()`, `notificationService` |
| `crud.ts` | `createCrudService()` — CRUD genérico com auditoria, evento realtime e validação `beforeRemove` |
| `registryServices.ts` | legislaturas, partidos, vereadores, comissões, usuários, sessões |
| `propositionService.ts` | proposições, tramitação (`move`), anexos, pareceres (`opinionService`) |
| `plenaryService.ts` | `sessionLifecycle`, `attendanceService`, `agendaService`, `orderOfDayService`, `impedimentService`, `votingService` |
| `settingsService.ts` | organização, configurações, permissões, restauração da demonstração |
| `authService.ts` | autenticação mock (`AuthService`) |

### 4. Repositórios — `src/repositories`

```ts
interface CollectionRepository<T extends Entity> {
  list(): Promise<T[]>
  get(id: ID): Promise<T | null>
  create(item: T): Promise<T>
  update(id: ID, patch: Partial<T>): Promise<T>
  remove(id: ID): Promise<void>
  upsertMany(items: T[]): Promise<void>
}

interface DocumentRepository<T> {
  get(): Promise<T>
  save(value: T): Promise<T>
}

interface DataSource {
  collection<K extends CollectionName>(name: K): CollectionRepository<CollectionMap[K]>
  document<K extends DocumentName>(name: K): DocumentRepository<DocumentMap[K]>
  reset(): Promise<void>
  nextSequence(name: string): Promise<number>
}
```

Coleções (`CollectionMap`): `legislatures`, `parties`, `councilors`, `committees`, `users`, `propositions`, `movements`, `opinions`, `sessions`, `attendance`, `agendas`, `impediments`, `votings`, `votes`, `notifications`, `auditLogs`.
Documentos (`DocumentMap`): `organization`, `settings`, `permissions`.

A instância única é exportada em `src/repositories/index.ts`:

```ts
export const dataSource: DataSource = createLocalDataSource()
```

Este é o **único ponto de troca** para a Fase 2.

**Implementação local** (`local/localDataSource.ts`): lê de `localStorage` (`spl:db:<coleção>`); na primeira leitura usa os seeds de `src/mocks`. Simula latência de 120 ms para exercitar estados de carregamento. `SEED_VERSION` invalida dados antigos.

### 5. Domínio — `src/domain`

| Módulo | Conteúdo |
|---|---|
| `quorum/quorumEngine.ts` | `getQuorumBaseValue`, `getRequiredVotes`, `calculateQuorum`, `getDeliberationQuorum`, `hasQuorum`, `describeQuorumRule` |
| `voting/votingEngine.ts` | `canPresidentVote`, `getEligibleVoters`, `canCouncilorVote`, `tallyVotes`, `calculateResult`, `isTie`, `needsTiebreak`, `formatVoteCode`, `getRemainingSeconds` |
| `legislative/process.ts` | `buildLegislativeProcess`, `isStageApplicable`, `propositionCode`, `propositionTitle`, `nextPropositionNumber` |
| `auth/permissions.ts` | `ROLES`, `DEFAULT_PERMISSIONS`, `ALL_MODULES`, `ALL_ACTIONS`, `can` |
| `labels.ts` | rótulos e tons de todos os status (`PropositionStatusMeta`, `SessionStatusMeta`, `VotingStatusMeta`…) |

Detalhes em [VOTING-ENGINE.md](VOTING-ENGINE.md) e [RBAC.md](RBAC.md).

### 6. Tempo real — `src/realtime`

```ts
interface RealtimeProvider {
  publish(event: Omit<RealtimeEvent, 'at' | 'origin'>): void
  subscribe(listener: RealtimeListener): () => void
}
```

Eventos (`RealtimeEventType`): `SESSION_STARTED`, `SESSION_ENDED`, `AGENDA_ITEM_CHANGED`, `DISCUSSION_STARTED`, `DISCUSSION_ENDED`, `VOTING_STARTED`, `VOTE_REGISTERED`, `VOTING_ENDED`, `VOTING_CANCELLED`, `RESULT_PUBLISHED` e `DATA_CHANGED` (CRUD genérico).

Cada evento carrega `collections` — as coleções afetadas. `useRealtimeSync` invalida essas chaves no TanStack Query, fazendo Presidência, Vereador e Painel recarregarem os dados.

`LocalRealtimeProvider` entrega o evento aos ouvintes da própria aba e às demais abas via `BroadcastChannel('spl-realtime')`, ignorando o eco da aba de origem. Na Fase 2 será substituído por `SupabaseRealtimeProvider` (ver [SUPABASE-ROADMAP.md](SUPABASE-ROADMAP.md)).

### 7. Estado global — `src/stores`

Zustand apenas onde necessário:

- `authStore` — usuário autenticado (persistido via `storageService`).
- `uiStore` — tema (`light`/`dark`/`system`), sidebar recolhida, drawer mobile, busca global.

Dados de negócio **não** ficam em stores: ficam no cache do TanStack Query.

## Fluxo de uma ação (exemplo: registro de voto)

```
CouncilorVotingPage
  └─ useAction(votingService.castVote)
       └─ votingService.castVote(votingId, councilorId, choice)
            ├─ canCouncilorVote(voting, councilorId)        ← domínio puro
            ├─ dataSource.nextSequence('vote')              ← VOT-2026-000125
            ├─ votings.update(participantIds += councilorId) ← anti-duplicidade
            ├─ votes.create(vote)                            ← councilorId = null se secreta
            ├─ audit(...)                                    ← registro de voto
            └─ broadcast(VOTE_REGISTERED, ['votings','votes'])
                 └─ todas as abas invalidam o cache → Presidência e Painel atualizam
```

## Multi-Câmara / white label

- `Organization`: nome, sigla curta, nome do sistema, município/UF, CNPJ, contatos, logotipo, brasão, favicon, cores primária/secundária, cadeiras, legislatura atual, `slug`.
- `OrganizationSettings`: regras de votação (`VotingSettings`), regra do Presidente (`PresidentRule`), regras de quórum, tipos de proposição parametrizáveis, fluxo de tramitação, transparência, notificações, segurança, modelos de documentos, padrões de sessão e integrações.
- `useBranding()` (`components/common/Brand.tsx`) aplica as cores às variáveis CSS `--brand` e `--brand-2`, ajusta `document.title` e favicon. Todos os tokens de cor derivam dessas variáveis.
- `Crest` / `BrandMark` exibem o brasão configurado ou um emblema padrão gerado com as cores da Câmara.

Na Fase 2 cada tabela terá `organization_id`; a organização ativa será resolvida por subdomínio/slug ou pelo perfil do usuário (ver [DATABASE-ROADMAP.md](DATABASE-ROADMAP.md)).

## Decisões

| Decisão | Motivo |
|---|---|
| TanStack Query mesmo com dados locais | Mesma API que será usada com Supabase; cache e invalidação por evento já funcionam |
| Repositório genérico por coleção | Evita dezenas de classes quase idênticas; regras específicas ficam nos services |
| Snapshots na votação (`quorumRule`, `memberIds`, `presentIds`, `impededIds`, `eligibleIds`) | Rastreabilidade: o resultado é calculado com as regras vigentes na abertura |
| `councilorId = null` em votos secretos | A interface nunca associa vereador e voto; a participação é registrada separadamente em `participantIds` |
| `BroadcastChannel` | Demonstração multi-tela sem servidor |
