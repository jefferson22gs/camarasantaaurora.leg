import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, role: string, userName?: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: role, exact: true }).click()
  if (userName) await page.getByLabel('Usuário', { exact: true }).selectOption({ label: userName })
  await page.getByRole('button', { name: `Entrar como ${role}`, exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Menu do usuário', exact: true })).toBeVisible()
}

/** Cenário completo por interfaces reais, com atualização entre abas. */
test('Presidência, vereador e painel compartilham votação, resultado e auditoria', async ({ page, context }) => {
  const errors: string[] = []
  context.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)))
  page.on('pageerror', (e) => errors.push(e.message))
  await login(page, 'Presidência')
  await page.goto('/presidencia/ordem-do-dia', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Projeto de Lei nº 025/2026', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Iniciar item', exact: true }).click()
  await page.getByRole('button', { name: 'Abrir discussão', exact: true }).click()
  await page.getByRole('button', { name: 'Encerrar discussão', exact: true }).click()
  await page.getByRole('button', { name: 'Iniciar votação', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Iniciar votação', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Votação em andamento', exact: true })).toBeVisible()

  const panel = await context.newPage()
  await panel.goto('/plenario', { waitUntil: 'domcontentloaded' })
  await expect(panel.getByRole('heading', { name: 'Projeto de Lei nº 025/2026', exact: true })).toBeVisible()
  const councilor = await context.newPage()
  await login(councilor, 'Vereador', 'Ana Carolina Souza')
  await councilor.goto('/vereador/votacao', { waitUntil: 'domcontentloaded' })
  await councilor.getByRole('button', { name: 'Votar SIM', exact: true }).click()
  await councilor.getByRole('dialog').getByRole('button', { name: 'Confirmar voto', exact: true }).click()
  await expect(councilor.getByRole('heading', { name: 'VOTO REGISTRADO COM SUCESSO' })).toBeVisible()
  await expect(councilor.getByText(/VOT-2026-\d{6}/)).toBeVisible()
  await expect(councilor.getByRole('button', { name: 'Votar SIM', exact: true })).toHaveCount(0)
  const row = page.getByRole('row').filter({ hasText: 'Ana Carolina Souza' })
  await expect(row.getByText('SIM', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/presidencia.png', fullPage: true })
  await panel.screenshot({ path: 'test-results/plenario.png', fullPage: true })
  await councilor.screenshot({ path: 'test-results/vereador.png', fullPage: true })

  await page.getByRole('button', { name: 'Encerrar votação', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Encerrar votação', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Resultado da votação', exact: true })).toBeVisible()
  await expect(panel.getByText('APROVADO', { exact: true })).toBeVisible()
  await login(page, 'Administrador')
  await page.goto('/admin/auditoria', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Encerramento de votação', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Registro de voto', { exact: true }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('rotas administrativas renderizam; tablet/celular não estouram viewport', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await login(page, 'Administrador')
  for (const route of ['dashboard', 'proposicoes', 'processos', 'pareceres', 'sessoes', 'pautas', 'comissoes', 'vereadores', 'legislaturas', 'partidos', 'usuarios', 'permissoes', 'relatorios', 'auditoria', 'notificacoes', 'configuracoes']) {
    await page.goto(`/admin/${route}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByText('Ocorreu um erro inesperado')).toHaveCount(0)
  }
  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true })
  await page.getByRole('button', { name: 'Alterar tema', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Escuro', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: 'test-results/dashboard-dark.png', fullPage: true })
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const route of ['/admin/dashboard', '/admin/proposicoes', '/admin/pautas', '/admin/configuracoes', '/transparencia', '/transparencia/proposicoes']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('h1').first()).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
    await page.screenshot({ path: `test-results/public-${width}.png`, fullPage: true })
  }
  expect(errors).toEqual([])
})

test('CRUD de partido persiste criação, edição e exclusão', async ({ page }) => {
  await login(page, 'Administrador')
  await page.goto('/admin/partidos', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Novo partido', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Sigla', { exact: false }).fill('UMD')
  await dialog.getByLabel('Número', { exact: false }).fill('96')
  await dialog.getByLabel('Nome', { exact: false }).fill('União Municipal do Desenvolvimento')
  await dialog.getByRole('button', { name: 'Cadastrar partido', exact: true }).click()
  await expect(page.getByText('União Municipal do Desenvolvimento', { exact: true }).first()).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Editar UMD', exact: true }).first().click()
  await dialog.getByLabel('Nome', { exact: false }).fill('União Municipal de Desenvolvimento Social')
  await dialog.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page.getByText('União Municipal de Desenvolvimento Social', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Excluir UMD', exact: true }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir', exact: true }).click()
  await expect(page.getByText('União Municipal de Desenvolvimento Social', { exact: true })).toHaveCount(0)
})

test('transparência pública renderiza consultas e detalhes sem login', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const route of ['','proposicoes','proposicoes/pp_pl025','sessoes','sessoes/ss_ord_14','votacoes','votacoes/vt_14_1','atas','pautas','pareceres','vereadores','vereadores/cv_02']) {
    await page.goto(`/transparencia/${route}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByText('Ocorreu um erro inesperado')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
