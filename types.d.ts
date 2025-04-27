// This is a subset of the KD types, with only the relevant properties,
// extended with the mod specific properties/types.
// All mod-specific stuff must be nullable.

// The best would be if we could generate a .d.ts file during the KD build process,
// but for now, this is enough.

/**
 * Restraints, armors, toys etc.
 */
interface BWB_Wearable {
  /** The "slot" where the item is worn */
  Group: string;
  armor?: boolean;
}

interface BWB_CustomData {
  /** The restraint was equipped this floor. */
  bwb_isNewRestraint?: boolean;
  /** The bond level, i.e. the number of completed floors with the restraint equipped. */
  bwb_level?: number;
  /** The true, player-chosen name of the item */
  bwb_trueName?: string;
}

/**
 * A specific instance of a wearable. In the mod, only used when it's an actual variant.
 */
interface BWB_WearableInstance extends BWB_CustomData {
  name: string;
  lock: string;
  inventoryVariant: string;
  tightness: number;
  events: {
    original: string;
    power: number;
    trigger: string;
    /** The original power, before the level ups. */
    bwb_basePower?: number;
  }[];
}

type KDEventData_PostApply = {
  player: any;
  item: BWB_WearableInstance | null;
  host: any;
  keep: boolean;
  Link: boolean;
  UnLink: boolean;
};


// Colors:
declare const KDBasePink;
declare const KDBaseYellow;
declare const KDBaseWhite;

// Global variables and function, with simplified typing.

declare const MiniGameKinkyDungeonLevel: number;
declare const KDGameData: {
  HighestLevelCurrent: number;
};
declare const KDInventoryAction: Record<string, object>;
declare const KDEventEnchantmentModular: Record<string, any>;
declare const KDInventoryActionsDefault: Record<
  string,
  (item: Readonly<BWB_WearableInstance>) => string[]
>;
declare let KinkyDungeonDrawState: string;

declare function KinkyDungeonAddRestraint(...args: any[]): any;
declare function KDAdvanceLevel(...args: any[]): any;
declare function KinkyDungeonAllRestraintDynamic(): {
  item: Readonly<BWB_WearableInstance>;
}[];
declare const KDEventMapGeneric: Record<
  string,
  Record<string, (e: string, ...data: any) => void>
>;
declare function KDRestraint(
  instance: BWB_WearableInstance
): Readonly<BWB_Wearable>;
declare function addTextKey(name: string, text: string): void;
declare function KDGetItemName(item: BWB_WearableInstance): string;
declare function KDGetItemNameString(name: string): string;
declare function KinkyDungeonSendTextMessage(
  priority: number,
  text: string,
  color: string,
  time?: number
): boolean;
declare function KinkyDungeonRun(): boolean;
declare function KinkyDungeonDrawInventorySelected(...args: any[]): boolean;
declare function KDTextField(name: string, left: number, top: number, width: number, height: number, type?: string, value?: string, maxLength?: string): any;
declare function ElementValue(id: string, value?: string): string;
declare function KinkyDungeonInventoryAdd(item: BWB_WearableInstance, ...args: any[]):void;
declare function KDGetRestraintVariant(
  item: Readonly<BWB_WearableInstance>
): BWB_WearableInstance;
