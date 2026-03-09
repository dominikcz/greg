<script lang="ts">
    type VersionOption = {
        version: string;
        title: string;
    };

    type Props = {
        versions: VersionOption[];
        activeVersion: string | null;
        label?: string;
        onChange: (version: string) => void;
    };

    let {
        versions = [],
        activeVersion = null,
        label = "Version",
        onChange,
    }: Props = $props();

    const activeValue = $derived(
        activeVersion && versions.some((item) => item.version === activeVersion)
            ? activeVersion
            : versions[0]?.version ?? "",
    );
</script>

{#if versions.length > 0}
    <label class="version-switcher" aria-label={label}>
        <span class="version-switcher-label">{label}</span>
        <select
            class="version-switcher-select"
            value={activeValue}
            onchange={(e) => {
                const selected = (e.currentTarget as HTMLSelectElement).value;
                if (!selected || selected === activeValue) return;
                onChange(selected);
            }}
        >
            {#each versions as item}
                <option value={item.version}>{item.title}</option>
            {/each}
        </select>
    </label>
{/if}

<style lang="scss">
    .version-switcher {
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

    .version-switcher-label {
        font-size: 0.72rem;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--greg-menu-section-color);
    }

    .version-switcher-select {
        background: transparent;
        border: none;
        font-size: 0.8rem;
        color: var(--greg-color);
        font-family: inherit;
        outline: none;
        min-width: 4.5rem;
        cursor: pointer;
    }

    @media (max-width: 900px) {
        .version-switcher {
            padding: 0.2rem 0.35rem;
        }

        .version-switcher-label {
            display: none;
        }

        .version-switcher-select {
            min-width: 3.8rem;
            font-size: 0.75rem;
        }
    }

    @media (max-width: 700px) {
        .version-switcher {
            padding: 0.2rem 0.28rem;
        }

        .version-switcher-select {
            min-width: 3.25rem;
        }
    }
</style>
