"use strict";

// The main game sometimes clobbers over our custom data.
// This safety measure will store them in a safe place and copy them back whenever needed.

/**
 * Copies the mod specific data from one restraint/variant to another.
 * @param src
 * @param dest
 */
function cloneCustomDataTo(
  src: BWB_WearableInstance | BWB_VariantTemplate,
  dest: BWB_WearableInstance | BWB_VariantTemplate
) {
  console.debug("Copy:");
  console.debug(src);
  console.debug(dest);
  dest.bwb_isNewRestraint = src.bwb_isNewRestraint;
  dest.bwb_level = src.bwb_level;
  dest.bwb_trueName = src.bwb_trueName;

  src.events.forEach((e: BWB_Event, i) => {
    // This is a marker that we edited the power property.
    if (!e.bwb_basePower) return;

    dest.events[i].bwb_basePower = e.bwb_basePower;
    dest.events[i].power = e.power;
  });
}

/**
 * Ensures that the restraint specific data is kept globally too.
 * Only make changes to restraints through this function!
 * @param item
 * @param modifyerFunction
 */
function modifyVariantData(
  item: BWB_WearableInstance,
  modifyerFunction: (item: BWB_WearableInstance) => void
) {
  const mutableItem = item;
  modifyerFunction(mutableItem);
  const globalVariant = KDGetRestraintVariant(item);
  cloneCustomDataTo(mutableItem, globalVariant);
}

/**
 * Checks if we have a safety backup of the restraint.
 * If yes, we copy them back.
 * @param item
 */
function assureRestraintDataCorrect(item: BWB_WearableInstance) {
  const backup = KDGetRestraintVariant(item) as BWB_VariantTemplate;
  if (!backup) return;
  cloneCustomDataTo(backup, item);
}

// When an item is added to the inventory, the game creates a new object.
const Orig_KinkyDungeonInventoryAdd = KinkyDungeonInventoryAdd;
globalThis.KinkyDungeonInventoryAdd = function (
  item: BWB_WearableInstance,
  ...args: any[]
) {
  Orig_KinkyDungeonInventoryAdd(item, ...args);
  assureRestraintDataCorrect(item);
};
