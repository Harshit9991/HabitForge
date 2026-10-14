import { expect, test } from "@playwright/test";

test("forge shell keeps stable landmark structure", async ({ page }) => {
  await page.goto("/?demo=1");
  await expect(page.locator(".topbar")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build your edge." })).toBeVisible();
  await expect(page.locator(".panel")).toHaveCount(3);
});
