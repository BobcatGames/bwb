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
  - Finetune the stat increase, *1.1 seems alright for base.
    But be careful for class synergies, e.g.
      Toys + trainee is OP
      Hands + warrior can be crippling

  Ideas:
  - Tightness can increase instead.
    Not b/c you cannot struggle out, but you don't want to
    Extra flavor text, if possible?

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
      You can't help but notice that putting the ${RestraintName} on felt a little good...
      Just in case.
    Min 10:
      You felt so lonely without the ${RestraintName}, but finally it's back!
      Nice and secure!
    Min 14:
      How did the ${RestraintName} even get off? You promise you'll never take it off again.
      You feel much safer now!
*/

if (!KDEventMapGeneric.postApply) KDEventMapGeneric.postApply = {};
KDEventMapGeneric.postApply.bwb_newRestraint = (
  _e,
  data: KDEventData_PostApply
) => {
  // Technically, this line should belong in keepitallsafe.ts
  assureRestraintDataCorrect(data.item);

  // Truthy, if we're currently removing an item, and this one becomes the top.
  // In this case, we're not actually equipping anything new.
  if (data.UnLink) return;
  // We don't care about generic items.
  if (!data.item.inventoryVariant) return;

  modifyVariantData(data.item, (item) => (item.bwb_isNewRestraint = true));
};

/**
 * Increases the restraint's bond level, and upgrades it's stats accordingly.
 * @param item
 */
function increaseRestraintLevel(item: Readonly<BWB_WearableInstance>) {
  modifyVariantData(item, (item) => {
    if (!item.bwb_level) {
      // New restraint the mod hasn't encountered before.
      item.bwb_level = Base_Level;
    } else {
      item.bwb_level++;
    }

    const enchantments = Object.keys(KDEventEnchantmentModular);
    for (const e of item.events) {
      // The events array contains other, non-enchantment related events (curses etc.)
      if (!enchantments.includes(e.original)) continue;

      // Nothing to upgrade
      if (!e.power) continue;

      // This is the first time we're upgrading this item
      if (!e.bwb_basePower) {
        e.bwb_basePower = e.power;
      }

      // Calculate the new stats as function of the bond level and the base power of the enchantment.
      // This way, we can avoid a bunch of floating point issues (might not be an issue, but still),
      // and we can apply more complex functions.

      // Base: +10% stat per level
      // Might be a bit too strong?

      switch (e.trigger) {
        // The icon's "power" is used for something? Better no mess with it.
        case "icon":
          continue;
        // For some reason, this event's power is not like the others, it's POW+1 instead of POW.
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
  });
}

let Orig_KDAdvanceLevel = KDAdvanceLevel;
// @ts-expect-error
KDAdvanceLevel = function (...args) {
  const retVal = Orig_KDAdvanceLevel(...args);
  // This code MUST be run AFTER advancing the level, that's when the level
  // variables will be correct

  if (MiniGameKinkyDungeonLevel > KDGameData.HighestLevelCurrent) {
    const wornRestraints = KinkyDungeonAllRestraintDynamic();
    for (const r of wornRestraints) {
      // New restraints do not count, only for the next level
      if (r.item.bwb_isNewRestraint) {
        // Clear the new restraint flag, it's not new for the next level
        modifyVariantData(r.item, (item) => (item.bwb_isNewRestraint = false));
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
  // Safety check
  if (item.inventoryVariant !== currentlyRenamingItem) {
    cancelRenaming();
    throw new Error(
      `BWBMod: Error during renaming, ${item.inventoryVariant} != ${currentlyRenamingItem}`
    );
  }
  modifyVariantData(item, (item) => (item.bwb_trueName = newName.trim()));
  cancelRenaming();
}

const Orig_KinkyDungeonRun = KinkyDungeonRun;
// @ts-expect-error
KinkyDungeonRun = function () {
  const retVal = Orig_KinkyDungeonRun();
  // Cancel renaming if we switch screens
  if (KinkyDungeonDrawState !== "Inventory") {
    cancelRenaming();
  }
  return retVal;
};

// Technically, this function isn't the inventory screen...
// But it's way easier to implement this way,
// e.g. the currently selected item is provided to us.
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

    // Cancel renaming if we select another item
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
  icon: (_player, _item) => {
    if (isRenaming) {
      // Checkmark icon
      return "InventoryAction/Use";
    } else {
      // I could use the captive rename icon, but this one stands out more
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

// Maybe there's a cleaner way to do it, but it works
const Orig_restraint = KDInventoryActionsDefault.restraint;
const Orig_looserestraint = KDInventoryActionsDefault.looserestraint;
KDInventoryActionsDefault.restraint = (item) => {
  // Worn restraints should always have their inventoryVariant set.
  // If not, it's a mundane (or unique) restraint.
  const retVal = Orig_restraint(item);
  if (
    (item.inventoryVariant && Level_GiveName === 0) ||
    (item.bwb_level && item.bwb_level >= Level_GiveName)
  ) {
    retVal.push("BWBRename");
  }
  return retVal;
};
KDInventoryActionsDefault.looserestraint = (item) => {
  // Loose restraints however, are weird.
  // Their properties depend on their source (uneqipped, or picked up)
  const retVal = Orig_looserestraint(item);
  const itemTemplate = KDGetRestraintVariant(item);
  if (!itemTemplate) return retVal;

  if (
    (Level_GiveName === 0) ||
    (item.bwb_level && item.bwb_level >= Level_GiveName)
  ) {
    retVal.push("BWBRename");
  }
  return retVal;
};

const Orig_KDGetItemName = KDGetItemName;
// @ts-expect-error
KDGetItemName = function (item: BWB_WearableInstance): string {
  if (item && item.bwb_trueName) return item.bwb_trueName;
  const template = KDGetRestraintVariant(item);
  if (template && template.bwb_trueName) return template.bwb_trueName;
  return Orig_KDGetItemName(item);
};

const Orig_KDGetItemNameString = KDGetItemNameString;
// @ts-expect-error
KDGetItemNameString = function(name: string): string {
  // For this function call, the cast is OK.
  const template = KDGetRestraintVariant({ name } as BWB_WearableInstance);
  if (template && template.bwb_trueName) return template.bwb_trueName;
  return Orig_KDGetItemNameString(name);
}

type FlavorTextKey = keyof typeof TextEnglish;

declare function TextGet(key: FlavorTextKey, params?: object);
// For some reason, TS complains about TextEnglish being used before the declaration.
// But I want to keep it in a separate file.
// @ts-ignore
Object.entries(TextEnglish).forEach((e) => addTextKey(e[0], e[1]));

