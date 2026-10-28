import { test, expect, type Page } from "@playwright/test";

const emailInput = 'input[name="email"]';
const passwordInput = 'input[name="password"]';

async function loginAdmin(page: Page) {
  await page.goto("/");
  await page.locator(emailInput).fill("admin@itasset.dev");
  await page.locator(passwordInput).fill("Admin@1234");
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/$/, { timeout: 40000 });
  await page.getByRole("link", { name: /ativos/i }).click();
  await page.waitForURL(/\/assets/, { timeout: 10000 });
  await page.locator("tbody tr").first().waitFor({ timeout: 30000 });
}

test.describe("página de ativos", () => {
  test("exibe a tabela de ativos após login", async ({ page }) => {
    await page.goto("/");
    await page.locator(emailInput).fill("admin@itasset.dev");
    await page.locator(passwordInput).fill("Admin@1234");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/$/, { timeout: 40000 });
    await page.getByRole("link", { name: /ativos/i }).click();
    await page.waitForURL(/\/assets/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Ativos", exact: true })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 30000 });
  });

  test("filtra ativos por busca", async ({ page }) => {
    await loginAdmin(page);
    await page.getByPlaceholder(/buscar/i).fill("Lenovo");
    // aguarda a tabela re-renderizar com os resultados filtrados
    await page.waitForTimeout(1200);
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    // verifica apenas as linhas que têm célula de dados (ignora linhas de empty state)
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent();
      if (text && text.trim()) {
        expect(text).toMatch(/lenovo/i);
      }
    }
  });

  test("filtra ativos por status", async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole("combobox").selectOption("available");
    await page.waitForTimeout(800);
    const badges = page.locator("tbody tr td").filter({ hasText: /disponível/i });
    await expect(badges.first()).toBeVisible({ timeout: 10000 });
  });

  test("cria um novo ativo como admin", async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole("button", { name: /novo ativo/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const serial = `E2E-${Date.now()}`;
    await page.locator('input[name="serial_number"]').fill(serial);
    await page.locator('input[name="name"]').fill("Ativo E2E Playwright");
    await page.locator('input[name="brand"]').fill("TestBrand");
    await page.locator('input[name="model"]').fill("TestModel");
    await page.locator('select[name="category_id"]').selectOption({ index: 1 });
    await page.getByRole("button", { name: /cadastrar/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15000 });
    // busca pelo serial para trazer à primeira página
    await page.getByPlaceholder(/buscar/i).fill(serial);
    await expect(page.getByText(serial)).toBeVisible({ timeout: 15000 });
  });

  test("employee não vê o botão novo ativo", async ({ page }) => {
    await page.goto("/");
    await page.locator(emailInput).fill("ana.silva@itasset.dev");
    await page.locator(passwordInput).fill("Employee@1234");
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/$/, { timeout: 40000 });
    await page.getByRole("link", { name: /ativos/i }).click();
    await page.waitForURL(/\/assets/, { timeout: 10000 });
    await page.locator("tbody tr").first().waitFor({ timeout: 30000 });
    await expect(page.getByRole("button", { name: /novo ativo/i })).not.toBeVisible();
  });

  test("dropdown de exportação mostra as 3 opções", async ({ page }) => {
    await loginAdmin(page);
    await page.getByRole("button", { name: /exportar/i }).click();
    await expect(page.getByText(/excel/i)).toBeVisible();
    await expect(page.getByText(/pdf/i)).toBeVisible();
    await expect(page.getByText(/word/i)).toBeVisible();
  });

  test("navega para o histórico do ativo", async ({ page }) => {
    await loginAdmin(page);
    await page.locator("tbody tr").first().getByTitle(/histórico/i).click();
    await expect(page.getByRole("heading", { name: /histórico/i })).toBeVisible({ timeout: 15000 });
  });
});
