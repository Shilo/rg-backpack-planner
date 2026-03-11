<script lang="ts">
    export let items: string[] = [];
</script>

<ul class="numbered-list">
    {#each items as item, i}
        <li class="numbered-row">
            <div class="numbered-header">
                <span class="number-badge">{i + 1}</span>
                <p class="numbered-text">{item}</p>
            </div>
        </li>
    {/each}
</ul>

<style>
    .numbered-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--spacing-md);
    }

    .numbered-row {
        display: flex;
        flex-direction: column;
    }

    .numbered-header {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
    }

    .number-badge {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: var(--weight-bold);
        color: var(--text-muted);
        background: rgba(255, 255, 255, 0.05);
        border: 1.5px solid var(--text-muted);
        border-radius: 4px;
        margin-top: 1px;
        box-sizing: border-box;
    }

    .numbered-text {
        margin: 0;
        font-size: var(--font-base);
        line-height: 1.5;
        color: var(--text-muted);
        flex: 1;
    }
</style>
