import { mkdir, copyFile } from 'node:fs/promises';
await mkdir(new URL('../www/', import.meta.url), { recursive: true });
for (const file of ['index.html','style.css','game.js']) {
  await copyFile(new URL('../'+file, import.meta.url), new URL('../www/'+file, import.meta.url));
}
console.log('Web assets built in www/');
