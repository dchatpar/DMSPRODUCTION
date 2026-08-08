import { test, expect, type Page } from "@playwright/test";
import {
    authSkipReason,
    hasAuth,
    login,
} from "./fixtures/auth";

const REFERENCE_TYPE_ERROR = /reference_type must be one of/i;

async function firstInvoiceId(page: Page): Promise<string | null> {
    return page
        .evaluate(async () => {
            const res = await fetch("/api/invoices?limit=1");
            if (!res.ok) return null;
            const json = await res.json().catch(() => null);
            const list = Array.isArray(json?.data) ? json.data : [];
            return list[0]?.id ?? null;
        })
        .catch(() => null);
}

test.describe("Invoices + payments", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasAuth, authSkipReason);
        await login(page);
    });

    test("invoices list loads", async ({ page }) => {
        await page.goto("/invoices");
        const h1 = page.locator("h1").first();
        await expect(h1).toBeVisible({ timeout: 20_000 });
        await expect(h1).toContainText(/invoice/i);
    });

    test("regression: checkout never 400s with reference_type error", async ({
        page,
    }) => {
        // Same regression guard as the deals deposit: the checkout contract must
        // never reject a valid reference_type. Honest pass = 409
        // PAYMENTS_NOT_CONFIGURED when Stripe is not configured.
        const invoiceId = await firstInvoiceId(page);
        if (!invoiceId) {
            test.skip(true, "No invoice rows — Pay online not available");
        }

        // API-level regression with a real invoice id (auth cookies shared).
        const res = await page.request.post("/api/payments/checkout", {
            data: {
                reference_type: "invoice",
                reference_id: invoiceId,
                success_path: "/invoices",
                cancel_path: "/invoices",
            },
        });
        const body = (await res.json().catch(() => null)) as {
            error?: string;
            code?: string;
            data?: { url?: string } | null;
        } | null;

        expect(
            body?.error,
            `checkout must never fail with the reference_type error (got ${res.status()}: ${body?.error})`
        ).not.toMatch(REFERENCE_TYPE_ERROR);

        if (res.status() === 200) {
            expect(body?.data?.url).toBeTruthy();
        } else if (res.status() === 409) {
            expect(body?.code).toBe("PAYMENTS_NOT_CONFIGURED");
        } else if (res.status() === 400) {
            expect(body?.error).toBeTruthy();
        } else {
            expect(res.status()).toBeLessThan(400);
        }
    });

    test("desktop: Pay online menu entry triggers honest state", async ({
        page,
    }, testInfo) => {
        if (testInfo.project.name !== "desktop") {
            test.skip(true, "Pay online menu is a desktop table action");
        }

        const row = page.locator("table tbody tr").first();
        if ((await row.count()) === 0) {
            test.skip(true, "No invoice rows — Pay online not available");
        }

        const more = row.getByRole("button", { name: /more actions/i });
        await expect(more).toBeVisible({ timeout: 10_000 });
        await more.click();

        const payOnline = page.getByRole("menuitem", { name: /pay online/i });
        if ((await payOnline.count()) === 0) {
            test.skip(true, "Invoice row is not payable (Paid/Cancelled)");
        }

        const responsePromise = page.waitForResponse(
            (res) =>
                res.url().includes("/api/payments/checkout") && res.request().method() === "POST"
        );
        await payOnline.click();
        const response = await responsePromise;
        const json = (await response.json().catch(() => null)) as {
            error?: string;
            code?: string;
        } | null;

        expect(
            json?.error,
            `Pay online must never fail with the reference_type error (got ${response.status()}: ${json?.error})`
        ).not.toMatch(REFERENCE_TYPE_ERROR);

        if (response.status() === 409) {
            expect(json?.code).toBe("PAYMENTS_NOT_CONFIGURED");
        } else if (response.status() === 400) {
            expect(json?.error).toBeTruthy();
        } else {
            expect(response.status()).toBeLessThan(400);
        }
    });

    test("invoice rows show payment status", async ({ page }) => {
        await page.goto("/invoices");
        await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });

        const row = page.locator("table tbody tr").first();
        if ((await row.count()) > 0) {
            const statusText = await row.textContent();
            expect(statusText).not.toHaveLength(0);
        } else {
            const card = page.locator("div.lg\\:hidden button").first();
            if ((await card.count()) === 0) {
                test.skip(true, "No invoice rows — status column not available");
            }
            const statusText = await card.textContent();
            expect(statusText).not.toHaveLength(0);
        }
    });

    test("PDF download entry points exist", async ({ page }, testInfo) => {
        await page.goto("/invoices");
        await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });

        if (testInfo.project.name === "desktop") {
            const row = page.locator("table tbody tr").first();
            if ((await row.count()) === 0) {
                test.skip(true, "No invoice rows — PDF entry point not available");
            }
            const more = row.getByRole("button", { name: /more actions/i });
            await expect(more).toBeVisible({ timeout: 10_000 });
            await more.click();
            await expect(
                page.getByRole("menuitem", { name: /download pdf/i })
            ).toBeVisible();
        } else {
            // Mobile cards open the details modal with a Download PDF button.
            const card = page.locator("div.lg\\:hidden button").first();
            if ((await card.count()) === 0) {
                test.skip(true, "No invoice cards — PDF entry point not available");
            }
            await card.click();
            await expect(
                page.getByRole("button", { name: /download pdf/i })
            ).toBeVisible({ timeout: 10_000 });
        }
    });
});
