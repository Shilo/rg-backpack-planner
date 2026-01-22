import { baseTree } from "./baseTree";

export const vanguardTree = baseTree.map((node) => ({
    ...node,
    id: `v-${node.id}`,
    parentIds: node.parentIds?.map((parentId) => `v-${parentId}`),
}));
