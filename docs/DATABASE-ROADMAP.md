# Roadmap do banco de dados

Modelo relacional sugerido para a Fase 2 (PostgreSQL/Supabase). **Nenhuma migration deve ser executada nesta fase**; os trechos SQL abaixo são ilustrativos.

## Princípios

- **Multi-tenant**: toda tabela de negócio possui `organization_id uuid not null references organizations(id)`. Toda política RLS filtra por ele.
- Chaves `uuid` (`gen_random_uuid()`); `created_at`/`updated_at timestamptz`.
- Status como `text` com `check` (ou enums) espelhando `src/types` e `src/domain/labels.ts`.
- Regras parametrizáveis (quórum, Presidente, fluxo, tipos) ficam em tabelas/JSONB de configuração — nunca em código.
- Registros de votação e auditoria são **imutáveis** após encerramento.

## Entidades

### Organização e configuração

| Tabela | Colunas principais |
|---|---|
| `organizations` | id, name, short_name, system_name, slug (unique), city, state, cnpj, address, phone, email, website, logo_path, crest_path, favicon_path, primary_color, secondary_color, council_seats, current_legislature_id |
| `organization_settings` | organization_id (pk), voting jsonb, president_rule jsonb, transparency jsonb, notifications jsonb, security jsonb, documents jsonb, session_defaults jsonb, integrations jsonb, updated_by, updated_at |
| `quorum_rules` | id, organization_id, name, type, base, threshold, numerator, denominator, fixed_votes, abstentions, description, active |
| `proposition_types` | id, organization_id, code, name, requires_committee, requires_voting, default_quorum_rule_id, default_voting_method, goes_to_sanction, active |
| `process_stages` | id, organization_id, key, label, description, unit, position, enabled |

### Identidade e acesso

| Tabela | Colunas principais |
|---|---|
| `users` | gerenciada pelo Supabase Auth (`auth.users`) |
| `profiles` | id (= auth.users.id), organization_id, name, email, role_key, councilor_id, committee_id, active, last_access_at |
| `roles` | key (admin, presidency, secretariat, councilor, committee), name, description |
| `permissions` | module, action (pk composta) |
| `role_permissions` | organization_id, role_key, module, action — unique(organization_id, role_key, module, action) |

### Estrutura legislativa

| Tabela | Colunas principais |
|---|---|
| `legislatures` | id, organization_id, name, number, start_date, end_date, status, notes — unique(organization_id, number) |
| `parties` | id, organization_id, acronym, name, number, color, logo_path, status — unique(organization_id, acronym) |
| `councilors` | id, organization_id, profile_id, full_name, parliamentary_name, photo_path, cpf (criptografado), party_id, legislature_id, mandate, mandate_start, mandate_end, email, phone, status, board_role, bio |
| `committees` | id, organization_id, name, acronym, kind, start_date, end_date, president_id, vice_president_id, description, status |
| `committee_members` | committee_id, councilor_id, role, start_date, end_date — pk(committee_id, councilor_id, start_date) |

### Processo legislativo

| Tabela | Colunas principais |
|---|---|
| `propositions` | id, organization_id, type_id, number, year, summary, author_type, author_councilor_id, author_name, presented_at, presentation_session_id, subject, full_text, status, stage, rapporteur_id, regime, voting_method, quorum_rule_id, notes, parent_id, protocol_number — **unique(organization_id, type_id, number, year)** |
| `proposition_authors` | proposition_id, councilor_id, kind (author, coauthor) |
| `proposition_committees` | proposition_id, committee_id, assigned_at |
| `legislative_processes` | id, organization_id, proposition_id (unique), current_stage, opened_at, closed_at |
| `process_movements` | id, organization_id, proposition_id, at, from_unit, to_unit, action, stage, responsible_id, notes |
| `opinions` | id, organization_id, proposition_id, committee_id, rapporteur_id, due_date, issued_at, report, reasoning, conclusion, status — unique(proposition_id, committee_id) |
| `documents` | id, organization_id, owner_type, owner_id, kind, name, size, mime_type, storage_path, sha256, uploaded_by, uploaded_at, public |

### Sessões plenárias

| Tabela | Colunas principais |
|---|---|
| `sessions` | id, organization_id, type, number, year, date, start_time, end_time, legislature_id, president_id, location, status, expedient, notes, opened_at, closed_at, current_agenda_item_id — unique(organization_id, type, number, year) |
| `session_attendance` | id, organization_id, session_id, councilor_id, status, registered_at, registered_by, method, device_id, justification — **unique(session_id, councilor_id)** |
| `agendas` | id, organization_id, session_id (unique), status, published_at, published_by |
| `agenda_items` | id, organization_id, agenda_id, position, proposition_id, section, status, voting_method, quorum_rule_id, notes, discussion_started_at, discussion_ended_at — unique(agenda_id, position) deferrable |
| `impediments` | id, organization_id, councilor_id, proposition_id, kind, reason, registered_by, registered_at, document_id — unique(councilor_id, proposition_id) |

### Votação

| Tabela | Colunas principais |
|---|---|
| `votings` | id, organization_id, session_id, agenda_item_id, proposition_id, method, round, status, quorum_rule_snapshot jsonb, president_rule_snapshot jsonb, duration_seconds, automatic_close, opened_at, closes_at, closed_at, opened_by, closed_by, cancel_reason, member_ids uuid[], present_ids uuid[], impeded_ids uuid[], eligible_ids uuid[] — índice parcial único: uma votação `open` por sessão |
| `votes` | id, organization_id, code, voting_id, councilor_id, choice, cast_at, device_id — **unique(voting_id, councilor_id)**, unique(organization_id, code) — somente votações nominais |
| `secret_vote_participation` | voting_id, councilor_id, cast_at — **unique(voting_id, councilor_id)** (quem votou, sem a escolha) |
| `secret_votes` | id, voting_id, choice, ballot_hash — **sem councilor_id e sem timestamp preciso** |
| `voting_results` | voting_id (pk), yes, no, abstention, not_voted, present, eligible, impeded, absent, members, required_votes, base, base_value, outcome, tie_broken_by_president, explanation, computed_at, result_hash |
| `symbolic_tallies` | voting_id (pk), yes, no, abstention, declared_by, declared_at |

**Votação secreta.** A participação (`secret_vote_participation`) e o conteúdo (`secret_votes`) ficam em tabelas separadas, inseridas na mesma transação, sem chave que permita correlacioná-las (sem `councilor_id`, ordem de inserção não confiável, timestamp truncado). Nenhuma política RLS concede `select` em `secret_votes` a usuários; apenas a função de apuração (security definer) lê contagens.

### Comunicação e auditoria

| Tabela | Colunas principais |
|---|---|
| `notifications` | id, organization_id, title, message, category, link, target_roles text[], created_at |
| `notification_reads` | notification_id, profile_id, read_at — pk composta |
| `audit_logs` | id bigserial, organization_id, at, user_id, user_name, role, operation, module, record_id, record_label, origin, details, before jsonb, after jsonb, device, ip inet, user_agent, prev_hash, hash |
| `devices` | id, organization_id, name, kind (tablet, painel, mesa), fingerprint, assigned_councilor_id, active, registered_at |

`audit_logs` é **append-only**: sem políticas de `update`/`delete`; `revoke update, delete` inclusive para o papel autenticado; `hash = sha256(prev_hash || conteúdo)` calculado por trigger.

## Índices sugeridos

- `propositions (organization_id, status)`, `(organization_id, year, type_id)`, índice GIN de busca textual (`to_tsvector('portuguese', summary || ' ' || subject)`).
- `process_movements (proposition_id, at desc)`.
- `session_attendance (session_id)`, `votes (voting_id)`, `votings (session_id, status)`.
- `audit_logs (organization_id, at desc)`, `(module, at desc)`, `(record_id)`.
- `notifications (organization_id, created_at desc)`.

## RLS — diretrizes

1. `enable row level security` em todas as tabelas.
2. Função `auth_organization_id()` lê o `organization_id` do JWT/perfil; toda política inclui `organization_id = auth_organization_id()`.
3. Função `has_permission(module, action)` consulta `role_permissions` para o papel do usuário.
4. Vereador: `select` em seus próprios votos/presenças; inserção de voto **somente via RPC** `cast_vote`.
5. Comissão: acesso de escrita a `opinions` das comissões em que é membro.
6. Portal público: views `public_*` somente leitura, filtrando o que a configuração de transparência permite (ex.: votos nominais só se `publish_nominal_votes`).
7. `votes`, `voting_results`, `audit_logs`: sem `update`/`delete` para qualquer papel de aplicação.

```sql
-- exemplo ilustrativo (não executar nesta fase)
alter table votes enable row level security;

create policy votes_select on votes for select
  using (organization_id = auth_organization_id()
         and (has_permission('voting', 'view') or councilor_id = auth_councilor_id()));

-- inserção somente via função security definer cast_vote(); nenhuma policy de insert direta
```

## Correspondência com os tipos do frontend

| Tipo TS (`src/types`) | Tabela(s) |
|---|---|
| `Organization` / `OrganizationSettings` | `organizations` / `organization_settings`, `quorum_rules`, `proposition_types`, `process_stages` |
| `User`, `Role`, `Permission`, `PermissionMatrix` | `profiles`, `roles`, `permissions`, `role_permissions` |
| `Legislature`, `Party`, `Councilor` | `legislatures`, `parties`, `councilors` |
| `Committee` | `committees` + `committee_members` |
| `Proposition` | `propositions` + `proposition_authors` + `proposition_committees` + `documents` |
| `ProcessMovement`, `LegislativeProcess` | `process_movements`, `legislative_processes` |
| `Opinion` | `opinions` |
| `Session`, `Attendance` | `sessions`, `session_attendance` |
| `Agenda`, `AgendaItem` | `agendas`, `agenda_items` |
| `Impediment` | `impediments` |
| `Voting`, `Vote`, `VotingResult` | `votings`, `votes` / `secret_*`, `voting_results`, `symbolic_tallies` |
| `Notification` | `notifications`, `notification_reads` |
| `AuditLog` | `audit_logs` |
| `DocumentRef` | `documents` + Storage |
