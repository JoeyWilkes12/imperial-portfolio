# Imperial portfolio

A minimal standalone copy of Imperial 2.0 for Joey Wilkes. Three websites, professional experience, seven academic reports, and a complete digital résumé with the original QR destination. Reservoir Thinning is the featured report. Blog and sample content have been removed.

Published at https://joeywilkes12.github.io/imperial-portfolio/.

## Local development

```sh
npm ci
npm run build
npm run serve
```

Open http://127.0.0.1:4173/.

## Shared content

The workspace `shared-assets/` folder is the canonical reusable source. Run `npm run sync:assets` from the parent workspace to refresh the bundled content and downloads, then `npm run build`. This repository includes all required assets, so it builds independently on GitHub. Layouts and styles remain local to this version. Source metadata is retained in `content/`.

The résumé reproduces the supplied Word document, including roles and dates; its latest employment entry ends in October 2022. Its QR retains the personal website router destination.

## Verification and publishing

```sh
npm run test:ui
npm run check:links
```

Playwright checks navigation, all report routes, downloads, source résumé content, JavaScript-disabled access, reduced motion, and overflow at 390px and 1440px. Link checks verify internal content and every external HTTP redirect; broken destinations fail the run. The Pages workflow publishes only after these checks pass. Every page is pre-rendered, with a sitemap, generous robots policy, structured metadata, and a machine-readable profile.
