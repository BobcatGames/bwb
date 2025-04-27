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

interface BWB_CustomItemData {
  /** The restraint was equipped this floor. */
  bwb_isNewRestraint?: boolean;
  /** The bond level, i.e. the number of completed floors with the restraint equipped. */
  bwb_level?: number;
  /** The true, player-chosen name of the item */
  bwb_trueName?: string;
  events: BWB_Event[];
}

interface BWB_Event extends KinkyDungeonEvent {
  /** The original power, before the level ups. */
  bwb_basePower?: number;
}

/**
 * The template for a variant, extended with mod specific data.
 */
type BWB_VariantTemplate = KDRestraintVariant & BWB_CustomItemData;

/**
 * A specific instance of a wearable. In the mod, only used when it's an actual variant.
 */
type BWB_WearableInstance = BWB_CustomItemData & item;
