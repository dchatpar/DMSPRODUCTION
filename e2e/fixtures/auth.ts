import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const e2eEmail = process.env.E2E_EMAIL?.trim();
export const e2ePassword = process.env.E2E_PASSWORD?.trim();
export const hasAuth = Boolean(e2eEmail && e2ePassword);

export const authSkipReason =
    "Set E2E_EMAIL and E2E_PASSWORD to run authenticated specs";

/** Login via the public /login form. Requires E2E_EMAIL + E2E_PASSWORD. */
export async function login(page: Page) {
    if (!e2eEmail || !e2ePassword) {
        throw new Error(authSkipReason);
    }
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(e2eEmail);
    await page.locator("#password-input, input[type='password']").first().fill(e2ePassword);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 30_000,
    });
}

/** axe WCAG 2 A/AA — color-contrast left to brand/visual QA. */
export async function axeScan(page: Page, routeName: string) {
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"])
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

/** Mask volatile chrome for critical-route screenshots. */
export function volatileMask(page: Page) {
    return [
        page.locator("time"),
        page.locator("[data-testid='avatar']"),
        page.locator("img[alt*='avatar' i]"),
    ];
}
