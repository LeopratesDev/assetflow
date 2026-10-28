import { test, expect } from "@playwright/test";

const emailInput = 'input[name="email"]';
const passwordInput = 'input[name="password"]';

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator(emailInput).fill("admin@itasset.dev");
  await page.locator(passwordInput).fill("Admin@1234");
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/$/, { timeout: 40000 });
}

test.describe("dashboard", () => {
  test("exibe os stat cards principais", async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByText(/total de ativos/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/disponív/i).first()).toBeVisible();
    await expect(page.getByText(/alocado/i).first()).toBeVisible();
    await expect(page.getByText(/categorias/i).first()).toBeVisible();
  });

  test("exibe os gráficos de categoria e status", async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByText(/ativos por categoria/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/ativos por status/i)).toBeVisible();
  });

  test("exibe a tabela de alocações ativas", async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByRole("heading", { name: "Alocações Ativas" })).toBeVisible({ timeout: 20000 });
  });

  test("exibe o patrimônio total", async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByText(/patrimônio/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/R\$/)).toBeVisible();
  });

  test("sidebar navega entre todas as seções", async ({ page }) => {
    await loginAdmin(page);

    await page.getByRole("link", { name: /ativos/i }).click();
    await page.waitForURL(/\/assets/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Ativos", exact: true })).toBeVisible();

    await page.getByRole("link", { name: /categorias/i }).click();
    await page.waitForURL(/\/categories/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Categorias", exact: true })).toBeVisible();

    await page.getByRole("link", { name: /alocações/i }).click();
    await page.waitForURL(/\/allocations/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Alocações", exact: true })).toBeVisible();

    await page.getByRole("link", { name: /dashboard/i }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  });
});
