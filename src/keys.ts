import { join } from 'node:path';

/**
 * The keys live in `.env` at the root of the repo, which git ignores. What the environment already
 * holds wins over the file.
 */

export const envFile = join(import.meta.dirname, '../.env');

try {
	process.loadEnvFile(envFile);
} catch (error) {
	// No file is no fault: the environment is all there is, and `key` says what is missing.
	if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export type KeyName = 'TYPESAFE_API_KEY' | 'OPENROUTER_API_KEY';

export function key(name: KeyName): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is not set: copy .env.example to .env and fill it in`);
	return value;
}
