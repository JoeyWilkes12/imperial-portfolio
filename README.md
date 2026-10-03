# Imperial portfolio

A minimal standalone copy of Imperial 2.0 for Joey Wilkes. Three websites, certifications, seven academic reports, and a complete digital résumé with the original QR destination. The Queens AI evaluation website is featured on Home and first in Portfolio. Reservoir Thinning leads the academic archive. Blog and sample content have been removed.

Published at https://joeywilkes12.github.io/imperial-portfolio/.

## Local development

```sh
cd "imperial 3.0"
npm ci
npm run build
npm run serve
```

Run the commands from the workspace root. Open http://127.0.0.1:4314/.
This version reserves port **4314**, alongside the draft versions on 4311–4313.
The localhost server exits if its port is occupied; choose a different unused
port with `PORT=4414 npm run serve`. Stop a preview with Ctrl+C.

Home includes five complete testimonials from the shared approved quote source.
The carousel displays only each quote, with no author, affiliation, file, or
folder labels. Each complete quote is italicized and enclosed in quotation marks.
Previous and Next controls sit below the title and above the quote, keeping their
position stable as quote lengths vary. The controls and arrow keys advance it manually;
it never rotates automatically. All quotes are pre-rendered and remain readable
without JavaScript.

The header provides a light/dark theme toggle. It follows the device appearance until a visitor chooses a theme, then remembers that choice across pages and reloads. Mobile navigation uses a hamburger icon with an accessible Menu label and a close icon when expanded. Home is first among its five destinations. The Experience page contains only the certifications introduction and links to certifications and the full résumé. The résumé keeps role headings visible and responsibilities collapsed by default behind Show/Hide controls with chevrons. Native disclosures work without JavaScript. Printing retains light paper and dark text and includes every responsibility. The home feature has no background diagram.

## Shared content

The workspace `shared-assets/` folder is the canonical reusable source. Run `npm run sync:assets` from this version's folder to refresh the bundled content and downloads, then `npm run build`. Approved testimonials come from `../shared-assets/testimonials/approved-quotes.json` and are bundled in `content/testimonials.json`. This repository includes all required assets, so it builds independently on GitHub. Layouts and styles remain local to this version. Source metadata is retained in `content/`.

The résumé reproduces the supplied Word document, including roles and dates; its latest employment entry ends in October 2022. Its QR retains the personal website router destination.

## Verification and publishing

```sh
npm run test:ui
npm run check:links
```

The UI tests launch their own server and refuse to reuse an occupied port. Stop
the same-port preview first, or use `TEST_PORT=4514 npm run test:ui` to test while
the 4314 preview stays running. Test coverage includes every testimonial, manual
and keyboard navigation, both themes, no automatic rotation, reduced motion,
JavaScript-disabled reading, touch targets, and desktop/mobile overflow.

Playwright checks navigation, all report routes, downloads, source résumé content, JavaScript-disabled access, reduced motion, and overflow at 390px and 1440px. Link checks verify internal content and every external HTTP redirect; broken destinations fail the run. The Pages workflow publishes only after these checks pass. Every page is pre-rendered, with a sitemap, generous robots policy, structured metadata, and a machine-readable profile.
