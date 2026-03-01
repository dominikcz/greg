/**
 * Drag-to-resize rune for the left nav panel splitter.
 * Returns refs and event handlers to bind on the aside + splitter elements.
 */
export function useSplitter() {
	let aside = $state<HTMLElement | undefined>(undefined);
	let splitter = $state<HTMLElement | undefined>(undefined);
	let dragging = false;

	function onMouseDown() {
		dragging = true;
	}

	function onMouseMove(e: MouseEvent) {
		if (!dragging || !aside || !splitter) return;
		aside.style.width = e.x - splitter.getBoundingClientRect().width / 2 + 'px';
		e.preventDefault();
	}

	function onMouseUp() {
		dragging = false;
	}

	return {
		get aside() { return aside; },
		set aside(el) { aside = el; },
		get splitter() { return splitter; },
		set splitter(el) { splitter = el; },
		onMouseDown,
		onMouseMove,
		onMouseUp,
	};
}
