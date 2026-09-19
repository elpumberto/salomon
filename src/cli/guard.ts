import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { leaks } from '../guard.ts';

/** Run by git before each commit, from `.githooks/pre-commit`: refuses one that carries a key. */

function env(): Record<string, string | undefined> {
	try {
		return parseEnv(readFileSync(join(import.meta.dirname, '../../.env'), 'utf8'));
	} catch {
		return {};
	}
}

const staged = execFileSync('git', ['diff', '--cached', '--no-color', '--no-ext-diff', '-U0'], {
	encoding: 'utf8',
	maxBuffer: 1024 ** 3
});
const found = leaks(staged, env());

if (found.length > 0) {
	console.error('This commit would publish an API key:\n');
	for (const { file, what } of found) console.error(`  ${file}: ${what}`);
	console.error('\nTake it out and stage again. If it was ever pushed, revoke the key.');
	process.exit(1);
}
