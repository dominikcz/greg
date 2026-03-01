import { visit } from 'unist-util-visit';

/**
 * Remark plugin: transforms ::: directives into VitePress-compatible containers.
 *
 * Supported types: info, tip, warning, danger, details
 *
 * Syntax (compatible with VitePress / markdown-it-container):
 *   ::: info [Custom Title]
 *   content
 *   :::
 *
 *   ::: details [Custom Title] [{open}]
 *   content
 *   :::
 *
 * @typedef {Object} ContainersOptions
 * @property {string} infoLabel    - Default label for info. Default: 'INFO'
 * @property {string} tipLabel     - Default label for tip. Default: 'TIP'
 * @property {string} warningLabel - Default label for warning. Default: 'WARNING'
 * @property {string} dangerLabel  - Default label for danger. Default: 'DANGER'
 * @property {string} detailsLabel - Default label for details. Default: 'Details'
 */

const defaultLabels = {
	infoLabel: 'INFO',
	tipLabel: 'TIP',
	warningLabel: 'WARNING',
	dangerLabel: 'DANGER',
	detailsLabel: 'Details',
};

const knownTypes = ['info', 'tip', 'warning', 'danger', 'details'];

export function remarkContainers(userOptions = {}) {
	const labels = { ...defaultLabels, ...userOptions };

	return (tree) => {
		visit(tree, (node) => {
			// remark-directive creates containerDirective nodes
			if (node.type !== 'containerDirective') return;

			const type = node.name?.toLowerCase();
			if (!knownTypes.includes(type)) return;

			// Extract custom title from directive label (e.g. ::: tip My Title)
			// remark-directive puts inline children as the label node
			const labelNode = node.children.find((c) => c.data?.directiveLabel);
			let title = '';
			if (labelNode) {
				title = extractText(labelNode);
				// Remove the label node from children so it doesn't appear in content
				node.children = node.children.filter((c) => !c.data?.directiveLabel);
			}

			// Check for {open} attribute on details
			const isOpen = node.attributes?.open !== undefined || /\{open\}/.test(title);
			title = title.replace(/\s*\{open\}\s*$/, '').trim();

			if (!title) {
				title = getDefaultLabel(type, labels);
			}

			if (type === 'details') {
				// Render as <details> / <summary>
				node.data = node.data || {};
				node.data.hName = 'details';
				node.data.hProperties = {
					className: ['custom-block', 'details'],
					...(isOpen ? { open: true } : {}),
				};

				// Prepend <summary> node
				node.children.unshift({
					type: 'paragraph',
					data: {
						hName: 'summary',
						hProperties: { className: ['custom-block-title'] },
					},
					children: [{ type: 'text', value: title }],
				});
			} else {
				// Render as <div class="custom-block {type}">
				node.data = node.data || {};
				node.data.hName = 'div';
				node.data.hProperties = { className: ['custom-block', type] };

				// Prepend title <p class="custom-block-title">
				node.children.unshift({
					type: 'paragraph',
					data: {
						hName: 'p',
						hProperties: { className: ['custom-block-title'] },
					},
					children: [{ type: 'text', value: title }],
				});
			}
		});
	};
}

function getDefaultLabel(type, labels) {
	switch (type) {
		case 'info':    return labels.infoLabel;
		case 'tip':     return labels.tipLabel;
		case 'warning': return labels.warningLabel;
		case 'danger':  return labels.dangerLabel;
		case 'details': return labels.detailsLabel;
		default:        return type.toUpperCase();
	}
}

function extractText(node) {
	let text = '';
	visit(node, 'text', (t) => { text += t.value; });
	return text.trim();
}
