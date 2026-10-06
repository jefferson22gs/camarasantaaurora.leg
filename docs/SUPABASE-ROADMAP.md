# Roadmap de integração com Supabase (Fase 2)

A Fase 1 foi construída para que a troca da camada de dados não exija reescrever páginas. Os pontos de substituição são:

| Fase 1 | Fase 2 | Arquivo de troca |
|---|---|---|
| `createLocalDataSource()` (localStorage + mocks) | `createSupabaseDataSource()` (PostgreSQL + RLS) | `src/repositories/index.ts` |
| `LocalRealtimeProvider` (BroadcastChannel) | `SupabaseRealtimeProvider` | `src/realtime/index.ts` |
| `authService` mock | Supabase Auth + tabela `profiles` | `src/services/authService.ts` |
| `DocumentRef` só com metadados | Supabase Storage (`storagePath`) | `fileToDocumentRef` em `src/services/propositionService.ts` |
| `votingService.castVote/close` no navegador | RPC/Edge Functions transacionais | `src/services/plenaryService.ts` |
| `audit()` gravado pelo cliente | Triggers/Edge Function, tabela append-only | `src/services/activity.ts` |

## 1. Preparação

1. Criar projeto Supabase (região São Paulo).
2. Criar o schema conforme [DATABASE-ROADMAP.md](DATABASE-ROADMAP.md), com migrations versionadas (Supabase CLI).
3. Habilitar RLS em **todas** as tabelas antes de expor a API.
4. Instalar o cliente: `npm install @supabase/supabase-js`.
5. Variáveis de ambiente (somente públicas):

```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave anon pública>
VITE_DATA_SOURCE=supabase
```

> **Nunca** coloque `SERVICE_ROLE_KEY`, chaves privadas ou segredos de terceiros em variáveis `VITE_*`: tudo com esse prefixo é embutido no bundle e fica público. Operações privilegiadas vão para Edge Functions, com segredos configurados no Supabase.

## 2. SupabaseDataSource

Implementar a interface `DataSource` (`src/repositories/types.ts`):

```ts
// src/repositories/supabase/supabaseDataSource.ts (esboço)
const TABLE: Record<CollectionName, string> = {
  legislatures: 'legislatures', parties: 'parties', councilors: 'councilors',
  committees: 'committees', users: 'profiles', propositions: 'propositions',
  movements: 'process_movements', opinions: 'opinions', sessions: 'sessions',
  attendance: 'session_attendance', agendas: 'agendas', impediments: 'impediments',
  votings: 'votings', votes: 'votes', notifications: 'notifications', auditLogs: 'audit_logs',
}

class SupabaseCollectionRepository<T extends Entity> implements CollectionRepository<T> {
  constructor(private client: SupabaseClient, private table: string, private map: Mapper<T>) {}
  async list() { const { data, error } = await this.client.from(this.table).select('*'); if (error) throw error; return data.map(this.map.fromRow) }
  async get(id) { … .eq('id', id).maybeSingle() }
  async create(item) { … .insert(this.map.toRow(item)).select().single() }
  async update(id, patch) { … .update(this.map.toRow(patch)).eq('id', id).select().single() }
  async remove(id) { … .delete().eq('id', id) }
  async upsertMany(items) { … .upsert(items.map(this.map.toRow)) }
}
```

Pontos de atenção:

- **Mapeamento** camelCase (TS) ↔ snake_case (SQL) por coleção.
- **Agregados**: `Agenda.items` vira `agendas` + `agenda_items`; `Committee.memberIds` vira `committee_members`; `Proposition.coauthorIds` vira `proposition_authors`; `attachments` vira `documents`. O repositório monta/desmonta o agregado.
- **`organization_id`** é preenchido pelo banco (default a partir do JWT) — o frontend não envia nem confia nesse valor.
- **Documentos** (`organization`, `settings`, `permissions`) mapeiam para `organizations`, `organization_settings` (JSONB por seção) e `role_permissions`.
- **`nextSequence`** passa a ser `nextval` em sequência por organização/ano, chamada dentro da RPC de voto.
- **`reset()`** lança erro (não existe na fonte real).
- Paginação/filtros server-side: estender a interface com `query(params)` quando o volume exigir; as telas atuais filtram em memória.

Troca no ponto único:

```ts
export const dataSource: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'supabase' ? createSupabaseDataSource(supabase) : createLocalDataSource()
```

## 3. Autenticação — Supabase Auth

Manter a interface `AuthService` e trocar a implementação:

| Método | Implementação |
|---|---|
| `signIn` | `supabase.auth.signInWithPassword` (ou OTP/SSO); MFA obrigatório para Presidência e Administrador |
| `signOut` | `supabase.auth.signOut()` |
| sessão | `supabase.auth.onAuthStateChange` → carrega `profiles` (nome, `role`, `councilor_id`, `committee_id`, `organization_id`) → `useAuthStore.setUser` |
| `listDemoUsers` | Removido em produção; a tela de login passa a ter e-mail/senha |

O `role` deve ser incluído como **custom claim** do JWT (Auth Hook) para uso nas políticas RLS. O seletor "Visualizar como" é desativado com `VITE_DEMO_MODE=false`.

## 4. Storage

- Bucket privado `documents`, caminho `{organization_id}/{entidade}/{id}/{arquivo}`.
- Upload: `supabase.storage.from('documents').upload(path, file)`; gravar `DocumentRef.storagePath`.
- Download: URLs assinadas com expiração curta (`createSignedUrl`).
- Políticas de Storage por `organization_id` e perfil; documentos públicos (leis, atas publicadas) servidos por bucket/política de leitura pública separada.
- Validar tipo MIME e tamanho no servidor; considerar antivírus em Edge Function.

## 5. Votação — RPCs transacionais

Mover as operações críticas de `votingService` para o servidor. O frontend passa a chamar:

| RPC / Edge Function | Responsabilidades no servidor |
|---|---|
| `start_voting(agenda_item_id, duration)` | Verificar perfil (Presidência), sessão aberta, ausência de votação aberta, quórum de deliberação; gravar snapshots (regra, presentes, impedidos, aptos); definir `closes_at` pelo relógio do servidor |
| `cast_vote(voting_id, choice)` | Identificar o vereador por `auth.uid()`; validar votação aberta, `now() < closes_at`, presença, impedimento, regra do Presidente; inserir com constraint `unique(voting_id, councilor_id)`; gerar código `VOT-AAAA-NNNNNN`; registrar auditoria; tudo em uma transação |
| `close_voting(voting_id, tiebreak?)` | Apurar com as mesmas regras do `votingEngine`; gravar `voting_results` imutável; atualizar item, proposição e tramitação |
| `cancel_voting(voting_id, reason)` / `reopen_voting` | Permissão específica, motivo obrigatório, auditoria |
| Job de encerramento | `pg_cron`/scheduler encerra votações com `automatic_close` vencidas, sem depender de uma aba aberta |

Os services do frontend mantêm a mesma assinatura e passam a apenas chamar `supabase.rpc(...)`; as funções puras do domínio continuam sendo usadas para pré-visualização (ex.: placar ao vivo, "votos necessários").

## 6. Realtime

Implementar `RealtimeProvider`:

```ts
class SupabaseRealtimeProvider implements RealtimeProvider {
  subscribe(listener) {
    const channel = supabase
      .channel(`org:${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () =>
        listener({ type: 'VOTE_REGISTERED', collections: ['votes', 'votings'], at: new Date().toISOString(), origin: 'server' }))
      .on('broadcast', { event: 'session' }, ({ payload }) => listener(payload))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  publish(event) { /* broadcast apenas para sinais de UI; mudanças de dado vêm de postgres_changes */ }
}
```

Recomendações:

- Um canal por sessão plenária (`session:{id}`) para Presidência, tablets e painel.
- `postgres_changes` respeita RLS; para o telão público, publicar apenas agregados (placar) por `broadcast` emitido no servidor ou por view pública.
- **Votação secreta**: nunca transmitir linhas de `votes`; publicar somente contagens.
- Reconexão: ao reconectar, invalidar todas as coleções da sessão (`useRealtimeSync` já invalida por coleção).

## 7. Auditoria

- `audit_logs` append-only (sem `update`/`delete` por política), preenchida por triggers e pelas RPCs, com IP real (`request.headers`), dispositivo e usuário do JWT.
- O `audit()` do frontend deixa de gravar diretamente; vira no-op ou registro de eventos de navegação não críticos.
- Encadeamento por hash (ver [SECURITY-ROADMAP.md](SECURITY-ROADMAP.md)).

## 8. Notificações

- Tabela `notifications` + `notification_reads`; inserção por triggers (ex.: parecer concluído, votação iniciada).
- E-mail/WhatsApp por Edge Function com filas, respeitando `notifications.channels` das configurações.

## 9. Sequência sugerida de migração

1. Schema + RLS + seeds da Câmara piloto.
2. Auth + `profiles` + guarda de rotas lendo o perfil real.
3. Cadastros (legislaturas, partidos, vereadores, comissões, usuários).
4. Proposições, tramitação, pareceres + Storage.
5. Sessões, presença, pautas.
6. RPCs de votação + Realtime + job de encerramento.
7. Auditoria server-side, notificações, relatórios com consultas agregadas.
8. Portal da Transparência via views públicas somente leitura.
9. Testes de carga (12–30 tablets simultâneos), testes de concorrência e homologação em sessão simulada.
