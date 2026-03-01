import { visit, SKIP } from 'unist-util-visit';

const START_DELIMITER_REGEX = /^::: code-group(?:\s+labels=\[([^\]]+)\])?$/;
const END_DELIMITER = ':::';

const languageLabelMap = {
	javascript: 'js',
	typescript: 'ts',
	bash: 'sh',
	shell: 'sh',
	sh: 'sh',
};

function getNodeText(node) {
	if (!node) return '';
	if (node.type === 'text') return node.value ?? '';
	if (!node.children) return '';
	return node.children.map(getNodeText).join('');
}

function isIgnorableNode(node) {
	if (!node) return true;
	if (node.type === 'text') return !String(node.value ?? '').trim();
	if (node.type === 'comment') return true;
	if (node.type === 'element' && node.tagName === 'p') {
		const text = getNodeText(node).trim();
		return text.length === 0;
	}
	return false;
}

function normalizeClassNameList(value) {
	if (Array.isArray(value)) return value;
	if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
	return [];
}

function normalizeLanguageLabel(value) {
	const normalized = String(value ?? '').trim().toLowerCase();
	if (!normalized) return '';
	return languageLabelMap[normalized] ?? normalized;
}

function findLanguageFromClassName(className) {
	const classList = normalizeClassNameList(className);
	const match = classList.find((name) => /^language-/.test(name));
	if (!match) return '';
	return normalizeLanguageLabel(match.replace(/^language-/, ''));
}

function getElementProperty(properties, keys) {
	for (const key of keys) {
		if (properties?.[key] !== undefined) return String(properties[key]);
	}
	return '';
}

function inferLabelFromElement(node) {
	if (!node || node.type !== 'element') return '';

	const explicitTitle = getElementProperty(node.properties, ['data-code-title', 'dataCodeTitle']);
	if (explicitTitle.trim()) return explicitTitle.trim();

	const directLang = getElementProperty(node.properties, ['data-code-lang', 'dataCodeLang', 'data-language', 'dataLanguage']);
	if (directLang.trim()) return normalizeLanguageLabel(directLang);

	const fromClass = findLanguageFromClassName(node.properties?.className);
	if (fromClass) return fromClass;

	for (const child of node.children ?? []) {
		const nested = inferLabelFromElement(child);
		if (nested) return nested;
	}

	return '';
}

function inferLabelFromRaw(node) {
	if (!node || node.type !== 'raw') return '';
	const raw = String(node.value ?? '');

	const titleMatch = raw.match(/data-code-title=["']([^"']+)["']/i);
	if (titleMatch?.[1]) return titleMatch[1].trim();

	const langAttr = raw.match(/data-(?:code-)?lang(?:uage)?=["']([^"']+)["']/i);
	if (langAttr?.[1]) return normalizeLanguageLabel(langAttr[1]);

	const classLang = raw.match(/class=["'][^"']*language-([a-z0-9_-]+)[^"']*["']/i);
	if (classLang?.[1]) return normalizeLanguageLabel(classLang[1]);

	return '';
}

function inferLabelFromBlock(block, index) {
	if (block?.type === 'element') {
		const label = inferLabelFromElement(block);
		if (label) return label;
	}

	if (block?.type === 'raw') {
		const label = inferLabelFromRaw(block);
		if (label) return label;
	}

	return `Tab ${index + 1}`;
}

function createTabs(tabLabels, uniqueId) {
	return {
		type: 'element',
		tagName: 'div',
		properties: { className: ['rcg-tab-container'], role: 'tablist' },
		children: tabLabels.map((label, index) => ({
			type: 'element',
			tagName: 'button',
			properties: {
				type: 'button',
				className: ['rcg-tab', ...(index === 0 ? ['active'] : [])],
				role: 'tab',
				'aria-selected': index === 0 ? 'true' : 'false',
				'aria-controls': `${uniqueId}-block-${index}`,
				id: `${uniqueId}-tab-${index}`,
			},
			children: [{ type: 'text', value: label }],
		})),
	};
}

function createBlockWrapper(block, uniqueId, index) {
	const isActive = index === 0;
	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['rcg-block', ...(isActive ? ['active'] : [])],
			role: 'tabpanel',
			'aria-labelledby': `${uniqueId}-tab-${index}`,
			id: `${uniqueId}-block-${index}`,
			...(isActive ? {} : { hidden: true }),
		},
		children: [block],
	};
}

export default function rehypeCodeGroup() {
	return (tree) => {
		let counter = 0;

		visit(tree, 'element', (node, index, parent) => {
			if (!parent || typeof index !== 'number') return;
			if (node.tagName !== 'p') return;

			const startText = getNodeText(node).trim();
			const startMatch = startText.match(START_DELIMITER_REGEX);
			if (!startMatch) return;

			let endIndex = -1;
			for (let i = index + 1; i < parent.children.length; i++) {
				const candidate = parent.children[i];
				if (candidate.type !== 'element' || candidate.tagName !== 'p') continue;
				if (getNodeText(candidate).trim() === END_DELIMITER) {
					endIndex = i;
					break;
				}
			}
			if (endIndex === -1) return;

			const explicitLabels = (startMatch[1] ?? '').split(',').map((label) => label.trim()).filter(Boolean);
			const uniqueId = `rcg-${counter++}`;
			const between = parent.children.slice(index + 1, endIndex);
			const codeBlocks = between.filter((child) => !isIgnorableNode(child));
			const usedLabels = codeBlocks.map((block, blockIndex) => {
				return explicitLabels[blockIndex] ?? inferLabelFromBlock(block, blockIndex);
			});

			const groupNode = {
				type: 'element',
				tagName: 'div',
				properties: { className: ['rehype-code-group'] },
				children: [
					createTabs(usedLabels, uniqueId),
					...codeBlocks.map((block, blockIndex) => createBlockWrapper(block, uniqueId, blockIndex)),
				],
			};

			parent.children.splice(index, endIndex - index + 1, groupNode);

			return [SKIP, index + 1];
		});

		visit(tree, 'element', (node) => {
			if (!node.properties?.className) return;
			node.properties.className = normalizeClassNameList(node.properties.className);
		});
	};
}
