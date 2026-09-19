/**
 * What in a commit would give an API key away. It goes by the keys' own values, taken from `.env`,
 * because not every provider's keys have a shape to know them by; and by that shape where there
 * is one, for the key that never made it to `.env`.
 */

/** Where a key shows, and whose. Never the key. */
export interface Leak {
	file: string;
	what: string;
}

/** Variables that hold a secret, as opposed to a setting such as a model's name. */
const secretName = /(KEY|TOKEN|SECRET)$/;
const shapes = [{ what: 'what looks like an OpenRouter key', shape: /sk-or-v1-[0-9a-f]{20,}/ }];
const envFiles = /(^|\/)\.env(\..+)?$/;
const example = /(^|\/)\.env\.example$/;

/**
 * @param diff What is staged, as `git diff --cached` prints it.
 * @param env The variables of `.env`, or none if there is no such file.
 */
export function leaks(diff: string, env: Record<string, string | undefined>): Leak[] {
	const secrets = Object.entries(env).flatMap(([name, value]) =>
		// A value too short to be a key would turn up anywhere.
		secretName.test(name) && value && value.length >= 8 ? [{ name, value }] : []
	);
	const found = new Map<string, Leak>();
	const add = (file: string, what: string) => found.set(`${file}\n${what}`, { file, what });

	let file = '';
	let inHunk = false;
	for (const line of diff.split('\n')) {
		if (line.startsWith('diff --git ')) {
			inHunk = false;
		} else if (!inHunk && line.startsWith('+++ ')) {
			file = line.slice(4).replace(/^b\//, '');
			if (envFiles.test(file) && !example.test(file)) add(file, 'the file the keys are kept in');
		} else if (line.startsWith('@@')) {
			inHunk = true;
		} else if (inHunk && line.startsWith('+')) {
			const added = line.slice(1);
			for (const { name, value } of secrets) {
				if (added.includes(value)) add(file, `the value of ${name}`);
			}
			for (const { what, shape } of shapes) {
				if (shape.test(added)) add(file, what);
			}
			const assigned = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)/.exec(added);
			if (example.test(file) && assigned?.[1] && secretName.test(assigned[1])) {
				add(file, `a value for ${assigned[1]}, which belongs in .env`);
			}
		}
	}
	return [...found.values()];
}
