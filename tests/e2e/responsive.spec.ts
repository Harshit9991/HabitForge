import { expect, test } from "@playwright/test";

test.describe("responsive shell", () => {
  test("does not introduce horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("keeps tracker actions available on mobile", async ({ page }) => {
    await page.goto("/tracker");
    await expect(page.getByRole("button", { name: "Mark all complete" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset day" })).toBeVisible();
    const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
    if ((await page.viewportSize())!.width <= 760) {
      await expect(mobileNavigation).toBeVisible();
    } else {
      await expect(mobileNavigation).toBeHidden();
    }
  });
});
