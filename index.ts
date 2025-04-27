"use strict";

/*
  The overall algorithm:

  At the end of every floor, we must check whether restraints were removed on this floor.
  The game does not store the history, and catching every possible way an item can be removed/unequipped
  (manually, shrine, shopkeep, offers...) is daunting, and would probably be buggy.
  A check still must happen somehow, however.

  Instead, we override the AddRestraint function, listen in for adding attempts,
  and mark newly added restraints.
  It doesn't matter if the equipping ended in a failure, or the item wasn't even a proper
  restraint, the algorithm will still work.

  At the end of the floor, we now have:
   * A list of enchanted restraints the player is wearing, and
   * If the item was equipped this floor, it will be marked.
   * It it doesn't have a mark:
    * It was equipped on a prev. floor OR
    * It was equipped before installing this mod.
  We can't really do much about the latter case, so we'll just let it slide.

  We do the magic, and then unmark all.
  That way, all currently equipped restraints will count for the next floor.

  The marks survive saving and reloading, so no extra save+load code is needed.
 */

/*
  TODO:
  - Add all other enchantments
  - Finetune the stat increase, *1.1 seems alright for base.
    But be careful for class synergies, e.g.
      Toys + trainee is OP
      Hands + warrior can be crippling

  Ideas:
  - Tightness can increase instead.
    Not b/c you cannot struggle out, but you don't want to
    Extra flavor text, if possible?
  - If the "bonding level" is high enough, allow renaming the item
    Override KDGetItemName()

  Flavor text:
    You reluctantly remove the ${RestraintName}.
    You begin to remove the ${RestraintName}, but change your mind halfway through.
    You can't remove the ${RestraintName}... but do you really want to?
    You forlornly look at the remains of the ${RestraintName}...
    You try to cut the ${RestraintName}, but your hands stop before the last cut.
    You can't cut the ${RestraintName}... but do you really want to?

  KinkyDungeonStruggle() might be good for the above.

  If you removed an item that already has some levels, and put it back:
    Min 5:
      You can't help but notice that putting the ${RestraintName} on felt a little bit good...
      Just in case.
    Min 10:
      You felt so lonely without the ${RestraintName}, but finally it's back!
      Nice and secure!
    Min 14:
      How did the ${RestraintName} even get off? You promise that you'll never take it off again.
      You promise that you'll never take it off again, and show your resolve with a nice little lock.
*/

// The main game sometimes clobbers over our custom data.
// This safety measure will copy them back.

/**
 * Stores the mod custom part of the restraints.
 * variantID -> data
 */
const customDataSafety = new Map<string, BWB_CustomData>();

/**
 * Makes a copy of the custom mod data.
 * Make sure to call it every time you make changes to a restraint.
 * @param item
 */
function keepRestraintDataSafe(item: BWB_WearableInstance) {
  const customData: BWB_CustomData = {
    bwb_isNewRestraint: item.bwb_isNewRestraint,
    bwb_level: item.bwb_level,
    bwb_trueName: item.bwb_trueName,
  }
  customDataSafety.set(item.inventoryVariant, customData);
}

const Orig_KinkyDungeonInventoryAdd = KinkyDungeonInventoryAdd;
// @ts-expect-error
KinkyDungeonInventoryAdd = function (
  item: BWB_WearableInstance,
  ...args: any[]
) {
  Orig_KinkyDungeonInventoryAdd(item, ...args);
  assureRestraintDataCorrect(item);
};

/**
 * Checks if we have a safety backup of the restraint.
 * If yes, we copy them back.
 * @param item
 */
function assureRestraintDataCorrect(item: BWB_WearableInstance) {
  const backup = customDataSafety.get(item.inventoryVariant);
  if (!backup) return;
  item.bwb_isNewRestraint = backup.bwb_isNewRestraint;
  item.bwb_level = backup.bwb_level;
  item.bwb_trueName = backup.bwb_trueName;
}

if (!KDEventMapGeneric.postApply) KDEventMapGeneric.postApply = {};
KDEventMapGeneric.postApply.bwb_newRestraint = (
  _e,
  data: KDEventData_PostApply
) => {
  assureRestraintDataCorrect(data.item);
  // Truthy, if we're currently removing an item, and this one becomes the top.
  // In this case, we're not actually equipping anything new.
  if (data.UnLink) return;
  // We don't care about generic items.
  if (!data.item.inventoryVariant) return;
  data.item.bwb_isNewRestraint = true;
  console.debug(data.item);
};

/**
 * Increases the restraints bond level, and upgrades it's stats accordingly.
 * @param item
 */
function increaseRestraintLevel(item: BWB_WearableInstance) {
  if (!item.bwb_level) {
    // New restraint the mod hasn't encountered before.
    item.bwb_level = 1;
  } else {
    item.bwb_level++;
  }

  const enchantments = Object.keys(KDEventEnchantmentModular);
  for (const e of item.events) {
    // The events array contains other, non-enchantment related events (curses etc.)
    if (!enchantments.includes(e.original)) continue;

    // Nothing to upgrade
    if (!e.power) continue;

    if (!e.bwb_basePower) {
      e.bwb_basePower = e.power;
    }

    // Calculate the new stats as function of the bond level and the base power of the enchantment.
    // This way, we can avoid a bunch of floating point issues (might not be an issue, but still),
    // and we can apply more complex functions.

    // Base: +10% stat per level
    // Might be a bit too strong?

    switch (e.trigger) {
      case "icon":
        continue;
      case "afterCalcManaPool":
        let baseAmt = e.bwb_basePower - 1;
        e.power = 1 + baseAmt * 1.1 ** item.bwb_level;
        break;
      default:
      case "tick":
        e.power = e.bwb_basePower * 1.1 ** item.bwb_level;
        break;
    }
  }
  keepRestraintDataSafe(item);
}

let Orig_KDAdvanceLevel = KDAdvanceLevel;
// @ts-expect-error
KDAdvanceLevel = function (...args) {
  const retVal = Orig_KDAdvanceLevel(...args);
  // Run the code AFTER advancing the level, that's when the level
  // variables will be correct

  if (MiniGameKinkyDungeonLevel > KDGameData.HighestLevelCurrent) {
    console.debug("BWB: New floor");
    const wornRestraints = KinkyDungeonAllRestraintDynamic();
    console.debug(wornRestraints);
    for (const r of wornRestraints) {
      // New restraints do not count, only for the next level
      if (r.item.bwb_isNewRestraint) {
        // Clear the new reatraint flag, it's not new for the next level
        r.item.bwb_isNewRestraint = false;
        keepRestraintDataSafe(r.item);
        continue;
      }

      const baseRestraint = KDRestraint(r.item);
      // Armors don't count, no matter how enchanted they are.
      // TODO: check for mimic handling.
      if (baseRestraint.armor) continue;

      // TODO: Do something with locked restraints
      //       But only, if it was locked througout the whole floor.
      //       A bit extra stat buff?
      //if (!r.item.lock)

      increaseRestraintLevel(r.item);

      const fullName = KDGetItemName(r.item);
      let flavorTextKey: FlavorTextKey;
      let color = KDBasePink;
      switch (r.item.bwb_level) {
        case Level_1:
          flavorTextKey = "BWB_Powerup_1st";
          break;
        case Level_Low:
          flavorTextKey = "BWB_Powerup_Low";
          break;
        case Level_Medium:
          flavorTextKey = "BWB_Powerup_Medium";
          break;
        case Level_High:
          flavorTextKey = "BWB_Powerup_High";
          break;
        case Level_XHigh:
          flavorTextKey = "BWB_Powerup_XHigh";
          break;
        case undefined:
          throw new Error(
            "BWBMod: increaseRestraintLevel should have set bwb_level"
          );
        default:
          if (
            r.item.bwb_level >= Level_XHigh + 2 &&
            r.item.bwb_level % 5 == 0
          ) {
            flavorTextKey = "BWB_Powerup_TooHigh";
          } else {
            flavorTextKey = "BWB_Powerup_Generic";
            color = KDBaseWhite;
          }
          break;
      }
      const text = TextGet(flavorTextKey, {
        RestraintName: fullName,
      });
      KinkyDungeonSendTextMessage(5, text, color, 5);

      // TODO: Some restraints cannot be locked, e.g. toys need a belt.
      if (r.item.bwb_level >= 5 && !r.item.lock) {
        KinkyDungeonSendTextMessage(5, TextGet("BWB_LockUrge"), KDBasePink, 5);
      }
    }
  }
  return retVal;
};

let isRenaming = false;
let currentlyRenamingItem = "";
let newName = "";

/**
 * Resets the renaming procedure, e.g. when the user clicks away.
 */
function cancelRenaming() {
  isRenaming = false;
  currentlyRenamingItem = "";
  newName = "";
}

/**
 * Performs the renaming.
 * @param item
 */
function commitRenaming(item: BWB_WearableInstance) {
  // Safetycheck
  if (item.inventoryVariant !== currentlyRenamingItem) {
    cancelRenaming();
    throw new Error(`BWBMod: Error during renaming, ${item.inventoryVariant} != ${currentlyRenamingItem}`);
  }
  item.bwb_trueName = newName.trim();
  keepRestraintDataSafe(item);
  cancelRenaming();
}

const Orig_KinkyDungeonRun = KinkyDungeonRun;
// @ts-expect-error
KinkyDungeonRun = function () {
  const retVal = Orig_KinkyDungeonRun();
  if (KinkyDungeonDrawState !== "Inventory") {
    isRenaming = false;
  }
  return retVal;
};

const Orig_KinkyDungeonDrawInventorySelected =
  KinkyDungeonDrawInventorySelected;
// @ts-expect-error
KinkyDungeonDrawInventorySelected = function (...args) {
  const retVal = Orig_KinkyDungeonDrawInventorySelected(...args);
  if (retVal && isRenaming) {
    const selectedItem = args[0].item as BWB_WearableInstance;
    const xOffset = args[3] as number;

    // Copied from KinkyDungeonInventory.ts, KinkyDungeonDrawInventory()
    // @ts-expect-error
    let x = canvasOffsetX_ui + xOffset + 640 * KinkyDungeonBookScale - 2 + 18;
    // @ts-expect-error
    let y = canvasOffsetY_ui + 483 * KinkyDungeonBookScale - 5 + 52;

    if (selectedItem.inventoryVariant !== currentlyRenamingItem) {
      cancelRenaming();
      return retVal;
    }

    let tf = KDTextField(
      "BWB_RenameTextField",
      // @ts-expect-error
      x + KDInventoryActionSpacing * 2,
      // @ts-expect-error
      y + KDInventoryActionSpacing,
      300,
      70,
      "text",
      "",
      "60"
    );
    if (tf.Created) {
      const element = tf.Element as HTMLInputElement;
      element.value = KDGetItemName(selectedItem);
      // Prevents the game loop from "handling" keypresses as shortcuts
      // Might be a good idea to merge it into the game core, into the KDTextField function.
      element.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          commitRenaming(selectedItem);
        }
      });
      element.addEventListener("keyup", (e) => {
        e.stopPropagation();
      });
      element.addEventListener("input", (e) => {
        console.debug(e);
        newName = element.value;
      });
    }
  }
  return retVal;
};

KDInventoryAction.BWBRename = {
  text: (_player, _item) => {
    return TextGet("BWB_InventoryAction_Rename");
  },
  icon: (_player, item: BWB_WearableInstance) => {
    if (isRenaming) {
      // Checkmark icon
      return "InventoryAction/Use";
    } else {
      return "Data/BWB_Rename";
    }
  },
  valid: (_player, _item) => {
    return true;
  },
  show: (_player, _item) => {
    return true;
  },
  click: (_player, item) => {
    if (isRenaming) {
      commitRenaming(item);
    } else {
      isRenaming = true;
      currentlyRenamingItem = item.inventoryVariant;
    }
  },
  cancel: (_player, _delta) => {
    return false; // NA for default actions
  },
};

const Orig_restraint = KDInventoryActionsDefault.restraint;
const Orig_looserestraint = KDInventoryActionsDefault.looserestraint;
KDInventoryActionsDefault.restraint = (item) => {
  const retVal = Orig_restraint(item);
  if (item.bwb_level /*&& item.bwb_level >= Level_Medium*/) {
    retVal.push("BWBRename");
  }
  return retVal;
};
KDInventoryActionsDefault.looserestraint = (item) => {
  const retVal = Orig_looserestraint(item);
  if (item.bwb_level && item.bwb_level >= Level_Medium) {
    retVal.push("BWBRename");
  }
  return retVal;
};

const Orig_KDGetItemName = KDGetItemName;
// @ts-expect-error
KDGetItemName = function (item: BWB_WearableInstance): string {
  return item.bwb_trueName || Orig_KDGetItemName(item);
};

type FlavorTextKey = keyof typeof TextEnglish;

declare function TextGet(key: FlavorTextKey, params?: object);
// For some reason, TS complains about TextEnglish being used before the declaration.
// But I want to keep it in a separate file.
// @ts-ignore
Object.entries(TextEnglish).forEach((e) => addTextKey(e[0], e[1]));
