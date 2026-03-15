import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/longPress.ts");
const source = readFileSync(sourcePath, "utf8");

if (!/let suppressContextMenuUntil = 0;/.test(source)) {
    throw new Error(
        "longPress should track a suppression window for follow-up contextmenu events after a long-press fires.",
    );
}

if (
    !/function handlePointerUp\(event: PointerEvent\) \{[\s\S]*?suppressClickUntil = Date\.now\(\) \+ [A-Z_]+;[\s\S]*?suppressContextMenuUntil = Date\.now\(\) \+ [A-Z_]+;/m.test(
        source,
    )
) {
    throw new Error(
        "longPress should suppress both click and contextmenu immediately after a consumed long-press pointerup.",
    );
}

if (
    !/function handleContextMenu\(event: MouseEvent\) \{[\s\S]*?Date\.now\(\) > suppressContextMenuUntil[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopImmediatePropagation\(\);/m.test(
        source,
    )
) {
    throw new Error(
        "longPress should intercept the synthetic contextmenu that can fire after a touch long-press release.",
    );
}

if (
    !/document\.addEventListener\("contextmenu", handleContextMenu, \{[\s\S]*?capture: true,[\s\S]*?\}\);/m.test(
        source,
    )
) {
    throw new Error(
        "longPress should install contextmenu suppression at capture phase so reopened menus never see the synthetic event.",
    );
}
