export type LazyModuleState = "idle" | "loading" | "loaded" | "error";

export interface LazyModuleLoader<K extends string, T> {
    ensure: (key: K) => Promise<T | null>;
    getComponent: (key: K) => T | null;
    getState: (key: K) => LazyModuleState;
}

export function createLazyModuleLoader<K extends string, T>(
    loaders: Record<K, () => Promise<{ default: T }>>,
    notify: () => void,
    label: string,
): LazyModuleLoader<K, T> {
    const components = new Map<K, T>();
    const states = new Map<K, LazyModuleState>();
    const pendingLoads = new Map<K, Promise<T | null>>();

    for (const key of Object.keys(loaders) as K[]) {
        states.set(key, "idle");
    }

    function setState(key: K, nextState: LazyModuleState) {
        if (states.get(key) === nextState) return;
        states.set(key, nextState);
        notify();
    }

    return {
        ensure(key) {
            const loadedComponent = components.get(key);
            if (loadedComponent) {
                return Promise.resolve(loadedComponent);
            }

            const pendingLoad = pendingLoads.get(key);
            if (pendingLoad) {
                return pendingLoad;
            }

            setState(key, "loading");

            const loadPromise = loaders[key]()
                .then((module) => {
                    components.set(key, module.default);
                    states.set(key, "loaded");
                    notify();
                    return module.default;
                })
                .catch((error) => {
                    states.set(key, "error");
                    notify();
                    console.error(`Failed to load ${label} "${key}".`, error);
                    return null;
                })
                .finally(() => {
                    pendingLoads.delete(key);
                });

            pendingLoads.set(key, loadPromise);
            return loadPromise;
        },
        getComponent(key) {
            return components.get(key) ?? null;
        },
        getState(key) {
            return states.get(key) ?? "idle";
        },
    };
}
