import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const portfolioUrls = [
  "https://joeywilkes12.github.io/queens-model-assessment/#/executive-summary",
  "https://joeywilkes12.github.io/agent-skills-resource-library/",
  "https://joeywilkes12.github.io/4amj-landing-page-01/"
];
const certificateUrl = "https://joeywilkes12.github.io/certifications-site/";
// Source contracts: the seven archived PDF titles and the downloaded résumé.
const reports = [
  { slug: "reservoir-thinning", title: "Learning Using Thinned Networks: A Crowdsourcing Phenomena in Reservoir Computing", shortTitle: "Reservoir Thinning" },
  { slug: "risk-game-prediction", title: "RISK Data Project Fall 2020", shortTitle: "RISK Game Prediction" },
  { slug: "general-conference-nlp", title: "A Natural Language Processing Analysis of General Conference Discourses Employing Time-Series and Classification Models", shortTitle: "General Conference NLP" },
  { slug: "prediction-movie-revenue", title: "Let's All Go To The Movies", shortTitle: "Predicting Movie Revenue" },
  { slug: "non-trivial-evasion", title: "Non-Trivial Evasion", shortTitle: "Non-Trivial Evasion" },
  { slug: "non-trivial-pursuit", title: "Non-Trivial Pursuit", shortTitle: "Non-Trivial Pursuit" },
  { slug: "literature-review", title: "Evaluation of Childhood Computational Thinking with ScratchJR and Robot Toys: A Literature Review", shortTitle: "Childhood Computational Thinking" }
];
const routes = [
  { path: "/", heading: "Joey Wilkes", title: "Joey Wilkes" },
  { path: "/portfolio/", heading: "Portfolio", title: "Portfolio" },
  { path: "/experience/", heading: "Experience", title: "Experience" },
  { path: "/academic/", heading: "Academic experience", title: "Academic experience" },
  { path: "/resume/", heading: "Joseph Wilkes", title: "Résumé" },
  ...reports.map(report => ({ path: `/academic/${report.slug}/`, heading: report.title, title: report.shortTitle }))
];
const roles = [
  { title: "Data Engineer", organization: "Varian – A Siemens Healthineers Company", date: "June 2022 – Oct 2022", location: "Vineyard, UT", bullets: 4 },
  { title: "Analyst, SaaS Delivery", organization: "Anglepoint", date: "May 2021 – June 2022", location: "Lindon, UT", bullets: 3 },
  { title: "Research Assistant", organization: "Mathematics Department, B.Y.U.", date: "Apr 2020 – May 2021", location: "Provo, UT", bullets: 3 },
  { title: "Data Analytics Intern", organization: "Imagine Learning", date: "May 2019 – Aug 2019", location: "Provo, UT", bullets: 3 }
];
const navDestinations = [
  ["Portfolio", "/portfolio/"], ["Experience", "/experience/"],
  ["Academic", "/academic/"], ["Résumé", "/resume/"]
];

async function assertNoOverflow(page, route) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  }));
  expect(dimensions.content, `${route} content exceeds the viewport`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function assertResume(page) {
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Joseph Wilkes", exact: true })).toBeVisible();
  await expect(main.locator(".role")).toHaveCount(4);
  for (const role of roles) {
    const entry = main.locator(".role").filter({ has: page.getByRole("heading", { name: role.title, exact: true }) });
    await expect(entry).toContainText(role.organization);
    await expect(entry).toContainText(role.date);
    await expect(entry).toContainText(role.location);
    await expect(entry.getByRole("listitem")).toHaveCount(role.bullets);
  }
  // Keep quantitative source details and the entire education record intact.
  for (const text of ["30+ interactive components", "200+ GB", "Saved 12+ hours", "millions of dollars", "Core Value Award", "12+ individuals", "10+ TB", "two research conferences", "Developed 12+ features", "geospatial analysis", "BS, Applied & Computational Mathematics (ACME)", "Brigham Young University", "April 2021", "Business Management", "GPA: 3.50"]) {
    await expect(main).toContainText(text);
  }
  for (const subject of ["Machine Learning", "Optimization", "Algorithm Design", "Linear Algebra", "Differential Equations", "C++", "Technical Writing", "Statistics", "Marketing", "Finance", "Probability"]) {
    await expect(main).toContainText(subject);
  }
  await expect(main.getByRole("link", { name: "joseph.benson.wilkes@gmail.com", exact: true })).toHaveAttribute("href", "mailto:joseph.benson.wilkes@gmail.com");
  await expect(main.getByRole("link", { name: "801.648.0940", exact: true })).toHaveAttribute("href", "tel:+18016480940");
}

test("all 12 pages render meaningful content without overflow, blog content, or browser errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", request => {
    const failure = request.failure()?.errorText;
    // Headless Chromium does not support PDF navigation; HTTP/MIME/signature tests above
    // cover each PDF, and the actual viewer is checked in Chrome during visual QA.
    // https://playwright.dev/docs/api/class-page#page-goto
    if (new URL(request.url()).pathname.endsWith(".pdf") && failure === "net::ERR_ABORTED") return;
    errors.push(`${request.url()}: ${failure}`);
  });
  for (const route of routes) {
    const response = await page.goto(route.path);
    expect(response.status(), route.path).toBe(200);
    await expect(page).toHaveTitle(route.path === "/" ? "Joey Wilkes — Data, AI & Engineering" : `${route.title} — Joey Wilkes`);
    await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await assertNoOverflow(page, route.path);
    const visibleText = await page.locator("body").innerText();
    expect(visibleText, route.path).not.toMatch(/\b(blog|placeholder|lorem ipsum|coming soon|under construction|sample content)\b/i);
    await expect(page.locator('a[href*="/writing"], a[href*="/blog"], a[href="#"], a[href=""]')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("primary navigation reaches every page with pointer and keyboard", async ({ page }, testInfo) => {
  await page.goto("/");
  const mobile = testInfo.project.name === "mobile";
  for (const [name, path] of navDestinations) {
    let nav;
    if (mobile) {
      const menu = page.locator(".mobile-nav");
      await menu.locator("summary").focus();
      await menu.locator("summary").press("Enter");
      await expect(menu).toHaveAttribute("open", "");
      nav = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
    } else {
      nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
    }
    const link = nav.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    if (mobile) expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
    if (name === "Résumé") {
      await link.focus();
      await link.press("Enter");
    } else {
      await link.click();
    }
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    const currentNav = page.getByRole("navigation", { name: mobile ? "Mobile navigation" : "Primary navigation", exact: true, includeHidden: true });
    await expect(currentNav.getByRole("link", { name, exact: true, includeHidden: true })).toHaveAttribute("aria-current", "page");
    if (mobile) await expect(page.locator(".mobile-nav")).not.toHaveAttribute("open", "");
  }
  await page.getByRole("link", { name: "Joey Wilkes Data · AI · Engineering", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Joey Wilkes" })).toBeVisible();
});

test("portfolio includes exactly the three requested websites and experience links certifications", async ({ page }) => {
  await page.goto("/portfolio/");
  const links = page.getByRole("main").getByRole("link", { name: "Visit website", exact: true });
  await expect(links).toHaveCount(3);
  expect(await links.evaluateAll(elements => elements.map(element => element.href))).toEqual(portfolioUrls);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
  await page.goto("/experience/");
  await expect(page.getByRole("link", { name: "Explore certifications", exact: true })).toHaveAttribute("href", certificateUrl);
  for (const role of roles) {
    await expect(page.getByRole("main").getByRole("heading", { name: role.title, exact: true })).toBeVisible();
    await expect(page.getByRole("main")).toContainText(role.date);
  }
});

test("academic archive prioritizes Reservoir Thinning and exposes all seven sourced reports", async ({ page, request }) => {
  await page.goto("/academic/");
  const reportLinks = page.getByRole("main").locator('a[href]').filter({ hasText: /Read the report|Reservoir Thinning|RISK Game Prediction|General Conference NLP|Predicting Movie Revenue|Non-Trivial Evasion|Non-Trivial Pursuit|Childhood Computational Thinking/ });
  const destinations = await reportLinks.evaluateAll(elements => elements.map(element => new URL(element.href).pathname));
  expect(destinations).toEqual(reports.map(report => `/academic/${report.slug}/`));
  await expect(page.getByRole("link", { name: "Explore Projects1", exact: true })).toHaveAttribute("href", "https://github.com/JoeyWilkes12/Projects1");
  await expect(page.getByRole("link", { name: "Final Results repository", exact: true })).toHaveAttribute("href", "https://github.com/JoeyWilkes12/Final-Results");
  for (const report of reports) {
    await page.goto(`/academic/${report.slug}/`);
    await expect(page.getByRole("heading", { level: 1, name: report.title, exact: true })).toBeVisible();
    const open = page.getByRole("link", { name: "Open PDF", exact: true });
    const download = page.getByRole("link", { name: "Download PDF", exact: true });
    const pdfUrl = await open.getAttribute("href");
    await expect(download).toHaveAttribute("href", pdfUrl);
    await expect(download).toHaveAttribute("download", "");
    const response = await request.get(new URL(pdfUrl, page.url()).href);
    expect(response.status(), report.slug).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await expect(page.getByRole("link", { name: "View source", exact: true })).toHaveAttribute("href", new RegExp(`^https://github\\.com/JoeyWilkes12/Final-Results/blob/.+\\.pdf$`));
  }
});

test("digital résumé preserves source roles, dates, education, downloads, and the working QR image", async ({ page, request }) => {
  await page.goto("/resume/");
  await assertResume(page);
  for (const [name, type, signature] of [
    ["Download Word", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "PK"],
    ["Download PDF", "application/pdf", "%PDF-"]
  ]) {
    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("download", "");
    const url = new URL(await link.getAttribute("href"), page.url()).href;
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(type);
    expect((await response.body()).subarray(0, signature.length).toString()).toBe(signature);
    const downloadPromise = page.waitForEvent("download");
    await link.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(new URL(url).pathname.split("/").pop());
    expect(await download.failure()).toBeNull();
  }
  const qr = page.getByRole("img", { name: "QR code linking to Joseph Wilkes’s personal website", exact: true });
  await expect(qr).toBeVisible();
  await expect(qr).toHaveAttribute("src", "../assets/resume/resume-qr.png");
  await expect.poll(() => qr.evaluate(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)).toBe(true);
  const qrResponse = await request.get(new URL(await qr.getAttribute("src"), page.url()).href);
  expect(qrResponse.status()).toBe(200);
  expect(qrResponse.headers()["content-type"]).toContain("image/png");
  await expect(page.getByRole("link", { name: "Personal website", exact: true })).toHaveAttribute("href", "https://joeywilkes12.github.io/personal-website-router/");
});

test("all content and mobile navigation remain available with JavaScript disabled", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  try {
    for (const route of routes) {
      await page.goto(new URL(route.path, testInfo.project.use.baseURL || "http://127.0.0.1:4173").href);
      await expect(page.getByRole("heading", { level: 1, name: route.heading, exact: true })).toBeVisible();
      await assertNoOverflow(page, route.path);
    }
    await page.goto("http://127.0.0.1:4173/resume/");
    await assertResume(page);
    if (testInfo.project.name === "mobile") {
      await page.locator(".mobile-nav summary").click();
      await expect(page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link", { name: "Academic", exact: true })).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

test("reduced motion disables the animated canvas", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#lorenz-trace")).toBeHidden();
  if (testInfo.project.name === "desktop") await expect(page.locator(".trace-static")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Joey Wilkes", level: 1 })).toBeVisible();
});

test("capture home, academic archive, and résumé for visual review", async ({ page }, testInfo) => {
  test.skip(process.env.UPDATE_SCREENSHOTS !== "1", "Set UPDATE_SCREENSHOTS=1 to refresh visual review artifacts.");
  await mkdir("output/playwright", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [name, path] of [["home", "/"], ["academic", "/academic/"], ["resume", "/resume/"]]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    await page.screenshot({ path: `output/playwright/${name}-${testInfo.project.name}.png`, fullPage: true });
  }
});
