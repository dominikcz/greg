import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const DOCS_MARKDOWN_DIR = path.join(process.cwd(), 'docs', 'guide', 'markdown');

function isMdExampleFenceStart(line) {
	return /^`{3,4}md\b/.test(line.trim());
}

function isFenceClose(line, tickCount) {
	return new RegExp(`^\\s*${'`'.repeat(tickCount)}\\s*$`).test(line);
}

function findMdExampleViolations(content) {
	const lines = content.split(/\r?\n/);
	const violations = [];

	for (let i = 0; i < lines.length; i++) {
		const startLine = lines[i].trim();
		if (!isMdExampleFenceStart(startLine)) continue;

		const tickCount = (startLine.match(/^`+/) ?? [''])[0].length;
		let closeIdx = -1;
		for (let j = i + 1; j < lines.length; j++) {
			if (isFenceClose(lines[j], tickCount)) {
				closeIdx = j;
				break;
			}
		}

		if (closeIdx === -1) {
			violations.push(`Line ${i + 1}: unclosed markdown example fence`);
			continue;
		}

		let cursor = closeIdx + 1;
		let hasOutput = false;
		for (; cursor < lines.length; cursor++) {
			const line = lines[cursor].trim();
			if (/^Output\b/i.test(line)) {
				hasOutput = true;
				break;
			}
			if (isMdExampleFenceStart(line)) break;
		}

		if (!hasOutput) {
			violations.push(`Line ${i + 1}: missing Output section after markdown example`);
		}

		i = closeIdx;
	}

	return violations;
}

describe('docs lint - markdown examples', () => {
	it('ensures every md source example has an Output section', async () => {
		const entries = await fs.readdir(DOCS_MARKDOWN_DIR, { withFileTypes: true });
		const mdFiles = entries
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
			.map((entry) => path.join(DOCS_MARKDOWN_DIR, entry.name));

		const failures = [];

		for (const filePath of mdFiles) {
			const content = await fs.readFile(filePath, 'utf8');
			const violations = findMdExampleViolations(content);
			for (const violation of violations) {
				failures.push(`${path.relative(process.cwd(), filePath)}: ${violation}`);
			}
		}

		expect(failures, failures.join('\n')).toEqual([]);
	});
});
