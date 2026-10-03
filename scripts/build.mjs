import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const SITE = 'https://joeywilkes12.github.io/imperial-portfolio/';
const load = file => JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));
const websites = load('websites.json');
const academic = load('academic.json');
const resume = load('resume.json');
const docs = academic.documents;
const featured = docs.find(d => d.slug === 'reservoir-thinning');
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow = external => `<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${external ? '<path d="M6 18 18 6M6 6h12v12"/>' : '<path d="M4 12h15M13 6l6 6-6 6"/>'}</svg>`;
const ext = (url,label) => `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}${arrow(true)}</a>`;
const routes = [['portfolio/', 'Portfolio'], ['experience/', 'Experience'], ['academic/', 'Academic'], ['resume/', 'Résumé']];
const pages = [];
function page(path, title, description, body, data = {}) {
  const prefix = '../'.repeat(path.split('/').filter(Boolean).length);
  const nav = routes.map(([url,label]) => `<a href="${prefix}${url}"${path === url ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const schema = {'@context':'https://schema.org','@type':path ? 'WebPage':'ProfilePage',name:title,url:SITE+path,description,about:{'@type':'Person',name:resume.name,sameAs:[resume.contact.github,resume.contact.linkedin]},...data};
  const html = `<!doctype html>
<html lang="en" class="no-js"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(path ? title+" — Joey Wilkes" : "Joey Wilkes — Data, AI & Engineering")}</title><meta name="description" content="${e(description)}">
<meta name="theme-color" content="#edefea"><link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="website"><meta property="og:title" content="${e(path ? title+" — Joey Wilkes" : "Joey Wilkes — Data, AI & Engineering")}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${SITE}${path}">
<link rel="icon" href="${prefix}assets/favicon.png"><link rel="stylesheet" href="${prefix}styles.css">
<script>document.documentElement.classList.replace('no-js','js');</script><script defer src="${prefix}script.js"></script>
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
</head><body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><a class="wordmark" href="${prefix || './'}"><span>Joey Wilkes</span><small>Data · AI · Engineering</small></a>
<nav class="desktop-nav" aria-label="Primary navigation">${nav}</nav><details class="mobile-nav"><summary>Menu</summary><nav aria-label="Mobile navigation">${nav}</nav></details></header>
${body}
<footer class="site-footer"><div class="content-shell"><p>Joey Wilkes · Data, AI &amp; engineering</p><nav aria-label="Contact links"><a href="mailto:${e(resume.contact.email)}">Email</a>${ext(resume.contact.github,'GitHub')}<a href="${prefix}resume/">Résumé</a></nav></div></footer>
</body></html>\n`;
  const out = join(root,path,'index.html'); mkdirSync(dirname(out),{recursive:true}); writeFileSync(out,html); pages.push({path,title});
}
const intro = (title,text) => `<header class="page-intro"><h1>${e(title)}</h1><p>${e(text)}</p></header>`;
const main = body => `<main id="main" class="page-main content-shell">${body}</main>`;
const trace = `<div class="trace-wrap" aria-hidden="true"><svg class="trace-static" viewBox="0 0 540 640"><path d="M270 584 C254 548 227 527 214 485 C197 432 215 388 258 352 C219 329 184 292 188 242 C191 195 230 165 270 190 C310 165 349 195 352 242 C356 292 321 329 282 352 C325 388 343 432 326 485 C313 527 286 548 270 584 M270 190 C250 141 201 94 151 112 C104 128 82 192 111 237 C135 274 184 281 225 259 M270 190 C290 141 339 94 389 112 C436 128 458 192 429 237 C405 274 356 281 315 259"/></svg><canvas id="lorenz-trace"></canvas></div>`;
page('', 'Joey Wilkes', 'Websites, research, experience, and résumé.', `<main id="main"><section class="home-hero">${trace}<div class="hero-grid content-shell"><div class="identity"><h1>Joey Wilkes</h1><p>Data, AI &amp; engineering.</p><div class="inline-links"><a class="primary-link" href="portfolio/">Explore my work${arrow(false)}</a><a href="resume/">Read résumé</a></div></div><article class="featured"><p>Featured research</p><h2>Reservoir Thinning</h2><p class="summary">${e(featured.summary)}</p><a class="primary-link" href="academic/reservoir-thinning/">Read the research${arrow(false)}</a><p class="metadata">${e(featured.documentDateLabel)} · ${featured.pageCount} pages</p></article></div></section><section class="home-sections content-shell" aria-label="Explore my work">${[['Portfolio','Three websites, built to explore.','portfolio/'],['Experience','Data engineering, analytics, and research.','experience/'],['Academic work','Seven reports and a code archive.','academic/']].map(([title,text,url])=>`<a class="link-row" href="${url}"><h2>${title}</h2><p>${text}</p>${arrow(false)}</a>`).join('')}</section></main>`);
page('portfolio/','Portfolio','Websites by Joey Wilkes.', main(intro('Portfolio','Websites and interactive resources.')+`<section class="project-list" aria-label="Websites">${websites.projects.map(p=>`<article class="project-item"><p class="category">${e(p.category)}</p><div><h2>${e(p.title)}</h2><p>${e(p.description)}</p>${ext(p.url,'Visit website')}</div></article>`).join('')}</section>`));
page('experience/','Experience','Professional experience and certifications.',main(intro('Experience','Data engineering, analytics, and applied research.')+`<section class="certification-link"><div><h2>Certifications</h2><p>${e(websites.certifications.description)}</p></div>${ext(websites.certifications.url,'Explore certifications')}</section><section aria-label="Work history">${resume.experience.map(r=>`<article class="project-item"><p class="category">${e(r.dates)}</p><div><h2>${e(r.title)}</h2><p class="organization">${e(r.organization)}</p><p>${e(r.bullets[0])}</p></div></article>`).join('')}</section><div class="inline-links"><a class="primary-link" href="../resume/">Full résumé${arrow(false)}</a></div>`));
page('academic/','Academic experience','Academic reports, research, and Python coursework.',main(intro('Academic experience','Applied mathematics, machine learning, and research.')+`<article class="academic-feature"><p class="category">Featured research · ${e(featured.documentDateLabel)}</p><div><h2>${e(featured.shortTitle)}</h2><p>${e(featured.summary)}</p><a class="primary-link" href="${featured.slug}/">Read the report${arrow(false)}</a></div></article><ul class="report-list" aria-label="Academic reports">${docs.filter(d=>d!==featured).map(d=>`<li><a href="${d.slug}/"><div><strong>${e(d.shortTitle)}</strong><small>${e(d.topics.join(' · '))} · ${d.pageCount} pages</small></div>${arrow(false)}</a></li>`).join('')}</ul><section class="coursework"><h2>Python coursework</h2><p>${e(academic.projects1.summary)}</p><div class="inline-links">${ext(academic.projects1.sourceUrl,'Explore Projects1')}${ext(academic.repository,'Final Results repository')}</div></section>`));
for (const d of docs) {
  const pdf = `../../assets/reports/${d.filename}`;
  page(`academic/${d.slug}/`,d.shortTitle,d.summary,main(`<a class="primary-link" href="../">All academic work</a><article class="report-heading"><h1>${e(d.title)}</h1><p class="summary">${e(d.summary)}</p><p class="metadata">${e(d.authors.join(' · '))}</p><p class="metadata">${d.documentDateLabel ? e(d.documentDateLabel)+' · ' : ''}${d.pageCount} pages</p><div class="inline-links"><a class="primary-link" href="${pdf}">Open PDF${arrow(false)}</a><a href="${pdf}" download>Download PDF</a>${ext(d.sourceUrl,'View source')}</div><section class="pdf-section" aria-label="Report document"><h2>${e(d.shortTitle)}</h2><iframe class="pdf-viewer" src="${pdf}#view=FitH" title="${e(d.shortTitle)} PDF" loading="lazy"></iframe></section></article>`), {mainEntity:{'@type':'CreativeWork',name:d.title,author:d.authors.map(name=>({'@type':'Person',name})),...(d.documentDate?{dateCreated:d.documentDate}:{}),encoding:{'@type':'MediaObject',contentUrl:SITE+'assets/reports/'+d.filename,encodingFormat:'application/pdf'},isBasedOn:d.sourceUrl}});
}
const role = r => `<article class="role"><h3>${e(r.title)}</h3><p class="organization">${e(r.organization)}</p><p class="metadata">${e(r.dates)} · ${e(r.location)}</p><ul>${r.bullets.map(b=>`<li>${e(b)}</li>`).join('')}</ul></article>`;
page('resume/','Résumé','Joseph Wilkes’s résumé, work experience, education, and contact information.',main(`<article class="digital-resume"><header class="resume-top"><div><h1>${e(resume.name)}</h1><p class="resume-contact"><a href="mailto:${e(resume.contact.email)}">${e(resume.contact.email)}</a><br><a href="${e(resume.contact.phoneUrl)}">${e(resume.contact.phone)}</a></p><div class="inline-links">${ext(resume.contact.linkedin,'LinkedIn')}${ext(resume.contact.github,'GitHub')}</div><div class="inline-links download-links"><a href="../assets/resume/${e(resume.downloads.word)}" download>Download Word</a><a href="../assets/resume/${e(resume.downloads.pdf)}" download>Download PDF</a></div></div><div class="qr-block"><img class="resume-qr" src="../assets/resume/resume-qr.png" width="140" height="140" alt="${e(resume.qr.alt)}"><a href="${e(resume.qr.target)}">Personal website</a></div></header><section class="resume-section"><h2>Experience</h2><div>${resume.experience.map(role).join('')}</div></section><section class="resume-section"><h2>Education</h2><div class="education">${resume.education.map(ed=>`<h3>${e(ed.degree)}</h3><p><strong>${e(ed.institution)}</strong></p><p class="metadata">${e(ed.dates)} · ${e(ed.location)}</p><p>Concentration in ${e(ed.concentration)}</p><p>GPA: ${e(ed.gpa)}</p><h3>Relevant coursework</h3><p>${e(ed.coursework.join(', '))}</p>`).join('')}</div></section></article>`));
writeFileSync(join(root,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
writeFileSync(join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p=>`<url><loc>${SITE}${p.path}</loc></url>`).join('')}</urlset>\n`);
writeFileSync(join(root,'profile.json'),JSON.stringify({name:resume.name,site:SITE,focus:['Data','AI','Engineering'],websites:websites.projects,academicReports:docs.map(d=>({title:d.title,url:SITE+'academic/'+d.slug+'/',pdf:SITE+'assets/reports/'+d.filename})),resume:SITE+'resume/',certifications:websites.certifications.url},null,2)+'\n');
writeFileSync(join(root,'llms.txt'),`# Joey Wilkes\n\nData, AI, and engineering portfolio.\n\n${pages.map(p=>`- [${p.title}](${SITE}${p.path})`).join('\n')}\n\nMachine-readable record: ${SITE}profile.json\n`);
writeFileSync(join(root,'.nojekyll'),'');
console.log(`Generated ${pages.length} static pages, sitemap, and machine-readable profile.`);
