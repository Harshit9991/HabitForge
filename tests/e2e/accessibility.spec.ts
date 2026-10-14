import { expect, test } from "@playwright/test";

test("interactive controls have names and visible focus", async ({ page }) => {
  await page.goto("/tracker");
  const unnamedButtons = await page.locator("button").evaluateAll((buttons) => buttons.filter((button) => !(button.getAttribute("aria-label") || button.textContent?.trim())).length);
  expect(unnamedButtons).toBe(0);
  await page.getByRole("button", { name: "Mark all complete" }).focus();
  await expect(page.getByRole("button", { name: "Mark all complete" })).toBeFocused();
});
