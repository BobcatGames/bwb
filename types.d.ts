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
  name: string;
  lock: string;
  inventoryVariant: string;
  tightness: number;
  events: {
    original: string;
    power: number;
    trigger: "tick" | "inventoryTooltip";
  }[];
}

// Colors:
declare const KDBasePink;
declare const KDBaseYellow;

declare function KinkyDungeonAddRestraint(...args: any[]): any;
declare function KDAdvanceLevel(...args: any[]): any;
declare const MiniGameKinkyDungeonLevel: number;
declare const KDGameData: {
  HighestLevelCurrent: number;
};
declare function KinkyDungeonAllRestraintDynamic(): { item: BWB_WearableInstance }[];
declare function KDRestraint(instance: BWB_WearableInstance): BWB_Wearable;

declare function addTextKey(name: string, text: string): void;
declare function TextGet(name: string, params: object): string;
declare function KDGetItemName(item: BWB_WearableInstance): string;

declare function KinkyDungeonSendTextMessage(priority: number, text: string, color: string, time?: number): boolean;

