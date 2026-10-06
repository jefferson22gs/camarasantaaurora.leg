# Roadmap de segurança

## O que a Fase 1 NÃO garante

A Fase 1 é exclusivamente frontend. Todo o estado vive no navegador (`localStorage`) e toda regra é executada no cliente. Portanto:

- **Não há autenticação real.** O login é uma seleção de perfil sem senha.
- **Não há autorização real.** `ProtectedRoute`, `usePermission` e o menu filtrado apenas organizam a interface.
- **Não há integridade do voto.** Votos, resultados e contadores podem ser alterados pelo DevTools.
- **Não há garantia de voto único** além de uma verificação no próprio navegador.
- **Não há sigilo real** na votação secreta: o voto é gravado sem `councilorId`, mas tudo está no mesmo dispositivo.
- **A auditoria é demonstrativa**: editável, sem IP real e sem imutabilidade.
- **O cronômetro e o encerramento automático dependem de uma aba aberta** e do relógio local.
- **A sincronização** (BroadcastChannel) funciona apenas entre abas do mesmo navegador.
- **Uploads são simulados**: apenas metadados, sem armazenamento nem verificação.

O sistema **não deve ser usado para deliberações oficiais** antes da Fase 2 e de homologação.

## Regras já observadas na Fase 1

- Nenhum segredo no código ou em variáveis `VITE_*`; não existe `SERVICE_ROLE_KEY`.
- `.env`, `.env.local` e `dist` fora do controle de versão.
- Acesso a storage centralizado em `storageService`.
- Regras críticas isoladas em funções puras testadas (prontas para replicação no servidor).
- Votação secreta não exibe nem audita a escolha individual.
- Ações críticas exigem confirmação; anulação exige justificativa.

## Requisitos de produção

| Área | Requisito |
|---|---|
| Autenticação | Supabase Auth com senha forte e **MFA obrigatório** para Administrador e Presidência; política de expiração de sessão (`security.sessionTimeoutMinutes`); bloqueio após tentativas falhas |
| Autorização | Toda operação validada no servidor: RLS em todas as tabelas, `has_permission()`, RPCs `security definer` para operações críticas |
| Multi-tenant | `organization_id` derivado do JWT, nunca do payload do cliente |
| Voto único | `unique(voting_id, councilor_id)` em `votes` e em `secret_vote_participation`; inserção apenas via RPC transacional |
| Janela de votação | `cast_vote` rejeita votos fora de `status = 'open'` e após `closes_at` (relógio do servidor) |
| Concorrência | Transações com `select … for update` na votação; índice único parcial "uma votação aberta por sessão"; encerramento idempotente |
| Encerramento automático | Job no servidor (`pg_cron`/scheduler), não no navegador |
| Realtime | Canais autenticados; RLS aplicada a `postgres_changes`; painel público recebe apenas agregados; votos secretos nunca transmitidos |
| Auditoria imutável | `audit_logs` append-only, gravada por triggers/RPCs, com IP, user agent e dispositivo reais; **hash encadeado** (`hash = sha256(prev_hash ‖ registro)`); exportação periódica para armazenamento WORM |
| Resultado | `voting_results` imutável com `result_hash`; ata gerada a partir do registro selado |
| Dispositivos | Cadastro de tablets autorizados (`devices`); vínculo dispositivo–vereador; recusa de votos de dispositivos não registrados quando `requireDeviceRegistration` |
| Sigilo do voto secreto | Tabelas separadas para participação e conteúdo, sem chave de correlação; timestamp truncado; leitura apenas por função de apuração; avaliar esquemas criptográficos (cédulas cifradas, mixnet) conforme exigência legal |
| Backups | Backups automáticos diários + PITR; teste de restauração periódico; retenção conforme tabela de temporalidade |
| Logs e monitoramento | Logs de API/Edge Functions, alertas de erro e de anomalias (picos de falha de login, votos rejeitados) |
| LGPD | Base legal documentada; minimização (CPF opcional e cifrado); dados pessoais fora das views públicas; registro de tratamento; atendimento a titulares |
| Transporte e cabeçalhos | HTTPS/HSTS; `Content-Security-Policy` restritiva; `X-Frame-Options`/`frame-ancestors`; `Referrer-Policy`; `Permissions-Policy` (configuráveis em `vercel.json` → `headers`) |
| Rate limiting | Limites por usuário/IP em login e RPCs; proteção contra automação |
| Uploads | Validação de tipo/tamanho no servidor, antivírus, URLs assinadas de curta duração |
| Dependências | `npm audit` e atualização contínua; lockfile versionado; CI com lint, testes e build |

## Ameaças e mitigações

| Ameaça | Mitigação |
|---|---|
| Vereador vota duas vezes ou por outro | Identidade pelo `auth.uid()` + MFA/dispositivo registrado; constraint única; auditoria |
| Voto após o encerramento | Validação de janela na RPC com relógio do servidor |
| Operador altera resultado | Resultado calculado e selado no servidor; `voting_results` sem `update`; hash encadeado na auditoria |
| Exposição do voto secreto | Separação participação/conteúdo, sem correlação; sem transmissão realtime; acesso restrito à função de apuração |
| Usuário de outra Câmara acessa dados | RLS por `organization_id` em todas as tabelas e no Storage |
| Sequestro de sessão | Tokens de curta duração, refresh rotativo, CSP, cookies/armazenamento seguros, logout por inatividade |
| Adulteração da auditoria | Append-only, hash encadeado, cópia externa imutável |
| Indisponibilidade durante a sessão | Infra com alta disponibilidade, modo de contingência documentado (votação nominal manual registrada posteriormente com auditoria) |
| Chave privilegiada vazada no bundle | Apenas `anon key` no frontend; segredos só em Edge Functions; varredura de segredos no CI |
| XSS via texto de proposição | React escapa conteúdo; nunca usar `dangerouslySetInnerHTML` com dados de usuário; CSP |

## Checklist antes de produção

- [ ] Fase 2 implementada conforme [SUPABASE-ROADMAP.md](SUPABASE-ROADMAP.md)
- [ ] RLS revisada e testada por perfil (testes automatizados de políticas)
- [ ] RPCs de votação com testes de concorrência (votos simultâneos de todos os tablets)
- [ ] MFA ativo para perfis críticos
- [ ] `VITE_DEMO_MODE=false`
- [ ] Cabeçalhos de segurança configurados
- [ ] Backup e restauração testados
- [ ] Teste de invasão independente
- [ ] Homologação em sessão simulada com a Câmara
- [ ] Regimento Interno e Lei Orgânica refletidos nas configurações (quórum, Presidente, fluxo)
