# Sistema de Processo Legislativo Municipal e Votação Eletrônica

Plataforma web para gestão eletrônica do processo legislativo de Câmaras Municipais — da proposição ao arquivamento — com módulo de votação eletrônica em Plenário.

Esta é a **Fase 1 (frontend)**: aplicação React completa, navegável e responsiva, operando com dados de demonstração persistidos no navegador. A arquitetura foi desenhada para que a Fase 2 substitua a camada de dados mock por Supabase **sem reconstruir as telas**.

> **Aviso de segurança.** Nesta fase não existe backend. Autenticação, permissões, votos e auditoria são simulados no navegador e podem ser alterados por qualquer pessoa com acesso ao DevTools. **O frontend não garante a integridade, a unicidade nem o sigilo do voto.** O uso em sessões reais exige a Fase 2 (ver [docs/SECURITY-ROADMAP.md](docs/SECURITY-ROADMAP.md)).

---

## Visão geral

O sistema é um único ecossistema com quatro interfaces:

| Interface | Rota base | Público | Finalidade |
|---|---|---|---|
| Portal Administrativo | `/admin` | Administrador, Secretaria Legislativa, Comissão, Presidência | Cadastros, proposições, tramitação, pareceres, sessões, pautas, relatórios, auditoria e configurações |
| Presidência | `/presidencia` | Presidência (e Administrador) | Condução da sessão: presença, pauta, Ordem do Dia, abertura/encerramento de votações |
| Portal do Vereador | `/vereador` | Vereador | Votação em tablet, matérias, sessões, histórico de votos e perfil |
| Painel do Plenário | `/plenario` | Telão / TV (sem login) | Exibição em tempo real da matéria, placar e resultado |
| Portal da Transparência | `/transparencia` | Cidadão (sem login) | Consulta pública de proposições, sessões, votações, atas, pautas, pareceres e vereadores |

Ciclo legislativo contemplado (configurável por Câmara em `OrganizationSettings.processFlow`):

```
Proposição → Protocolo → Análise → Encaminhamento → Comissão → Parecer → Pauta → Ordem do Dia
→ Discussão → Votação → Resultado → Sanção/Veto → Promulgação → Publicação → Arquivamento
```

## Tecnologias

| Pacote | Versão |
|---|---|
| React / React DOM | ^19.3.0 |
| TypeScript | ^6.0.3 |
| Vite | ^8.3.3 |
| Tailwind CSS (`@tailwindcss/vite`) | ^4.3.3 |
| Radix UI (`radix-ui`, base dos componentes no padrão shadcn/ui) | ^1.7.0 |
| React Router (`react-router-dom`) | ^7.18.4 |
| TanStack Query | ^5.104.1 |
| Zustand | ^5.0.15 |
| React Hook Form + `@hookform/resolvers` | ^7.89.0 / ^5.9.1 |
| Zod | ^3.25.76 |
| Recharts | ^3.10.1 |
| date-fns (locale pt-BR) | ^4.4.0 |
| Lucide React | ^1.52.0 |
| Sonner (toasts) | ^2.0.8 |
| cmdk (busca global) | ^1.1.1 |
| Vitest | ^5.0.3 |
| ESLint + typescript-eslint | ^10.12.0 / ^8.71.1 |

## Requisitos

- Node.js **22.12 ou superior** (ou 20.19+, conforme os requisitos do Vite 8)
- npm 10+

## Instalação e execução

```bash
npm install        # instala dependências
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
npm run build      # typecheck (tsc) + build de produção em dist/
npm run preview    # serve o build localmente
npm run typecheck  # somente verificação de tipos
npm run lint       # ESLint
npm run test       # 29 testes unitários (Vitest)
npm run test:e2e   # fluxos reais no navegador (Playwright, Edge instalado)
```

Os testes de navegador usam Edge (`channel: 'msedge'`) e iniciam o Vite automaticamente. Em outro ambiente, altere o canal em `playwright.config.ts` para Chromium e execute `npx playwright install chromium`. As capturas e traces ficam em `test-results/` (não versionado).

Validados: votação entre abas (Presidência/Vereador/Painel), apuração, auditoria, CRUD de partido, rotas administrativas/públicas, tema escuro e ausência de overflow nas páginas verificadas em 768 px e 390 px.

Não há variáveis obrigatórias. Copie `.env.example` para `.env.local` apenas se quiser ajustar o modo de demonstração.

| Variável | Uso |
|---|---|
| `VITE_DEMO_MODE` | `false` oculta o seletor "Visualizar como" no build de produção |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DATA_SOURCE` | Reservadas para a Fase 2 (somente chaves públicas). **Nunca** coloque `SERVICE_ROLE_KEY` no frontend. |

## Estrutura de pastas

```
src/
  app/            App, router (rotas lazy), páginas de erro
  components/
    ui/           design system (Button, inputs, Card, Badge, Table, Dialog, Sheet, Tabs, Tooltip…)
    layout/       AppShell (sidebar/drawer), header, busca global, notificações, seletor de perfil
    common/       PageHeader, StatCard, Confirm Dialog, Empty/Error/Skeleton, FileUpload,
                  LegislativeTimeline, VotingSummary, Brand (white label)
  config/         navegação por área
  domain/         regras puras e testáveis
    auth/         RBAC (ROLES, DEFAULT_PERMISSIONS, can)
    legislative/  montagem do processo legislativo, numeração de proposições
    quorum/       quorumEngine
    voting/       votingEngine (+ testes)
    labels.ts     rótulos e tons centralizados de todos os status
  features/       páginas por módulo (auth, dashboard, propositions, sessions, voting, transparency…)
  hooks/          useData (useCollection, useDocument, useLookups, usePermission, useAction…)
  lib/            formatação pt-BR, CSV, utilitários
  mocks/          dataset de demonstração (Câmara Municipal de Santa Aurora)
  realtime/       RealtimeProvider + LocalRealtimeProvider (BroadcastChannel)
  repositories/   contratos (DataSource, CollectionRepository, DocumentRepository) e implementação local
  services/       casos de uso (proposições, plenário/votação, cadastros, configurações, auth, auditoria)
  stores/         Zustand (sessão autenticada, tema, UI)
  types/          entidades do domínio
docs/             documentação técnica
```

## Rotas

**Públicas**

| Rota | Tela |
|---|---|
| `/` | Redireciona para a área do perfil logado ou para `/transparencia` |
| `/login` | Login demonstrativo com seleção de perfil |
| `/plenario`, `/plenario/sessao`, `/plenario/votacao`, `/plenario/resultado` | Painel do Plenário (fullscreen) |
| `/transparencia` | Início do portal (busca, indicadores, sessões, últimas votações) |
| `/transparencia/proposicoes[/:id]` | Consulta de proposições e detalhe com tramitação |
| `/transparencia/sessoes[/:id]` | Sessões e detalhe |
| `/transparencia/votacoes[/:id]` | Votações, resultado e votos nominais (quando a configuração permite) |
| `/transparencia/atas`, `/pautas`, `/pareceres` | Atas, pautas e pareceres publicados |
| `/transparencia/vereadores[/:id]` | Vereadores e produção legislativa |

**Portal Administrativo** (`/admin`, perfis Administrador, Secretaria, Comissão, Presidência — cada item filtrado pelo RBAC)

| Rota | Tela |
|---|---|
| `/admin/dashboard` | Indicadores, gráficos, filtros e atividades recentes |
| `/admin/proposicoes`, `/nova`, `/:id`, `/:id/editar` | Lista, cadastro, detalhe (abas) e edição de proposições |
| `/admin/processos` | Visão do fluxo legislativo por matéria |
| `/admin/pareceres` | Pareceres das comissões |
| `/admin/sessoes`, `/:id`, `/:id/ata` | Sessões, detalhe com presença e prévia da Ata |
| `/admin/pautas` | Construtor de pauta |
| `/admin/ordem-do-dia` | Mesa diretora / operação da votação |
| `/admin/comissoes[/:id]` | Comissões permanentes e temporárias |
| `/admin/vereadores[/:id]` | Vereadores e detalhe |
| `/admin/legislaturas`, `/admin/partidos` | Cadastros |
| `/admin/usuarios`, `/admin/permissoes` | Usuários e matriz de permissões |
| `/admin/relatorios` | Central de relatórios (impressão e CSV) |
| `/admin/auditoria` | Trilha de auditoria |
| `/admin/notificacoes` | Central de notificações |
| `/admin/configuracoes` | Configurações da Câmara, identidade visual, votação, quórum, Presidente… |

**Presidência** (`/presidencia`): `dashboard`, `sessoes[/:id[/ata]]`, `pauta`, `ordem-do-dia`, `votacao`.

**Portal do Vereador** (`/vereador`): `dashboard`, `votacao`, `materias[/:id]`, `sessoes[/:id[/ata]]`, `historico`, `perfil`, `notificacoes`.

Rotas inexistentes exibem a página 404. O `vercel.json` reescreve todas as rotas para `index.html`, permitindo acesso direto a qualquer URL (ex.: `/vereador/votacao`).

## Perfis demonstrativos

Na tela `/login`, escolha o perfil e clique em **Entrar**. Não há senha.

| Perfil | Usuário (id) | Área inicial |
|---|---|---|
| Administrador | Helena Duarte Vasconcelos (`usr_admin`) | `/admin/dashboard` |
| Presidência | João Martins (`usr_pres`) — Presidente da Câmara | `/presidencia/dashboard` |
| Secretaria Legislativa | Sérgio Antunes Moreira (`usr_sec`) | `/admin/dashboard` |
| Vereador | Ana Carolina Souza (`usr_cv_02`) — e os demais 11 vereadores em exercício | `/vereador/dashboard` |
| Comissão | Beatriz Lemos Arantes (`usr_com`) — CCJR | `/admin/pareceres` |

**Visualizar como.** No cabeçalho há o seletor de demonstração, que troca de perfil instantaneamente, abre o Painel do Plenário em nova aba, leva ao Portal da Transparência e permite **restaurar os dados de demonstração**. Ele aparece em desenvolvimento e em builds onde `VITE_DEMO_MODE` não seja `false`. Para uma instalação real, defina `VITE_DEMO_MODE=false`.

## Roteiro de demonstração — Sessão Ordinária nº 15/2026

Cenário pré-carregado: Câmara Municipal de Santa Aurora (MG), 12 vereadores em exercício, 11 presentes (Fernanda Costa com ausência justificada), sessão aberta, pauta publicada com 4 itens; item 1: **Projeto de Lei nº 025/2026** (Iluminação Pública Sustentável), votação nominal, maioria simples.

1. Abra o sistema e entre como **Presidência** (João Martins).
2. Acesse **Ordem do Dia** (`/presidencia/ordem-do-dia`).
3. Clique em **Iniciar item** no PL 025/2026.
4. Clique em **Abrir discussão** e depois em **Encerrar discussão**.
5. Clique em **Iniciar votação** e confirme. O cronômetro (padrão 02:00) começa.
6. Em **outra aba do mesmo navegador**, abra `/login` e entre como **Vereador** (Ana Carolina Souza), ou use "Visualizar como". Acesse `/vereador/votacao`: a matéria ativa domina a tela.
7. Em uma terceira aba, abra `/plenario` (de preferência em tela cheia).
8. Na aba do vereador, toque em **SIM / FAVORÁVEL**, confira o modal **Confirmar voto** e confirme. A tela exibe **VOTO REGISTRADO COM SUCESSO** com o identificador (`VOT-2026-000…`) e bloqueia novo voto.
9. Observe a aba da Presidência (tabela nominal e contadores) e o Painel do Plenário atualizarem imediatamente.
10. Repita com outros vereadores pelo seletor "Visualizar como", se desejar.
11. Na Presidência, clique em **Encerrar votação** e confirme. O sistema apura conforme a regra de quórum e a regra do Presidente e exibe **APROVADO** ou **REJEITADO**; o painel mostra o resultado.
12. Entre como **Administrador** e consulte **Auditoria** (abertura, votos, encerramento) e **Notificações** (votação iniciada, resultado disponível).
13. Consulte o resultado público em `/transparencia/votacoes`.

**Sincronização.** O `LocalRealtimeProvider` propaga eventos entre abas via `BroadcastChannel`, e todas as abas compartilham o mesmo `localStorage`. Por isso a sincronização funciona **entre abas do mesmo navegador e mesmo domínio**; dispositivos diferentes só serão sincronizados na Fase 2 (Supabase Realtime).

## Dados de demonstração

Dataset fictício brasileiro (`src/mocks`) — partidos fictícios, sem relação com agremiações reais:

| Coleção | Registros |
|---|---|
| Legislaturas | 3 (19ª encerrada, 20ª em curso, 21ª futura) |
| Partidos | 6 (5 ativos) |
| Vereadores | 13 (12 em exercício + 1 suplente) |
| Comissões | 5 (4 permanentes + 1 temporária) |
| Usuários | 17 |
| Proposições | 26 (PL, PLC, PDL, PR, Emenda, Requerimento, Indicação, Moção, Veto) |
| Movimentações de tramitação | 207 |
| Pareceres | 29 |
| Sessões | 8 (encerradas, aberta, agendadas, cancelada) |
| Registros de presença | 48 |
| Pautas | 5 |
| Votações encerradas | 9 (nominais e simbólicas, apuradas pelo VotingEngine) |
| Votos individuais | 69 |
| Impedimentos | 1 |
| Notificações | 10 |
| Logs de auditoria | 13 |

As alterações feitas na interface (cadastros, votos, auditoria) ficam no `localStorage` do navegador. Para voltar ao cenário inicial use **Visualizar como → Restaurar dados de demonstração**. Incrementar `SEED_VERSION` em `src/mocks/index.ts` força a recarga do dataset em todos os navegadores.

## Deploy na Vercel

1. Publique o repositório no GitHub.
2. Na Vercel, **Add New → Project** e importe o repositório. O preset **Vite** é detectado; o `vercel.json` já define:
   - `buildCommand`: `npm run build`
   - `outputDirectory`: `dist`
   - `rewrites`: todas as rotas → `/index.html` (SPA)
3. (Opcional) Defina `VITE_DEMO_MODE=false` nas variáveis de ambiente para ocultar o seletor de demonstração.
4. Deploy. Rotas como `/admin/dashboard`, `/vereador/votacao` e `/transparencia/proposicoes` funcionam por acesso direto.

## Documentação técnica

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — camadas, contratos, realtime e white label
- [FRONTEND.md](docs/FRONTEND.md) — design system, padrões de página, acessibilidade, impressão
- [VOTING-ENGINE.md](docs/VOTING-ENGINE.md) — regras de quórum, apuração e votação
- [RBAC.md](docs/RBAC.md) — perfis e matriz de permissões
- [SUPABASE-ROADMAP.md](docs/SUPABASE-ROADMAP.md) — integração da Fase 2
- [DATABASE-ROADMAP.md](docs/DATABASE-ROADMAP.md) — modelo de dados sugerido
- [SECURITY-ROADMAP.md](docs/SECURITY-ROADMAP.md) — requisitos de segurança para produção
