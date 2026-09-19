import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { promisify } from 'node:util';

/**
 * For each book of `site/data.json`, a picture of its card in each language and a page of its own,
 * so that its address shows the card wherever it is pasted: `site/cards/`, `site/libro/` and
 * `site/book/`. The card is drawn by the page itself, asked for the card alone, and a browser with
 * no window takes the picture: `CHROME` says where it is when it is not `google-chrome`.
 */

const site = join(import.meta.dirname, '../../site');
const home = 'https://salomon.pumberto.com';
const chrome = process.env.CHROME ?? 'google-chrome';
// Not the kind that waits: this same process serves the page the browser asks for.
const run = promisify(execFile);
const types: Record<string, string> = { '.html': 'text/html', '.json': 'application/json' };

interface Judged {
	slug: string;
	title: string;
	author: string | null;
	merit: { value: number };
	read: { value: number };
	/** What is to be said wherever the book's numbers are: that the copy judged was a poor one. */
	caveat?: Record<string, string>;
}
const { books }: { books: Judged[] } = JSON.parse(await readFile(join(site, 'data.json'), 'utf8'));

const server = createServer(async (request, response) => {
	const path = normalize(new URL(request.url ?? '/', 'http://localhost').pathname);
	const file = join(site, path.endsWith('/') ? `${path}index.html` : path);
	try {
		const body = await readFile(file);
		response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
		response.end(body);
	} catch {
		response.writeHead(404).end();
	}
});
await new Promise<void>((ready) => server.listen(0, '127.0.0.1', ready));
const { port } = server.address() as { port: number };

const words = {
	es: {
		folder: 'libro',
		merit: 'Mérito literario',
		read: 'Se lee bien',
		hunch: 'La corazonada de una máquina, no un veredicto.',
		number: (value: number) => (value * 10).toFixed(1).replace('.', ',')
	},
	en: {
		folder: 'book',
		merit: 'Literary merit',
		read: 'A good read',
		hunch: "A machine's hunch, not a verdict.",
		number: (value: number) => (value * 10).toFixed(1)
	}
};
const escape = (text: string) =>
	text.replace(
		/[&<>"]/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c
	);

await mkdir(join(site, 'cards'), { recursive: true });
for (const book of books) {
	for (const [lang, t] of Object.entries(words)) {
		const picture = `cards/${book.slug}.${lang}.png`;
		await run(
			chrome,
			[
				'--headless',
				'--no-sandbox',
				'--hide-scrollbars',
				'--force-device-scale-factor=2',
				'--virtual-time-budget=5000',
				'--window-size=1200,630',
				`--screenshot=${join(site, picture)}`,
				`http://127.0.0.1:${port}/index.html?card=${book.slug}&lang=${lang}`
			],
			{ timeout: 60_000 }
		);
		const to = `/?book=${book.slug}&lang=${lang}`;
		const title = escape(`${book.title} · Salomón`);
		const says = escape(
			`${t.merit} ${t.number(book.merit.value)} · ${t.read} ${t.number(book.read.value)}. ${t.hunch}${book.caveat?.[lang] ? ` ${book.caveat[lang]}` : ''}`
		);
		await mkdir(join(site, t.folder, book.slug), { recursive: true });
		await writeFile(
			join(site, t.folder, book.slug, 'index.html'),
			`<!doctype html>
<html lang="${lang}">
	<head>
		<meta charset="utf-8" />
		<title>${title}</title>
		<meta name="description" content="${says}" />
		<meta property="og:type" content="article" />
		<meta property="og:title" content="${title}" />
		<meta property="og:description" content="${says}" />
		<meta property="og:url" content="${home}/${t.folder}/${book.slug}/" />
		<meta property="og:image" content="${home}/${picture}" />
		<meta property="og:image:width" content="2400" />
		<meta property="og:image:height" content="1260" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta http-equiv="refresh" content="0; url=${to}" />
	</head>
	<body>
		<a href="${to}">${title}</a>
	</body>
</html>
`
		);
	}
	console.log(book.slug);
}
server.close();
