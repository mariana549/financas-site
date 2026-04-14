// ══════════════════════════════════════════════════
// AUTH SETUP — Faz login e salva sessão para os demais testes
// Executa UMA vez antes de todos os outros testes.
// Requer: TEST_EMAIL e TEST_PASSWORD no arquivo .env.test
// ══════════════════════════════════════════════════

const { test: setup, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const AUTH_FILE = path.join(__dirname, '../.auth/state.json');

setup('autenticar', async ({ page }) => {
  const email    = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Credenciais não encontradas.\n' +
      'Crie o arquivo .env.test com TEST_EMAIL e TEST_PASSWORD.'
    );
  }

  await page.goto('/');

  // Aguarda a tela de login aparecer
  await expect(page.locator('#authScreen')).toBeVisible({ timeout: 10_000 });

  await page.fill('#authEmail', email);
  await page.fill('#authPassword', password);
  await page.click('#authBtn');

  // Login bem-sucedido: sidebar com lista de meses fica visível
  await expect(page.locator('#monthList')).toBeVisible({ timeout: 20_000 });

  // Salva localStorage (sessão Supabase) para reutilizar nos testes
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
