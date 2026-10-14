import { expect, test } from "@playwright/test";

test("desktop and mobile expose the same core navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Build your edge." })).toBeVisible();
  const trackerLink = (await page.viewportSize())!.width <= 760
    ? page.getByRole("link", { name: "Track", exact: true })
    : page.getByRole("link", { name: "Daily tracker", exact: true });
  await trackerLink.click();
  await expect(page.getByRole("heading", { name: "Keep the chain alive." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark all complete" })).toBeVisible();
});
