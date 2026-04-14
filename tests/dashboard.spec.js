// ══════════════════════════════════════════════════
// DASHBOARD — Testes da tela principal
// ══════════════════════════════════════════════════

const { test, expect } = require('@playwright/test');

test.describe('Dashboard', () => {

  test('carrega app e mostra sidebar após login', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#monthList')).toBeVisible();
    await expect(page.locator('#userEmail')).not.toBeEmpty();
  });

  test('filtros de período ficam visíveis e o ativo tem destaque', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#filterBar')).toBeVisible();

    // Pelo menos um chip deve ter a classe active
    const activeChip = page.locator('.filter-chip.active');
    await expect(activeChip).toBeVisible();
  });

  test('trocar filtro de período re-renderiza a lista de meses', async ({ page }) => {
    await page.goto('/');

    const monthsAntes = await page.locator('.month-item').count();

    // Clica em "Todos"
    await page.locator('.filter-chip', { hasText: 'Todos' }).click();
    await expect(page.locator('.filter-chip.active')).toHaveText('Todos');

    const monthsDepois = await page.locator('.month-item').count();
    // Com filtro "Todos" deve ter >= meses que com filtro padrão
    expect(monthsDepois).toBeGreaterThanOrEqual(monthsAntes);
  });

  test('selecionar um mês mostra o dashboard daquele mês', async ({ page }) => {
    await page.goto('/');

    const primeiroMes = page.locator('.month-item').first();
    await expect(primeiroMes).toBeVisible();
    await primeiroMes.click();

    // Título do topbar atualiza com o nome do mês
    await expect(page.locator('#tbTitle')).not.toHaveText('Selecione um mês');

    // Cards de resumo aparecem
    await expect(page.locator('.summary-grid .card').first()).toBeVisible();
  });

  test('card de assinaturas é clicável e navega para a view', async ({ page }) => {
    await page.goto('/');

    // Seleciona o primeiro mês para garantir que o dashboard renderizou
    await page.locator('.month-item').first().click();
    await expect(page.locator('#view-dash')).toBeVisible();

    // Se existir o card de assinaturas, clica e verifica navegação
    const subCard = page.locator('.card-link', { hasText: 'Assinaturas' });
    if (await subCard.isVisible()) {
      await subCard.click();
      await expect(page.locator('#view-subs')).toBeVisible();
    }
  });

  test('botão nav Assinaturas abre a view correta', async ({ page }) => {
    await page.goto('/');
    await page.locator('#nav-subs').click();
    await expect(page.locator('#view-subs')).toBeVisible();
    await expect(page.locator('#subsContent')).toBeVisible();
  });

  test('modo privacidade faz blur nos valores', async ({ page }) => {
    await page.goto('/');
    await page.locator('.month-item').first().click();
    await expect(page.locator('#dashContent')).toBeVisible();

    // Ativa privacidade
    await page.click('#privacyBtn');
    await expect(page.locator('html')).toHaveAttribute('data-privacy', 'on');

    // Desativa
    await page.click('#privacyBtn');
    await expect(page.locator('html')).toHaveAttribute('data-privacy', 'off');
  });

  test('busca global filtra lançamentos em tempo real', async ({ page }) => {
    await page.goto('/');
    await page.locator('.month-item').first().click();
    await page.waitForSelector('#globalSearch', { timeout: 5000 });

    await page.fill('#globalSearch', 'xyzimpossivel123');

    // Todas as linhas de lançamento devem ficar ocultas
    const rows = page.locator('#view-dash .entry-row');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toBeHidden();
    }

    // Limpa busca — linhas voltam
    await page.fill('#globalSearch', '');
    if (count > 0) {
      await expect(rows.first()).toBeVisible();
    }
  });

});
