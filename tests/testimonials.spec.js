import { expect, test } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";

const testimonials = JSON.parse(await readFile(new URL("../content/testimonials.json", import.meta.url), "utf8"));
const normalized = quote => quote.replace(/\s+/g, " ").trim();
const text = quote => `“${normalized(quote)}”`;

async function assertQuote(quote, source) {
  await expect(quote).toHaveText(text(source));
  const paragraphs = source.split(/\n\s*\n/).map(normalized);
  const expected = paragraphs.map((paragraph, index) => `${index === 0 ? "“" : ""}${paragraph}${index === paragraphs.length - 1 ? "”" : ""}`);
  await expect(quote.locator("p")).toHaveText(expected);
  for (const paragraph of await quote.locator("p").all()) await expect(paragraph).toHaveCSS("font-style", "italic");
}

async function documentRect(locator) {
  return locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height };
  });
}

test("quote-only carousel preserves all five recommendations and supports keyboard and pointer navigation", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Testimonials", exact: true }).filter({ has: page.locator(".testimonial-controls") });
  const slides = carousel.locator(".testimonial-slide");
  const current = carousel.locator(".testimonial-slide:not([hidden]) blockquote");
  const next = carousel.getByRole("button", { name: "Next testimonial" });
  const previous = carousel.getByRole("button", { name: "Previous testimonial" });
  expect(testimonials).toHaveLength(5);
  await expect(slides).toHaveCount(5);
  await expect(carousel.locator("cite, figcaption, a")).toHaveCount(0);
  for (let index = 0; index < testimonials.length; index++) {
    await assertQuote(current, testimonials[index].quote);
    await expect(carousel.locator(".testimonial-position")).toHaveText(`${index + 1} of 5`);
    expect(await slides.nth(index).evaluate(slide => [...slide.children].map(child => child.tagName))).toEqual(["BLOCKQUOTE"]);
    await next.click();
  }
  await expect(current).toHaveText(text(testimonials[0].quote));
  await previous.focus();
  await previous.press("Enter");
  await expect(current).toHaveText(text(testimonials[4].quote));
  await expect(previous).toBeFocused();
  await previous.press("ArrowRight");
  await expect(current).toHaveText(text(testimonials[0].quote));
  await next.focus();
  await next.press("Space");
  await expect(current).toHaveText(text(testimonials[1].quote));
  for (const button of [next, previous]) {
    const bounds = await button.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  expect(errors).toEqual([]);
});

test("testimonial heading, controls, and quote remain in one column with a stable control row", async ({ page }) => {
  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const heading = page.getByRole("heading", { name: "Testimonials", level: 2, exact: true });
    const carousel = page.locator(".testimonial-carousel");
    const controls = carousel.locator(".testimonial-controls");
    const current = carousel.locator(".testimonial-slide:not([hidden]) blockquote");
    const previous = carousel.getByRole("button", { name: "Previous testimonial" });
    const next = carousel.getByRole("button", { name: "Next testimonial" });
    expect(await page.locator(".testimonials-layout").evaluate(element => [...element.children].map(child => child.tagName))).toEqual(["H2", "DIV"]);
    expect(await carousel.evaluate(element => [...element.children].map(child => child.className))).toEqual(["testimonial-controls", "testimonial-slides"]);
    await previous.focus();
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
    const initialControls = await documentRect(controls);
    for (let index = 0; index < testimonials.length; index++) {
      await assertQuote(current, testimonials[index].quote);
      const headingRect = await documentRect(heading);
      const controlsRect = await documentRect(controls);
      const quoteRect = await documentRect(current);
      expect(headingRect.bottom, `${colorScheme} testimonial ${index + 1}: heading precedes controls`).toBeLessThanOrEqual(controlsRect.top + 1);
      expect(controlsRect.bottom, `${colorScheme} testimonial ${index + 1}: controls precede quote`).toBeLessThanOrEqual(quoteRect.top + 1);
      expect(Math.abs(headingRect.left - controlsRect.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(controlsRect.left - quoteRect.left)).toBeLessThanOrEqual(1);
      for (const dimension of ["top", "left", "width", "height"]) {
        expect(Math.abs(controlsRect[dimension] - initialControls[dimension]), `${colorScheme} testimonial ${index + 1}: stable controls ${dimension}`).toBeLessThanOrEqual(1);
      }
      expect(Math.abs((await documentRect(previous)).top - (await documentRect(next)).top)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await next.click();
    }
    await assertQuote(current, testimonials[0].quote);
  }
});

test("testimonials remain still with normal and reduced motion and fit both themes", async ({ page }, testInfo) => {
  await page.clock.install();
  for (const reducedMotion of ["no-preference", "reduce"]) {
    for (const colorScheme of ["light", "dark"]) {
      await page.emulateMedia({ reducedMotion, colorScheme });
      await page.goto("/");
      const quote = page.locator(".testimonial-slide:not([hidden]) blockquote");
      await expect(quote).toHaveText(text(testimonials[0].quote));
      await page.clock.fastForward(60000);
      await expect(quote).toHaveText(text(testimonials[0].quote));
      for (let index = 0; index < testimonials.length; index++) {
        await assertQuote(quote, testimonials[index].quote);
        expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        await page.getByRole("button", { name: "Next testimonial" }).click();
      }
    }
  }
});

test("all quotes are pre-rendered and readable when JavaScript is disabled", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  try {
    const page = await context.newPage();
    await page.goto(testInfo.project.use.baseURL + "/");
    const quotes = page.locator(".testimonials blockquote");
    await expect(quotes).toHaveCount(5);
    for (let index = 0; index < testimonials.length; index++) {
      await expect(quotes.nth(index)).toBeVisible();
      await assertQuote(quotes.nth(index), testimonials[index].quote);
    }
    await expect(page.locator(".testimonial-controls")).toBeHidden();
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  } finally { await context.close(); }
});

test("capture home and testimonials for visual review", async ({ page }, testInfo) => {
  test.skip(process.env.UPDATE_SCREENSHOTS !== "1", "Only refresh screenshots on request.");
  await mkdir("output/playwright", { recursive: true });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".testimonial-controls")).toBeVisible();
  await page.screenshot({ path: `output/playwright/imperial-3-0-home-${testInfo.project.name}.png` });
  await page.screenshot({ path: `output/playwright/imperial-3-0-home-${testInfo.project.name}-full.png`, fullPage: true });
  const section = page.locator(".testimonials");
  await section.screenshot({ path: `output/playwright/imperial-3-0-testimonials-${testInfo.project.name}.png` });
  await page.emulateMedia({ colorScheme: "dark" });
  await section.screenshot({ path: `output/playwright/imperial-3-0-testimonials-${testInfo.project.name}-dark.png` });
  await page.getByRole("button", { name: "Previous testimonial" }).click();
  await section.screenshot({ path: `output/playwright/imperial-3-0-testimonials-${testInfo.project.name}-last.png` });
});
