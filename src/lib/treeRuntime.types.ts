export type NodeIndex = number;

export type LevelsByIndex = number[];

export type TreeLevels = LevelsByIndex[];

export type Link = {
  from?: NodeIndex;
  to: NodeIndex;
};

