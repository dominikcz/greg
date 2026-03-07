/**
 * Pure DOM event handlers for rehype-code-group tab switching.
 * No Svelte state — attach via onclick / onkeydown on the .greg root.
 */
export function handleCodeGroupClick(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;

	const tab = target.closest('.rcg-tab');
	if (!(tab instanceof HTMLButtonElement)) return;

	const group = tab.closest('.rehype-code-group');
	if (!(group instanceof HTMLElement)) return;

	const tabs = Array.from(group.querySelectorAll('.rcg-tab'));
	const blocks = Array.from(group.querySelectorAll('.rcg-block'));
	const index = tabs.indexOf(tab);
	if (index < 0 || index >= blocks.length) return;

	tabs.forEach((item) => {
		item.classList.remove('active');
		item.setAttribute('aria-selected', 'false');
	});
	blocks.forEach((block) => {
		block.classList.remove('active');
		block.setAttribute('hidden', 'true');
	});

	tab.classList.add('active');
	tab.setAttribute('aria-selected', 'true');

	const activeBlock = blocks[index];
	activeBlock.classList.add('active');
	activeBlock.removeAttribute('hidden');
}

export function handleCodeGroupKeydown(event: KeyboardEvent) {
	if (event.key !== 'Enter' && event.key !== ' ') return;
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;
	if (!target.closest('.rcg-tab')) return;
	event.preventDefault();
	handleCodeGroupClick(event as unknown as MouseEvent);
}
