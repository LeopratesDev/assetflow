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

test.describe("página de categorias", () => {
  test("exibe os cards de categorias", async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole("link", { name: /categorias/i }).click();
    await page.waitForURL(/\/categories/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Categorias", exact: true })).toBeVisible();
    // aguarda ao menos um card com nome de categoria (h3 dentro do grid)
    await expect(page.locator("main h3").first()).toBeVisible({ timeout: 15000 });
  });

  test("clique em categoria filtra ativos", async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole("link", { name: /categorias/i }).click();
    await page.waitForURL(/\/categories/, { timeout: 10000 });
    // aguarda os cards carregarem
    await page.locator("main h3").first().waitFor({ timeout: 15000 });
    // clica no primeiro card navegável
    await page.locator("main h3").first().click();
    await expect(page).toHaveURL(/category_id=/, { timeout: 8000 });
    await expect(page.getByText(/filtrado por categoria/i)).toBeVisible();
  });

  test("remove filtro de categoria via badge ×", async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole("link", { name: /categorias/i }).click();
    await page.waitForURL(/\/categories/, { timeout: 10000 });
    await page.locator("main h3").first().waitFor({ timeout: 15000 });
    await page.locator("main h3").first().click();
    await page.waitForURL(/category_id=/, { timeout: 8000 });
    await page.getByTitle(/remover filtro/i).click();
    await expect(page).not.toHaveURL(/category_id=/);
    await expect(page.getByText(/filtrado por categoria/i)).not.toBeVisible();
  });

  test("cria nova categoria como admin", async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole("link", { name: /categorias/i }).click();
    await page.waitForURL(/\/categories/, { timeout: 10000 });
    await page.getByRole("button", { name: /nova categoria/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const name = `E2E Cat ${Date.now()}`;
    await page.locator('input[name="name"]').fill(name);
    await page.getByRole("button", { name: /criar/i }).click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 15000 });
  });
});
