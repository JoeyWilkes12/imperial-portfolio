import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const shared = resolve(root, '../shared-assets');
const copy = (from, to) => { mkdirSync(resolve(to, '..'), { recursive: true }); copyFileSync(from, to); };
if (!existsSync(shared)) {
  console.log('Using the source assets included in this repository.');
  process.exit(0);
}
copy(join(shared, 'portfolio/websites/projects.json'), join(root, 'content/websites.json'));
copy(join(shared, 'testimonials/approved-quotes.json'), join(root, 'content/testimonials.json'));
copy(join(shared, 'academic-experience/final-results/catalog.json'), join(root, 'content/academic.json'));
const reports = join(shared, 'academic-experience/final-results');
for (const name of readdirSync(reports).filter(name => name.endsWith('.pdf'))) copy(join(reports, name), join(root, 'assets/reports', name));
const resume = join(shared, 'resume/2026-10');
copy(join(resume, 'resume.json'), join(root, 'content/resume.json'));
for (const name of ['joseph-wilkes-resume.docx', 'joseph-wilkes-resume.pdf', 'resume-qr.png']) {
  if (existsSync(join(resume, name))) copy(join(resume, name), join(root, 'assets/resume', name));
}
console.log('Synchronized shared content and downloadable source files.');
