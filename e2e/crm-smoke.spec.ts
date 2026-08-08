import { test, expect } from "@playwright/test";
import {
    authSkipReason,
    hasAuth,
    login,
    volatileMask,
} from "./fixtures/auth";

const LIST_ROUTES = [
    { path: "/dashboard", name: "dashboard", heading: /dashboard/i },
    { path: "/leads", name: "leads", heading: /leads/i },
    { path: "/customers", name: "customers", heading: /customers/i },
    { path: "/deals", name: "deals", heading: /deals/i },
    { path: "/inventory", name: "inventory", heading: /inventory/i },
] as const;

test.describe("CRM smoke lists", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasAuth, authSkipReason);
        await login(page);
    });

    for (const route of LIST_ROUTES) {
        test(`${route.name} list loads`, async ({ page }, testInfo) => {
            await page.goto(route.path);
            const h1 = page.locator("h1").first();
            await expect(h1).toBeVisible({ timeout: 20_000 });
            await expect(h1).toHaveText(route.heading);

            // One critical list screenshot only (leads, desktop)
            if (route.name === "leads" && testInfo.project.name === "desktop") {
                const shot = await page.screenshot({
                    fullPage: true,
                    mask: volatileMask(page),
                    animations: "disabled",
                });
                await testInfo.attach("leads-list", {
                    body: shot,
                    contentType: "image/png",
                });
            }
        });
    }
});
