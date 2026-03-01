<script lang="ts">
	import { Sun, Moon } from '@lucide/svelte';

	type Props = {
		rootPath: string;
		mainTitle?: string;
		version?: string;
		theme: 'light' | 'dark';
		onThemeChange: (t: 'light' | 'dark') => void;
		navigate: (path: string) => void;
		onOpenSearch: () => void;
	};

	let { rootPath, mainTitle = 'Greg', version = '', theme, onThemeChange, navigate, onOpenSearch }: Props = $props();
</script>

<header class="site-header">
	<div class="header-left">
		<a href={rootPath} class="site-title" onclick={(e) => { e.preventDefault(); navigate(rootPath); }}>
			<span class="site-logo" role="img" aria-label="Greg logo"></span>
			{mainTitle}
		</a>
		{#if version}
			<span class="version-badge">v{version}</span>
		{/if}
	</div>
	<div class="header-right">
		<div class="theme-group" role="group" aria-label="Color theme">
			<button
				class="theme-btn"
				class:active={theme === 'light'}
				onclick={() => onThemeChange('light')}
				type="button"
				aria-label="Light mode"
				aria-pressed={theme === 'light'}
			><Sun size={15} /></button>
			<button
				class="theme-btn"
				class:active={theme === 'dark'}
				onclick={() => onThemeChange('dark')}
				type="button"
				aria-label="Dark mode"
				aria-pressed={theme === 'dark'}
			><Moon size={15} /></button>
		</div>
		<button class="search-trigger" onclick={onOpenSearch} type="button">
			<svg class="search-trigger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
			</svg>
			<span class="search-trigger-label">Search…</span>
			<span class="search-trigger-hint"><kbd>Ctrl</kbd><kbd>K</kbd></span>
		</button>
	</div>
</header>

<style lang="scss">
	.site-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--greg-header-height);
		padding: 0 1.25rem;
		background-color: var(--greg-header-background);
		border-bottom: 1px solid var(--greg-border-color);
		flex-shrink: 0;
		z-index: 10;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-shrink: 0;
	}

	.site-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		color: var(--greg-color);
		text-decoration: none;
		white-space: nowrap;
		letter-spacing: -0.01em;

		.site-logo {
			display: inline-block;
			width: 22px;
			height: 22px;
			flex-shrink: 0;
			background-color: var(--greg-accent);
			mask: url('/greg.svg') center / contain no-repeat;
			-webkit-mask: url('/greg.svg') center / contain no-repeat;
		}

		&:hover { color: var(--greg-accent); }
	}

	.version-badge {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--greg-menu-section-color);
		background: var(--greg-menu-background);
		border: 1px solid var(--greg-border-color);
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		justify-content: flex-end;
		max-width: 24rem;
	}

	.theme-group {
		display: flex;
		border: 1px solid var(--greg-border-color);
		border-radius: 6px;
		flex-shrink: 0;
	}

	.theme-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: 0;
		padding: 0.38rem 0.5rem;
		color: var(--greg-menu-section-color);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		outline: none;

		&:first-child { border-radius: 5px 0 0 5px; }
		&:last-child  { border-radius: 0 5px 5px 0; }

		&:focus-visible {
			outline: 2px solid var(--greg-accent);
			outline-offset: 2px;
		}

		&:hover:not(.active) {
			background: var(--greg-menu-hover-background);
			color: var(--greg-color);
		}

		&.active {
			background: var(--greg-accent-light);
			color: var(--greg-accent);
		}
	}

	.search-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.38rem 0.75rem;
		background-color: var(--greg-menu-background);
		border: 1px solid var(--greg-border-color);
		border-radius: 6px;
		color: var(--greg-menu-section-color);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 0.15s, box-shadow 0.15s;
		font-family: inherit;

		&:hover {
			border-color: var(--greg-accent);
			color: var(--greg-color);
		}

		.search-trigger-icon {
			width: 15px;
			height: 15px;
			flex-shrink: 0;
		}

		.search-trigger-label {
			flex: 1;
			text-align: left;
		}

		.search-trigger-hint {
			display: flex;
			gap: 0.15rem;
			flex-shrink: 0;

			kbd {
				background: var(--greg-background);
				border: 1px solid var(--greg-border-color);
				border-radius: 3px;
				padding: 0.05rem 0.3rem;
				font-size: 0.65rem;
				line-height: 1.5;
				font-family: inherit;
			}
		}
	}
</style>
