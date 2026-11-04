import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkPublic(root) {
  if ((await lstat(root)).isSymbolicLink()) throw new Error('Symbolic public root');
  for (const name of await readdir(root)) {
    const path = join(root, name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || name.startsWith('.') || /\.(?:db|sqlite\d*|sql|dump|bak|backup|log|env|pem|key|map|tmp)(?:-.*)?$/i.test(name)) {
      throw new Error(`Private public artifact: ${path}`);
    }
    if (stat.isDirectory()) await checkPublic(path);
  }
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  for (const root of process.argv.slice(2)) await checkPublic(root);
}
