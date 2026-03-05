<div class="spinner">
    <div class="spinner__ring"></div>
</div>

<style>
    .spinner {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .spinner__ring {
        width: 48px;
        height: 48px;
        border: 4px solid var(--border-subtle);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
