# Controle de acesso (RBAC)

> **Importante.** O RBAC desta fase controla apenas a **experiência de navegação** (menus, rotas e botões). Não é mecanismo de segurança: qualquer usuário pode alterar o estado do navegador. Em produção, toda autorização será revalidada no backend com políticas de Row Level Security (RLS) e funções server-side.

## Perfis — `ROLES` (`src/domain/auth/permissions.ts`)

| Chave | Nome | Escopo | Área inicial |
|---|---|---|---|
| `admin` | Administrador | Acesso total: configurações, usuários, permissões e parâmetros | `/admin/dashboard` |
| `presidency` | Presidência | Sessões, pauta, Ordem do Dia e condução das votações | `/presidencia/dashboard` |
| `secretariat` | Secretaria Legislativa | Proposições, processos, tramitação, pautas e atas | `/admin/dashboard` |
| `councilor` | Vereador | Matérias, sessões, votação e seus registros | `/vereador/dashboard` |
| `committee` | Comissão | Matérias recebidas, pareceres e tramitação | `/admin/pareceres` |

O Portal da Transparência e o Painel do Plenário são públicos (sem perfil).

## Ações

`view` (Visualizar), `create` (Criar), `edit` (Editar), `delete` (Excluir), `approve` (Aprovar), `operate` (Operar), `export` (Exportar).

## Matriz padrão — `DEFAULT_PERMISSIONS`

Legenda: V visualizar · C criar · E editar · X excluir · A aprovar · O operar · Ex exportar. Célula vazia = sem acesso.

| Módulo | Administrador | Presidência | Secretaria | Vereador | Comissão |
|---|---|---|---|---|---|
| dashboard | todas | V | V | | V |
| propositions | todas | V, Ex | V, C, E, X, Ex | V | V |
| processes | todas | V, A | V, C, E, O | | V, O |
| opinions | todas | V | V, C, E | | V, C, E, A |
| sessions | todas | V, C, E, O, Ex | V, C, E, X, Ex | V | |
| attendance | todas | V, O | V, O | | |
| agendas | todas | V, C, E, A, Ex | V, C, E, X, Ex | | |
| order_of_day | todas | V, O | V | | |
| voting | todas | V, O, A, Ex | V | V, O | |
| committees | todas | V | V, C, E | | V |
| councilors | todas | V | V, C, E | | |
| legislatures | todas | | V, C, E | | |
| parties | todas | | V, C, E | | |
| users | todas | | | | |
| permissions | todas | | | | |
| reports | todas | V, Ex | V, Ex | | |
| audit | todas | | | | |
| notifications | todas | V | V | V | V |
| settings | todas | | | | |

A matriz é um documento persistido (`dataSource.document('permissions')`) e pode ser alterada visualmente em `/admin/permissoes`. Alterações são auditadas.

## Uso no código

### Verificação

```ts
can(matrix, role, module, action = 'view'): boolean   // domínio puro, testado
```

```tsx
const can = usePermission()
{can('propositions', 'create') && <Button>Nova proposição</Button>}
```

### Rotas — `ProtectedRoute` (`src/features/auth/ProtectedRoute.tsx`)

```tsx
<ProtectedRoute roles={['presidency', 'admin']}>…</ProtectedRoute>
<ProtectedRoute module="audit" action="view">…</ProtectedRoute>
```

- Sem usuário → redireciona para `/login` preservando a rota de origem.
- Sem permissão → tela "Acesso não autorizado" com retorno à área do perfil.

No `router.tsx` cada área tem guarda por perfil e cada página por módulo (`guard(page(...), { module })`).

### Navegação

`src/config/navigation.ts` declara o `module` de cada item; o `AppShell` oculta itens sem permissão `view`.

## Mapeamento para a Fase 2

| Fase 1 (frontend) | Fase 2 (backend) |
|---|---|
| `useAuthStore().user.role` | `profiles.role` vinculado a `auth.users`, emitido como claim no JWT |
| Documento `permissions` | Tabelas `roles`, `permissions`, `role_permissions` por `organization_id` |
| `can()` na UI | Função SQL `has_permission(module, action)` usada nas políticas RLS e nas RPCs |
| `ProtectedRoute` | Continua existindo para UX; a proteção real vira RLS |
| Vereador vê apenas seus registros | Política `councilor_id = auth_councilor_id()` |
| Comissão vê matérias recebidas | Política por `committee_members` |
| Votação (`voting:operate`) | RPC `cast_vote` com `security definer`, validando perfil, presença, impedimento e janela de votação |

Exemplo ilustrativo (não executar nesta fase):

```sql
-- exemplo
create policy "leitura por organização"
  on propositions for select
  using (organization_id = auth_organization_id());

create policy "secretaria edita proposições"
  on propositions for update
  using (organization_id = auth_organization_id() and has_permission('propositions', 'edit'));
```
