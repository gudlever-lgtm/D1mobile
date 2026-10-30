import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir(new URL('../www/', import.meta.url), { recursive: true });
for (const file of ['index.html','style.css','renderer.js','game.js']) {
  await copyFile(new URL('../'+file, import.meta.url), new URL('../www/'+file, import.meta.url));
}
await cp(new URL('../assets/', import.meta.url), new URL('../www/assets/', import.meta.url), { recursive: true });
console.log('Web assets built in www/');
