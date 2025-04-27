// These type interface with the KD types, allowing to extend them with
// mod specific properties.
// All mod-specific stuff must be nullable, so that the mod can work with
// objects that come from the vanilla game.

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
