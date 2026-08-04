import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const email = process.env.E2E_EMAIL?.trim();
const password = process.env.E2E_PASSWORD?.trim();
const hasAuth = Boolean(email && password);

const LIST_ROUTES = [
    { path: "/inventory", name: "inventory" },
    { path: "/deals", name: "deals" },
    { path: "/leads", name: "leads" },
    { path: "/customers", name: "customers" },
] as const;

async function login(page: Page) {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.locator("#password-input, input[type='password']").first().fill(password!);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 30_000,
    });
}

async function axeScan(page: Page, routeName: string) {
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"]) // visual brand QA is separate
        .analyze();
    const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(
        serious,
        `${routeName} axe serious/critical:\n${serious
            .map((v) => `${v.id}: ${v.help}`)
            .join("\n")}`
    ).toEqual([]);
}

test.describe("UI spacing shells", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasAuth, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated spacing specs");
        await login(page);
    });

    for (const route of LIST_ROUTES) {
        test(`${route.name} list — axe + screenshot`, async ({ page }, testInfo) => {
            await page.goto(route.path);
            await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });

            // Mask volatile chrome
            const mask = [
                page.locator("time"),
                page.locator("[data-testid='avatar']"),
                page.locator("img[alt*='avatar' i]"),
            ];

            await axeScan(page, route.name);

            await expect(page).toHaveScreenshot(`${route.name}-list.png`, {
                fullPage: true,
                mask,
            });

            // Soft check: list shell vertical rhythm (space-y-5 ≈ 20px+)
            const shell = page.locator(".animate-fade-in.space-y-5, .space-y-5").first();
            if (await shell.count()) {
                const gap = await shell.evaluate((el) => {
                    const style = getComputedStyle(el);
                    return parseFloat(style.rowGap || style.gap || "0");
                });
                expect(gap, `${route.name} shell gap`).toBeGreaterThanOrEqual(16);
            }

            void testInfo;
        });
    }

    test("open Add Lead modal shell", async ({ page }) => {
        await page.goto("/leads");
        await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });

        const addBtn = page.getByRole("button", { name: /add lead|new lead/i }).or(
            page.getByRole("link", { name: /add lead|new lead/i })
        );
        if ((await addBtn.count()) === 0) {
            test.skip(true, "Add Lead control not found");
        }
        await addBtn.first().click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        await expect(dialog).toHaveScreenshot("leads-add-modal.png");
        await axeScan(page, "leads-add-modal");
    });

    test("open Add Customer modal shell", async ({ page }) => {
        await page.goto("/customers");
        await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });

        const addBtn = page.getByRole("button", { name: /add customer|new customer/i }).or(
            page.getByRole("link", { name: /add customer|new customer/i })
        );
        if ((await addBtn.count()) === 0) {
            test.skip(true, "Add Customer control not found");
        }
        await addBtn.first().click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        await expect(dialog).toHaveScreenshot("customers-add-modal.png");
        await axeScan(page, "customers-add-modal");
    });

    test("open first inventory RecordDrawer when available", async ({ page }) => {
        await page.goto("/inventory");
        await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });

        const row = page.locator("table tbody tr").first();
        if ((await row.count()) === 0) {
            test.skip(true, "No inventory rows to open drawer");
        }
        await row.click();
        const drawer = page.getByRole("dialog");
        await expect(drawer).toBeVisible({ timeout: 10_000 });
        await expect(drawer).toHaveScreenshot("inventory-drawer.png");
        await axeScan(page, "inventory-drawer");
    });
});

test.describe("Login page smoke", () => {
    test("login form renders + axe", async ({ page }) => {
        await page.goto("/login");
        await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
        await axeScan(page, "login");
        await expect(page).toHaveScreenshot("login.png", { fullPage: true });
    });
});
