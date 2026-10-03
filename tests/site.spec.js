import { expect, test } from "@playwright/test";

test("evidence ledger selects projects with pointer and keyboard", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Joey Wilkes" })).toBeVisible();
  await expect(page.locator("[data-project]")).toHaveCount(4);

  const risk = page.locator('[data-project="risk-game-prediction"]');
  await risk.click();
  await expect(risk).toHaveAttribute("aria-current", "true");
  await expect(page.locator('[data-evidence="risk-game-prediction"]')).toBeVisible();

  await risk.focus();
  await risk.press("ArrowDown");
  const movie = page.locator('[data-project="movie-revenue-modeling"]');
  await expect(movie).toBeFocused();
  await expect(movie).toHaveAttribute("aria-current", "true");

  const projectAfterReload = new URL(page.url()).hash.replace("#evidence-", "") || "reservoir-network-thinning";
  await page.reload();
  await expect(page.locator(`[data-project="${projectAfterReload}"]`)).toHaveAttribute("aria-current", "true");
  if (process.env.UPDATE_SCREENSHOTS === "1") {
    await page.screenshot({ path: `output/playwright/home-${testInfo.project.name}.png`, fullPage: true });
  }
});

test("responsive page has no horizontal overflow and native disclosures work", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const experience = page.locator("#experience details").first();
  await experience.locator("summary").click();
  await expect(experience).toHaveAttribute("open", "");
  await expect(experience.getByText("internal Python resource group")).toBeVisible();
});

test("mobile navigation exposes every destination", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/");
  const menu = page.locator(".mobile-nav");
  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");
  await expect(menu.getByRole("link", { name: "Contact" })).toBeVisible();
});

test("mobile project tap selects and scrolls to evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/");
  const row = page.locator('[data-project="conference-discourse-nlp"]');
  await row.click();
  await expect(row).toHaveAttribute("aria-current", "true");
  await expect(page).toHaveURL(/#evidence-conference-discourse-nlp$/);
  await expect(page.locator('[data-evidence="conference-discourse-nlp"]')).toBeInViewport();
});

test("reduced motion uses the static trace", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".trace-static")).toBeVisible();
  await expect(page.locator("#lorenz-trace")).toBeHidden();
  await context.close();
});

test("internal page destinations render expected content", async ({ page }) => {
  await page.goto("/projects/#reservoir-network-thinning");
  await expect(page.getByRole("heading", { name: /Learning Using Thinned Networks/ })).toBeVisible();
  await page.goto("/writing/#the-smallest-useful-automation");
  await expect(page.getByRole("heading", { name: "The Smallest Useful Automation" })).toBeVisible();
  await page.goto("/about/");
  await expect(page.getByRole("heading", { name: /Technical depth/ })).toBeVisible();
  await page.goto("/contact/");
  await expect(page.getByRole("link", { name: /GitHub/ })).toBeVisible();
});

test("content remains complete with JavaScript disabled", async ({ browser }, testInfo) => {
  const viewport = testInfo.project.name === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-evidence]")).toHaveCount(4);
  for (const card of await page.locator("[data-evidence]").all()) await expect(card).toBeVisible();
  await expect(page.locator(".recommendation-list q").first()).toContainText("work with him again in a heartbeat");
  await context.close();
});

test("home and interior pages produce no browser errors", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/", "/projects/", "/writing/", "/about/", "/contact/"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});
