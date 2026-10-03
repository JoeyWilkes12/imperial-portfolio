import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../',import.meta.url));
const target = join(root,'output/site');
rmSync(target,{recursive:true,force:true}); mkdirSync(target,{recursive:true});
for (const name of ['index.html','styles.css','script.js','assets','portfolio','experience','academic','resume','robots.txt','sitemap.xml','profile.json','llms.txt','.nojekyll']) cpSync(join(root,name),join(target,name),{recursive:true});
console.log('Packaged public site in output/site.');
