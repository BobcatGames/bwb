// This is a subset of the KD types, with only the relevant properties.
// The best would be if we could generate a .d.ts file suring the KD build process,
// but for now, this is enough.

/**
 * Restraints, armors, toys etc.
 */
interface BWB_Wearable {
  /** The "slot" where the item is worn */
  Group: string;
  armor?: boolean;
}

interface BWB_WearableInstance {
  lock: string;
  inventoryVariant: string;
  tightness: number;
  events: {
    original: string;
    power: number;
    trigger: "tick" | "inventoryTooltip";
  }[];
}

declare function KinkyDungeonAddRestraint(...args: any[]): any;
declare function KDAdvanceLevel(...args: any[]): any;
declare const MiniGameKinkyDungeonLevel: number;
declare const KDGameData: {
  HighestLevelCurrent: number;
};
declare function KinkyDungeonAllRestraintDynamic(): { item: BWB_WearableInstance }[];
declare function KDRestraint(BWB_WearableInstance): BWB_Wearable;
