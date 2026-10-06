# Frontend

Guia de padrões de interface, design system e convenções do projeto.

## Design system

### Tokens

Definidos em `src/index.css` (Tailwind CSS v4, `@theme inline`):

| Grupo | Tokens |
|---|---|
| Marca (white label) | `--brand`, `--brand-2` — sobrescritos em tempo de execução por `useBranding()` |
| Superfícies | `--background`, `--card`, `--popover`, `--muted`, `--secondary`, `--sidebar` |
| Texto | `--foreground`, `--muted-foreground`, `--primary-foreground` |
| Bordas e foco | `--border`, `--input`, `--ring` |
| Semânticos | `--success`, `--danger`, `--warning`, `--info`, `--violet` e variantes `*-soft` |
| Tipografia | `--font-sans` (Inter), `--font-serif` (Source Serif 4 — títulos institucionais e documentos) |
| Raios | `--radius-sm` a `--radius-xl` |
| Animações | `animate-fade-in`, `animate-slide-in`, `animate-pulse-ring` |

As classes Tailwind usam esses tokens (`bg-card`, `text-muted-foreground`, `bg-success-soft`, `text-brand-2`…). **Não use cores literais** em componentes; use tokens para que tema e identidade visual funcionem.

### Tema claro/escuro

- Classe `.dark` em `<html>`; variante `dark:` configurada com `@custom-variant`.
- Preferência (`light` | `dark` | `system`) em `uiStore`, persistida via `storageService` (`spl:theme`).
- Script inline em `index.html` aplica o tema antes da renderização (sem flash).
- `ThemeToggle` está no cabeçalho de todas as áreas e na tela de login.

### Componentes — `src/components/ui`

| Arquivo | Componentes |
|---|---|
| `button.tsx` | `Button` (variantes `default`, `accent`, `destructive`, `success`, `warning`, `outline`, `secondary`, `ghost`, `link`; tamanhos `sm`…`xl`, `icon`; `loading`; `asChild`) |
| `form-controls.tsx` | `Input`, `Textarea`, `NativeSelect`, `Label`, `Field` (label + dica + erro com aria), `Checkbox`, `CheckboxField`, `Switch`, `SwitchField`, `RadioGroup`, `RadioItem`, `DatePicker` |
| `display.tsx` | `Card*`, `Badge`, `StatusBadge`, `Alert`, `Skeleton`, `Avatar`, `Progress`, `Tooltip`, `Table`/`THead`/`TBody`/`TR`/`TH`/`TD`, `Separator`, `DescriptionList` |
| `overlay.tsx` | `Dialog`/`DialogContent`, `SheetContent` (drawer lateral/inferior), `DropdownMenu*`, `Popover*`, `Tabs*`, `AlertDialogPrimitive` |

Base: primitivos `radix-ui` (mesmo fundamento do shadcn/ui), estilizados no próprio projeto. Ícones exclusivamente `lucide-react` — nada de emojis como ícone.

`NativeSelect` e `DatePicker` usam controles nativos de propósito: melhor experiência em tablet/celular, teclado acessível e integração direta com React Hook Form.

### Componentes comuns — `src/components/common`

| Componente | Uso |
|---|---|
| `PageHeader`, `Breadcrumb` | Cabeçalho padrão de página com trilha e ações |
| `StatCard` | Indicadores numéricos |
| `SearchInput`, `Toolbar`, `FilterChip` | Barra de filtros |
| `usePagination` + `Pagination` | Paginação client-side |
| `FileUpload`, `DocumentList` | Upload visual (armazenamento simulado: só metadados) |
| `ConfirmDialog` | Confirmação obrigatória de ações críticas; `requireReason` exige justificativa |
| `EmptyState`, `ErrorState`, `TableSkeleton`, `PageSkeleton`, `QueryState` | Estados de tela |
| `LegislativeTimeline` | Timeline vertical de tramitação |
| `VotingSummary`, `OutcomeSeal` | Placar SIM/NÃO/ABSTENÇÃO/AGUARDANDO e selo de resultado |
| `Crest`, `BrandMark`, `useBranding` | Identidade visual da Câmara |

### Layout — `src/components/layout`

- `AppShell` — sidebar expandida/recolhível no desktop (`lg+`), drawer em tablet/celular, cabeçalho com busca global, "Visualizar como", tema, notificações e menu do usuário. Inclui link "Pular para o conteúdo".
- `GlobalSearch` — paleta `Ctrl/Cmd + K` (cmdk) que busca proposições (número, ementa, autor, assunto, protocolo), sessões, vereadores e comissões.
- `NotificationBell` — dropdown com as últimas notificações do perfil.
- `DemoSwitcher` — seletor de perfil de demonstração.

O Painel do Plenário e o Portal da Transparência **não** usam o `AppShell`: possuem layouts próprios.

## Padrões de página

```tsx
export default function ExemploPage() {
  const query = useCollection('parties')
  const can = usePermission()
  const { run, pending } = useAction(partyService.remove, { success: 'Partido excluído.' })

  return (
    <>
      <PageHeader title="Partidos" breadcrumb={[{ label: 'Início', to: '/admin' }, { label: 'Partidos' }]}
        actions={can('parties', 'create') && <Button>Novo partido</Button>} />
      <Card>
        <QueryState query={query} isEmpty={(d) => d.length === 0}>
          {(data) => /* tabela */ null}
        </QueryState>
      </Card>
    </>
  )
}
```

Regras:

1. Leitura via hooks de `useData`; escrita via services. Nunca acessar `dataSource` ou `storageService` em componentes.
2. Toda página importante trata **loading** (skeleton), **error** (com "Tentar novamente"), **empty** e **success**.
3. Toda ação gera feedback por toast (`useAction` faz isso automaticamente).
4. Ações destrutivas ou críticas (excluir, cancelar, anular/encerrar votação, encerrar sessão, remover item) passam por `ConfirmDialog`.
5. Status são exibidos com `StatusBadge` + metadados de `domain/labels.ts`. Não escreva strings de status nas telas.
6. Datas e números via `src/lib/format.ts` (`formatDate` → `dd/MM/yyyy`, `formatTime` → `HH:mm`, `formatDateTime` → `dd/MM/yyyy HH:mm:ss`, locale pt-BR).
7. Ações visíveis somente se `usePermission()` permitir.

## Formulários

React Hook Form + Zod (`@hookform/resolvers/zod`):

```tsx
const schema = z.object({
  acronym: z.string().min(2, 'Informe a sigla').max(10),
  name: z.string().min(3, 'Informe o nome'),
})
const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

<Field label="Sigla" required error={form.formState.errors.acronym?.message}>
  {(id, describedBy) => <Input id={id} aria-describedby={describedBy}
    aria-invalid={!!form.formState.errors.acronym} {...form.register('acronym')} />}
</Field>
```

`Field` associa label, dica e erro por `id`/`aria-describedby`; a mensagem de erro usa `role="alert"`.

## Acessibilidade

- HTML semântico (`header`, `nav`, `main`, `table` com `th scope`), landmarks e link de salto.
- Foco visível global (`:focus-visible` com `--ring`).
- Todos os controles com label; botões só de ícone com `aria-label`.
- Diálogos Radix com foco preso, `Esc` e retorno de foco.
- Status e votos nunca dependem apenas de cor: sempre **texto + ícone + cor** (ex.: SIM com ícone de check).
- Contadores de votação com `aria-live="polite"`.
- Alvos de toque grandes na tela do vereador (botões de voto de altura generosa).
- `prefers-reduced-motion` desativa animações.

## Impressão

Regras `@media print` em `src/index.css`:

- `.no-print` oculta sidebar, cabeçalho, botões, filtros e toasts.
- `.print-only` exibe cabeçalhos institucionais somente na impressão.
- `.print-plain` remove bordas/sombras de cards.
- Tema forçado para claro; quebra de página evitada dentro de linhas de tabela.

Usado em pautas, resultados, atas, proposições e relatórios (`window.print()`).

## Responsividade

- Mobile-first; breakpoints Tailwind (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).
- Sidebar fixa a partir de `lg`; abaixo disso, drawer.
- Tabelas largas: `Table` envolve em contêiner com rolagem horizontal; listas críticas usam cards em telas pequenas.
- Tela do vereador desenhada primeiro para tablet (retrato e paisagem).
- Painel do Plenário com tipografia grande, legível a distância, e botão de tela cheia.
- Nenhum elemento pode exceder a viewport: use `min-w-0`, `truncate`, `break-words`.

## Convenções de código

- TypeScript estrito; sem `any`. Tipos de domínio em `src/types`.
- Alias `@/` → `src/`.
- Nomes de identificadores em inglês; textos de interface e comentários em pt-BR.
- Um componente de página por arquivo, `export default` (requisito do `lazy`).
- Evitar arquivos gigantes: extrair subcomponentes para arquivos do mesmo módulo.
- Funções de regra de negócio vão para `src/domain` e recebem teste em `*.test.ts`.
- `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` devem passar antes de qualquer entrega.

## Como adicionar uma nova página/módulo

1. **Tipo** — adicione a entidade em `src/types` (estenda `Entity`).
2. **Coleção** — inclua a chave em `CollectionMap` (`src/repositories/types.ts`) e o seed em `src/mocks/index.ts` (`collectionSeeds`). Incremente `SEED_VERSION`.
3. **Service** — use `createCrudService(name, {...})` para cadastros simples ou crie um service específico (sempre chamando `audit()` e `broadcast()`).
4. **Permissão** — se for um módulo novo, adicione-o em `PermissionModule` (`src/types/system.ts`), `ALL_MODULES` e `DEFAULT_PERMISSIONS`.
5. **Rótulos** — status novos em `src/domain/labels.ts`.
6. **Página** — crie `src/features/<módulo>/<Nome>Page.tsx` com `export default`.
7. **Rota** — registre em `src/app/router.tsx` com `guard(page(() => import(...)), { module })`.
8. **Navegação** — adicione o item em `src/config/navigation.ts` com `module` para filtro automático pelo RBAC.
9. **Validação** — rode typecheck, lint, testes e build.
