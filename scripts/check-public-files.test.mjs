import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPublic } from './check-public-files.mjs';

test('publicação recusa arquivos privados e symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'trackride-public-'));
  try {
    await writeFile(join(root, 'index.html'), 'synthetic public asset');
    await checkPublic(root);
    for (const name of ['admin.db', '.env', 'backup.sql', 'app.js.map', 'database.sqlite3-wal']) {
      await writeFile(join(root, name), 'synthetic private data');
      await assert.rejects(checkPublic(root));
      await rm(join(root, name));
    }
    await symlink(join(root, 'index.html'), join(root, 'photo.png'));
    await assert.rejects(checkPublic(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
