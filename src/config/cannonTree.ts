import { baseTree } from "./baseTree";

export const cannonTree = baseTree.map((node) => ({
    ...node,
    id: `c-${node.id}`,
    parentIds: node.parentIds?.map((parentId) => `c-${parentId}`),
}));
