// ══════════════════════════════════════════════════
// ENTRIES — Testes de CRUD de lançamentos
// Cobre o bug crítico: lançamentos normais não eram salvos.
// ══════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');

// Helpers
const DESC_TESTE = `Teste PW ${Date.now()}`;

async function selecionarPrimeiroMes(page) {
  await page.locator('.month-item').first().click();
  await expect(page.locator('#tbTitle')).not.toHaveText('Selecione um mês');
}

async function garantirBanco(page) {
  const temBanco = await page.locator('.btab').first().isVisible().catch(() => false);
  if (!temBanco) {
    await page.locator('button:has-text("+ Banco")').click();
    await page.fill('#bName', 'Banco Teste');
    await page.locator('#mBank button:has-text("Adicionar")').click();
    await expect(page.locator('.btab', { hasText: 'Banco Teste' })).toBeVisible();
  }
}

// ──────────────────────────────────────────────────
test.describe('Lançamentos — Criar', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await selecionarPrimeiroMes(page);
    await garantirBanco(page);
  });

  test('salvar lançamento normal aparece na tabela (bug fix)', async ({ page }) => {
    await page.locator('button:has-text("+ Lançamento")').click();
    await expect(page.locator('#mEntry')).toBeVisible();

    await page.fill('#eDesc', DESC_TESTE);
    await page.fill('#eAmt', '42.50');
    // tipo Normal já é o padrão

    await page.locator('#mEntry button:has-text("Salvar")').click();

    // Toast de sucesso
    await expect(page.locator('#appToast')).toContainText('Lançamento salvo', { timeout: 8000 });

    // Entrada aparece na tabela sem precisar recarregar
    await expect(page.locator(`td:has-text("${DESC_TESTE}")`)).toBeVisible();
  });

  test('lançamento normal persiste após reload da página', async ({ page }) => {
    const desc = `Persistência ${Date.now()}`;

    await page.locator('button:has-text("+ Lançamento")').click();
    await page.fill('#eDesc', desc);
    await page.fill('#eAmt', '99');
    await page.locator('#mEntry button:has-text("Salvar")').click();
    await expect(page.locator('#appToast')).toContainText('Lançamento salvo');

    // Recarrega e verifica que foi realmente salvo no Supabase
    await page.reload();
    await expect(page.locator('#monthList')).toBeVisible();
    await selecionarPrimeiroMes(page);
    await expect(page.locator(`td:has-text("${desc}")`)).toBeVisible({ timeout: 12_000 });
  });

  test('salvar lançamento parcelado cria parcela no mês', async ({ page }) => {
    await page.locator('button:has-text("+ Lançamento")').click();
    await page.fill('#eDesc', `Parcela ${Date.now()}`);
    await page.fill('#eAmt', '900');

    // Seleciona tipo Parcelado
    await page.locator('#tInstall').click();
    await page.fill('#eInstTotal', '3');

    await page.locator('#mEntry button:has-text("Salvar")').click();
    await expect(page.locator('#appToast')).toContainText('Lançamento salvo');

    // Badge de parcela aparece na linha
    await expect(page.locator('.bm-inst').first()).toBeVisible();
  });

  test('valor exibido de parcela é dividido corretamente (900 / 3 = 300)', async ({ page }) => {
    await page.locator('button:has-text("+ Lançamento")').click();
    await page.fill('#eDesc', `Split ${Date.now()}`);
    await page.fill('#eAmt', '900');
    await page.locator('#tInstall').click();
    await page.fill('#eInstTotal', '3');

    // Hint dinâmico deve mostrar 3x de R$ 300,00
    await expect(page.locator('#installHint')).toContainText('300,00');

    await page.locator('#mEntry button:has-text("Salvar")').click();
    await expect(page.locator('#appToast')).toContainText('Lançamento salvo');

    // Valor na tabela deve ser 300,00
    await expect(page.locator('.amt', { hasText: '300,00' }).first()).toBeVisible();
  });

});

// ──────────────────────────────────────────────────
test.describe('Lançamentos — Excluir', () => {

  test('excluir lançamento remove da tabela', async ({ page }) => {
    const desc = `Excluir ${Date.now()}`;

    await page.goto('/');
    await selecionarPrimeiroMes(page);
    await garantirBanco(page);

    // Cria entrada
    await page.locator('button:has-text("+ Lançamento")').click();
    await page.fill('#eDesc', desc);
    await page.fill('#eAmt', '10');
    await page.locator('#mEntry button:has-text("Salvar")').click();
    await expect(page.locator('#appToast')).toContainText('Lançamento salvo');

    // Abre o detalhe clicando na linha
    await page.locator(`tr.entry-row:has-text("${desc}")`).click();
    await expect(page.locator('#mDetail')).toBeVisible();

    // Confirma exclusão (aceita o confirm do browser)
    page.once('dialog', d => d.accept());
    await page.locator('#detailActions button:has-text("Excluir")').click();

    await expect(page.locator('#appToast')).toContainText('excluído');
    await expect(page.locator(`td:has-text("${desc}")`)).toBeHidden();
  });

});

// ──────────────────────────────────────────────────
test.describe('Mês — Criar', () => {

  test('criar novo mês aparece na sidebar', async ({ page }) => {
    await page.goto('/');

    const qtdAntes = await page.locator('.month-item').count();

    await page.locator('button.add-btn').click(); // "novo mês"
    await expect(page.locator('#mMonth')).toBeVisible();

    // Seleciona mês e ano que provavelmente não existe
    await page.selectOption('#mSel', 'Dezembro');
    await page.fill('#mYear', '2099');
    await page.locator('#mMonth button:has-text("Criar")').click();

    await expect(page.locator('#appToast')).toContainText('Mês criado');
    await expect(page.locator('.month-item')).toHaveCount(qtdAntes + 1);

    // Limpa: exclui o mês de teste
    const mesTeste = page.locator('.month-item', { hasText: 'Dez 2099' });
    await mesTeste.hover();
    page.once('dialog', d => d.accept());
    await mesTeste.locator('button[title="Excluir mês"]').click();
    await expect(page.locator('.month-item', { hasText: 'Dez 2099' })).toBeHidden();
  });

  test('meta é salva ao criar mês', async ({ page }) => {
    await page.goto('/');

    await page.locator('button.add-btn').click();
    await page.selectOption('#mSel', 'Novembro');
    await page.fill('#mYear', '2098');
    await page.fill('#mGoal', '1500');
    await page.locator('#mMonth button:has-text("Criar")').click();

    await expect(page.locator('#appToast')).toContainText('Mês criado');
    // Seleciona o mês criado e verifica a meta no subtítulo
    await page.locator('.month-item', { hasText: 'Nov 2098' }).click();
    await expect(page.locator('#tbSub')).toContainText('1.500,00');

    // Limpa
    const mesTeste = page.locator('.month-item', { hasText: 'Nov 2098' });
    await mesTeste.hover();
    page.once('dialog', d => d.accept());
    await mesTeste.locator('button[title="Excluir mês"]').click();
  });

});
