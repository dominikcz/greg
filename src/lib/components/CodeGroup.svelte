<script lang="ts">
    type Props = {
        tabs: string[];
        blocks: string[];
        initialActive?: number;
    };

    let { tabs = [], blocks = [], initialActive = 0 }: Props = $props();

    let activeIndex = $state(0);

    // Keep active tab index in sync when parent-provided inputs change.
    $effect(() => {
        const maxIndex = Math.max(0, tabs.length - 1);
        activeIndex = Math.max(0, Math.min(initialActive, maxIndex));
    });
    const uid = `rcg-hydrated-${Math.random().toString(36).slice(2, 10)}`;

    function activate(index: number) {
        if (index < 0 || index >= tabs.length) return;
        activeIndex = index;
    }

    function handleKeydown(event: KeyboardEvent, index: number) {
        const last = tabs.length - 1;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate(index);
            return;
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            const next = index >= last ? 0 : index + 1;
            activate(next);
            requestAnimationFrame(() => {
                (document.getElementById(`${uid}-tab-${next}`) as HTMLButtonElement | null)?.focus();
            });
            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            const prev = index <= 0 ? last : index - 1;
            activate(prev);
            requestAnimationFrame(() => {
                (document.getElementById(`${uid}-tab-${prev}`) as HTMLButtonElement | null)?.focus();
            });
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            activate(0);
            requestAnimationFrame(() => {
                (document.getElementById(`${uid}-tab-0`) as HTMLButtonElement | null)?.focus();
            });
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            activate(last);
            requestAnimationFrame(() => {
                (document.getElementById(`${uid}-tab-${last}`) as HTMLButtonElement | null)?.focus();
            });
        }
    }
</script>

<div class="rehype-code-group">
    <div class="rcg-tab-container" role="tablist">
        {#each tabs as label, index}
            <button
                type="button"
                class="rcg-tab"
                class:active={index === activeIndex}
                role="tab"
                aria-selected={index === activeIndex ? "true" : "false"}
                aria-controls={`${uid}-block-${index}`}
                id={`${uid}-tab-${index}`}
                onclick={() => activate(index)}
                onkeydown={(event) => handleKeydown(event, index)}
            >
                {label}
            </button>
        {/each}
    </div>

    {#each blocks as block, index}
        <div
            class="rcg-block"
            class:active={index === activeIndex}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-${index}`}
            id={`${uid}-block-${index}`}
            hidden={index === activeIndex ? undefined : true}
        >
            {@html block}
        </div>
    {/each}
</div>
