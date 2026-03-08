<script lang="ts">
	import { Languages, Sun, Moon } from "@lucide/svelte";
	import SocialLink from "../components/SocialLink.svelte";

	type NavItem = {
		text: string;
		link?: string;
		target?: string;
		items?: NavItem[];
	};

	type Props = {
		rootPath: string;
		siteTitle?: string | false;
		logo?:
			| string
			| { src: string; alt?: string }
			| { light: string; dark: string; alt?: string };
		socialLinks?: { icon: string | { svg: string }; link: string; ariaLabel?: string }[];
		mainTitle?: string;
		version?: string;
		nav?: NavItem[];
		locales?: { key: string; label: string; link: string; active: boolean }[];
		langMenuLabel?: string;
		theme: "light" | "dark";
		darkModeSwitchLabel?: string;
		lightModeSwitchTitle?: string;
		darkModeSwitchTitle?: string;
		showSearch?: boolean;
		onThemeChange: (t: "light" | "dark") => void;
		navigate: (path: string) => void;
		onOpenSearch: () => void;
	};

	const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/{2})/i;
	let openDropdownIdx: number | null = $state(null);

	type FlatItem =
		| { kind: "divider" }
		| { kind: "header"; item: NavItem; depth: number }
		| { kind: "link"; item: NavItem; depth: number };

	function flatItems(items: NavItem[], depth = 0): FlatItem[] {
		const out: FlatItem[] = [];
		for (const it of items) {
			if (it.items?.length) {
				if (depth === 0 && out.length > 0)
					out.push({ kind: "divider" });
				out.push({ kind: "header", item: it, depth });
				out.push(...flatItems(it.items, depth + 1));
			} else {
				out.push({ kind: "link", item: it, depth });
			}
		}
		return out;
	}

	let {
		rootPath,
		siteTitle,
		logo,
		socialLinks = [],
		mainTitle = "Greg",
		version = "",
		nav = [],
		locales = [],
		langMenuLabel = "Change language",
		theme,
		darkModeSwitchLabel = "Appearance",
		lightModeSwitchTitle = "Switch to light theme",
		darkModeSwitchTitle = "Switch to dark theme",
		showSearch = true,
		onThemeChange,
		navigate,
		onOpenSearch,
	}: Props = $props();

	function resolveLogoSrc(
		img:
			| string
			| { src: string; alt?: string }
			| { light: string; dark: string; alt?: string }
			| undefined,
		t: "light" | "dark",
	): string {
		if (!img) return t === "dark" ? "/favicon-dark.svg" : "/favicon-light.svg";
		if (typeof img === "string") return img;
		if ("src" in img) return img.src;
		return t === "dark" ? img.dark : img.light;
	}

	const resolvedTitle = $derived(siteTitle === undefined ? mainTitle : siteTitle);
	const logoSrc = $derived(resolveLogoSrc(logo, theme));
	const logoAlt = $derived.by(() => {
		if (logo && typeof logo === "object" && "alt" in logo && logo.alt) return logo.alt;
		if (siteTitle === false) return mainTitle;
		return (resolvedTitle as string) ?? mainTitle;
	});

	let activeLocaleLink = $derived(
		locales.find((locale) => locale.active)?.link ?? locales[0]?.link ?? '',
	);
</script>

<svelte:window
	onclick={() => {
		openDropdownIdx = null;
	}}
/>
<header class="site-header">
	<div class="header-left">
		<a
			href={rootPath}
			class="site-title"
			aria-label={logoAlt}
			onclick={(e) => {
				e.preventDefault();
				navigate(rootPath);
			}}
		>
			<span
				class="site-logo"
				role="img"
				aria-label={logoAlt}
				style={`background-image: url(${logoSrc})`}
			></span>
			{#if resolvedTitle !== false}
				{resolvedTitle}
			{/if}
		</a>
		{#if version}
			<span class="version-badge">v{version}</span>
		{/if}
	</div>
	<nav class="header-nav" aria-label="Main navigation">
		{#each nav as item, i}
			{#if item.items?.length}
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div
					class="nav-dropdown"
					class:open={openDropdownIdx === i}
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
				>
					<button
						class="nav-link nav-dropdown-trigger"
						type="button"
						onclick={() => {
							openDropdownIdx = openDropdownIdx === i ? null : i;
						}}
						aria-expanded={openDropdownIdx === i}
						aria-haspopup="menu"
					>
						{item.text}
						<svg
							class="dropdown-chevron"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							aria-hidden="true"
							><polyline points="6 9 12 15 18 9" /></svg
						>
					</button>
					{#if openDropdownIdx === i}
						<div class="nav-dropdown-menu" role="menu">
							{#each flatItems(item.items!) as ri}
								{#if ri.kind === "divider"}
									<hr class="nav-dropdown-divider" />
								{:else if ri.kind === "header"}
									{#if ri.item.link}
										<a
											href={ri.item.link}
											class="nav-dropdown-group"
											class:nav-dropdown-group--nested={ri.depth >
												0}
											role="menuitem"
											target={ri.item.target ??
												(EXTERNAL_RE.test(ri.item.link)
													? "_blank"
													: undefined)}
											rel={EXTERNAL_RE.test(ri.item.link)
												? "noopener noreferrer"
												: undefined}
											onclick={(e) => {
												openDropdownIdx = null;
												if (
													!EXTERNAL_RE.test(
														ri.item.link!,
													) &&
													!ri.item.target
												) {
													e.preventDefault();
													navigate(ri.item.link!);
												}
											}}>{ri.item.text}</a
										>
									{:else}
										<p
											class="nav-dropdown-group"
											class:nav-dropdown-group--nested={ri.depth >
												0}
										>
											{ri.item.text}
										</p>
									{/if}
								{:else}
									<a
										href={ri.item.link ?? "#"}
										class="nav-dropdown-item"
										class:nav-dropdown-item--nested={ri.depth >
											0}
										role="menuitem"
										target={ri.item.target ??
											(ri.item.link &&
											EXTERNAL_RE.test(ri.item.link)
												? "_blank"
												: undefined)}
										rel={ri.item.link &&
										EXTERNAL_RE.test(ri.item.link)
											? "noopener noreferrer"
											: undefined}
										onclick={(e) => {
											openDropdownIdx = null;
											if (
												ri.item.link &&
												!EXTERNAL_RE.test(
													ri.item.link,
												) &&
												!ri.item.target
											) {
												e.preventDefault();
												navigate(ri.item.link);
											}
										}}>{ri.item.text}</a
									>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<a
					href={item.link ?? "#"}
					class="nav-link"
					target={item.target ??
						(item.link && EXTERNAL_RE.test(item.link)
							? "_blank"
							: undefined)}
					rel={item.link && EXTERNAL_RE.test(item.link)
						? "noopener noreferrer"
						: undefined}
					onclick={(e) => {
						if (
							item.link &&
							!EXTERNAL_RE.test(item.link) &&
							!item.target
						) {
							e.preventDefault();
							navigate(item.link);
						}
					}}>{item.text}</a
				>
			{/if}
		{/each}
	</nav>
	<div class="header-right">
		{#if socialLinks.length}
			<div class="header-social-links" aria-label="Social links">
				{#each socialLinks as social (social.link)}
					<SocialLink
						icon={social.icon}
						link={social.link}
						ariaLabel={social.ariaLabel}
						me={false}
					/>
				{/each}
			</div>
		{/if}
		{#if locales.length > 1}
			<label class="locale-switcher" aria-label={langMenuLabel}>
				<Languages size={15} aria-hidden="true" />
				<select
					class="locale-select"
					value={activeLocaleLink}
					onchange={(e) => {
						const selected = (e.currentTarget as HTMLSelectElement).value;
						if (!selected || selected === activeLocaleLink) return;
						if (EXTERNAL_RE.test(selected)) {
							window.location.href = selected;
							return;
						}
						navigate(selected);
					}}
				>
					{#each locales as locale}
						<option value={locale.link}>{locale.label}</option>
					{/each}
				</select>
			</label>
		{/if}
		<div class="theme-group" role="group" aria-label={darkModeSwitchLabel}>
			<button
				class="theme-btn"
				class:active={theme === "light"}
				onclick={() => onThemeChange("light")}
				type="button"
				aria-label={lightModeSwitchTitle}
				title={lightModeSwitchTitle}
				aria-pressed={theme === "light"}><Sun size={15} /></button
			>
			<button
				class="theme-btn"
				class:active={theme === "dark"}
				onclick={() => onThemeChange("dark")}
				type="button"
				aria-label={darkModeSwitchTitle}
				title={darkModeSwitchTitle}
				aria-pressed={theme === "dark"}><Moon size={15} /></button
			>
		</div>
		{#if showSearch}
			<button class="search-trigger" onclick={onOpenSearch} type="button">
				<svg
					class="search-trigger-icon"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="11" cy="11" r="8" /><line
						x1="21"
						y1="21"
						x2="16.65"
						y2="16.65"
					/>
				</svg>
				<span class="search-trigger-label">Search…</span>
				<span class="search-trigger-hint"><kbd>Ctrl</kbd><kbd>K</kbd></span>
			</button>
		{/if}
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
			background-position: center;
			background-repeat: no-repeat;
			background-size: contain;
		}

		&:hover {
			color: var(--greg-accent);
		}
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

	.header-nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
		justify-content: flex-end;
	}

	.nav-link {
		padding: 0.3rem 0.6rem;
		border-radius: 5px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--greg-color);
		text-decoration: none;
		white-space: nowrap;
		transition:
			background 0.15s,
			color 0.15s;

		&:hover {
			background: var(--greg-menu-hover-background);
			color: var(--greg-accent);
		}
	}

	.nav-dropdown {
		position: relative;
	}

	.nav-dropdown-trigger {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
		border: none;
		background: none;
		font-family: inherit;

		.dropdown-chevron {
			width: 12px;
			height: 12px;
			transition: transform 0.15s;
		}

		&[aria-expanded="true"] .dropdown-chevron {
			transform: rotate(180deg);
		}
	}

	.nav-dropdown-menu {
		position: absolute;
		top: calc(100% + 0.35rem);
		left: 0;
		min-width: 10rem;
		background: var(--greg-header-background);
		border: 1px solid var(--greg-border-color);
		border-radius: 6px;
		padding: 0.25rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		z-index: 100;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.nav-dropdown-item {
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		color: var(--greg-color);
		text-decoration: none;
		white-space: nowrap;
		transition:
			background 0.15s,
			color 0.15s;

		&:hover {
			background: var(--greg-menu-hover-background);
			color: var(--greg-accent);
		}
	}

	:global(.nav-dropdown-item--nested) {
		padding-left: 1.5rem;
	}

	.nav-dropdown-group {
		margin: 0;
		padding: 0.35rem 0.75rem 0.15rem;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--greg-menu-section-color);
		white-space: nowrap;
		text-decoration: none;
	}

	:global(a.nav-dropdown-group) {
		border-radius: 4px;
		transition:
			background 0.15s,
			color 0.15s;
		cursor: pointer;
		display: block;
		&:hover {
			background: var(--greg-menu-hover-background);
			color: var(--greg-accent);
		}
	}

	:global(.nav-dropdown-group--nested) {
		padding-left: 1.5rem;
		font-size: 0.68rem;
	}

	.nav-dropdown-divider {
		border: none;
		border-top: 1px solid var(--greg-border-color);
		margin: 0.25rem 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		justify-content: flex-end;
		max-width: 24rem;
	}

	.header-social-links {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
	}

	.locale-switcher {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.45rem;
		border: 1px solid var(--greg-border-color);
		border-radius: 6px;
		color: var(--greg-menu-section-color);
		background: var(--greg-menu-background);
		flex-shrink: 0;
	}

	.locale-select {
		background: transparent;
		border: none;
		font-size: 0.8rem;
		color: var(--greg-color);
		font-family: inherit;
		outline: none;
		min-width: 4.5rem;
		cursor: pointer;
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
		transition:
			background 0.15s,
			color 0.15s;
		outline: none;

		&:first-child {
			border-radius: 5px 0 0 5px;
		}
		&:last-child {
			border-radius: 0 5px 5px 0;
		}

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
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
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

	@media (max-width: 900px) {
		.header-right {
			max-width: none;
			gap: 0.45rem;
		}

		.locale-switcher {
			padding: 0.2rem 0.35rem;
		}

		.locale-select {
			min-width: 3.8rem;
			font-size: 0.75rem;
		}

		.search-trigger {
			width: auto;
			padding: 0.38rem 0.55rem;
		}

		.search-trigger-hint {
			display: none;
		}
	}

	@media (max-width: 700px) {
		.site-header {
			padding: 0 0.75rem;
		}

		.version-badge {
			display: none;
		}

		.locale-switcher {
			padding: 0.2rem 0.28rem;
		}

		.locale-switcher :global(svg) {
			display: none;
		}

		.locale-select {
			min-width: 3.25rem;
		}

		.theme-btn {
			padding: 0.35rem 0.4rem;
		}

		.search-trigger {
			padding: 0.38rem 0.45rem;
		}

		.search-trigger-label {
			display: none;
		}
	}
</style>
