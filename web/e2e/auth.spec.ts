import { test, expect } from "@playwright/test";

const emailInput = 'input[name="email"]';
const passwordInput = 'input[name="password"]';

test.describe("autenticação", () => {
  test("exibe formulário de login na rota raiz sem sessão", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /bem-vindo/i })).toBeVisible();
    await expect(page.locator(emailInput)).toBeVisible();
    await expect(page.locator(passwordInput)).toBeVisible();
  });

  test("bloqueia credenciais inválidas", async ({ page }) => {
    await page.goto("/");
    await page.locator(emailInput).fill("invalido@test.com");
    await page.locator(passwordInput).fill("senhaerrada");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page.getByText(/credenciais|inválid|incorret/i)).toBeVisible({ timeout: 15000 });
  });

  test("login admin redireciona para o dashboard", async ({ page }) => {
    await page.goto("/");
    await page.locator(emailInput).fill("admin@itasset.dev");
    await page.locator(passwordInput).fill("Admin@1234");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 40000 });
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("login employee redireciona para o dashboard", async ({ page }) => {
    await page.goto("/");
    await page.locator(emailInput).fill("ana.silva@itasset.dev");
    await page.locator(passwordInput).fill("Employee@1234");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 40000 });
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("logout retorna para a tela de login", async ({ page }) => {
    await page.goto("/");
    await page.locator(emailInput).fill("admin@itasset.dev");
    await page.locator(passwordInput).fill("Admin@1234");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/$/, { timeout: 40000 });
    await page.getByRole("button", { name: /sair/i }).click();
    await expect(page.locator(emailInput)).toBeVisible({ timeout: 5000 });
  });
});
