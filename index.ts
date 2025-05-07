"use strict";

/*
  The overall algorithm:

  At the end of every floor, we must check whether a specific restraint was equipped during the whole floor.

  The easiest way to do this is to listen in for restraint adding attempts, and mark newly added restraints.
  It doesn't matter if the equipping ended in a failure, or the item wasn't even a proper
  restraint, the algorithm will still work.

  At the end of the floor, we now have:
   * A list of enchanted restraints the player is wearing, and
   * If the item was equipped this floor, it will be marked.
   * It it doesn't have a mark:
    * It was equipped on a prev. floor OR
    * It was equipped bef7ore installing this mod.
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

  If you removed an item that already has some levels, and put it back:
    Min 5:
      You can't help but notice that putting the ${RestraintName} on felt a little good...

    Min 10:
      You felt so lonely without the ${RestraintName}, but finally it's back!

    Min 14:
      How did the ${RestraintName} even get off? You promise you'll never take it off again.

*/

// #region Levelling up and keeping track
// **************************************

if (!KDEventMapGeneric.postApply) KDEventMapGeneric.postApply = {};
KDEventMapGeneric.postApply.bwb_newRestraint = (
  _e,
  data: KDEventData_PostApply
) => {
  const item = data.item as BWB_WearableInstance;
  // Technically, this line should belong in keepitallsafe.ts
  assureRestraintDataCorrect(item);

  // Truthy, if we're currently removing an item, and this one becomes the top.
  // In this case, we're not actually equipping anything new.
  if (data.UnLink) return;
  // We don't care about generic items.
  if (!data.item.inventoryVariant) return;

  modifyVariantData(item, (item) => (item.bwb_isNewRestraint = true));
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
      item.bwb_lockLevel = 0;
    } else {
      item.bwb_level++;
    }

    if (item.bwb_hasNewLock) {
      item.bwb_hasNewLock = false;
    } else if (!item.bwb_hasNewLock && item.lock) {
      item.bwb_lockLevel++;
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

      // Base: +7% stat per level
      // Lock: +1% stat per level

      const levelBonus = 1.07 ** item.bwb_level;
      const lockBonus = 1.01 ** item.bwb_lockLevel;

      switch (e.trigger) {
        // The icon's "power" is used for something? Better not mess with it.
        case "icon":
          continue;
        // For some reason, this event's power is not like the others, it's POW+1 instead of POW.
        case "afterCalcManaPool":
          let baseAmt = e.bwb_basePower - 1;
          e.power = 1 + baseAmt * levelBonus * lockBonus;
          break;
        default:
        case "tick":
          e.power = e.bwb_basePower * levelBonus * lockBonus;
          break;
      }
    }
  });
}

let Orig_KinkyDungeonLock = KinkyDungeonLock;
globalThis.KinkyDungeonLock = function(...args) {
  const item = args[0] as BWB_WearableInstance;
  const newLockType = args[1];
  // Combinations:
  // Giving empty lock              = removing lock, we don't care
  // Item has lock, giving new lock = upgrading lock, doesn't count as new lock
  // Item has no lock, giving one   = new lock, we care about that event
  if (item.inventoryVariant && !item.lock && newLockType) {
    modifyVariantData(item, item => {
      item.bwb_hasNewLock = true;
    })
  }

  return Orig_KinkyDungeonLock(...args);
}

let Orig_KDAdvanceLevel = KDAdvanceLevel;
globalThis.KDAdvanceLevel = function (...args) {
  const retVal = Orig_KDAdvanceLevel(...args);
  // This code MUST be run AFTER advancing the level, that's when the level
  // variables will be correct

  if (MiniGameKinkyDungeonLevel > KDGameData.HighestLevelCurrent) {
    const wornRestraints = KinkyDungeonAllRestraintDynamic();
    for (const r of wornRestraints) {
      const item = r.item as BWB_WearableInstance;

      // Mundane restraints don't have stats to increase
      // Unique restraints are too special
      if (!item.inventoryVariant) continue;

      // Armors don't count, no matter how enchanted they are.
      const baseRestraint = KDRestraint(item);
      if (baseRestraint.armor) continue;

      // New restraints do not count, only for the next level
      if (item.bwb_isNewRestraint) {
        // Clear the new restraint flag, it's not new for the next level
        modifyVariantData(item, (item) => {
          item.bwb_isNewRestraint = false;
          item.bwb_hasNewLock = false;
        });
        continue;
      }

      // TODO: check for mimic handling.

      // TODO: Do something with locked restraints
      //       But only, if it was locked througout the whole floor.
      //       A bit extra stat buff?
      //if (!r.item.lock)

      increaseRestraintLevel(item);

      const fullName = KDGetItemName(r.item);
      let flavorTextKey: FlavorTextKey;
      let color = KDBasePink;
      switch (item.bwb_level) {
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
          if (item.bwb_level >= Level_XHigh + 2 && item.bwb_level % 3 == 0) {
            flavorTextKey = "BWB_Powerup_TooHigh";
          } else {
            flavorTextKey = "BWB_Powerup_Generic";
            color = KDBaseWhite;
          }
          break;
      }
      const text = BWB_TextGet(flavorTextKey, {
        RestraintName: fullName,
      });
      KinkyDungeonSendTextMessage(5, text, color, 5);

      if (
        item.bwb_level >= 5 &&
        !r.item.lock &&
        KinkyDungeonIsLockable(KDRestraint(item))
      ) {
        KinkyDungeonSendTextMessage(
          5,
          BWB_TextGet("BWB_LockUrge"),
          KDBasePink,
          5
        );
      }
    }
  }
  return retVal;
};

// #endregion

// #region Renaming
// ****************

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
globalThis.KinkyDungeonRun = function () {
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
globalThis.KinkyDungeonDrawInventorySelected = function (...args) {
  const retVal = Orig_KinkyDungeonDrawInventorySelected(...args);
  if (retVal && isRenaming) {
    const selectedItem = args[0].item as BWB_WearableInstance;
    const xOffset = args[3];

    // Copied from KinkyDungeonInventory.ts, KinkyDungeonDrawInventory()
    let x = canvasOffsetX_ui + xOffset + 640 * KinkyDungeonBookScale - 2 + 18;
    let y = canvasOffsetY_ui + 483 * KinkyDungeonBookScale - 5 + 52;

    // Cancel renaming if we select another item
    if (selectedItem.inventoryVariant !== currentlyRenamingItem) {
      cancelRenaming();
      return retVal;
    }

    let tf = KDTextField(
      "BWB_RenameTextField",
      x + KDInventoryActionSpacing * 2,
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
    return BWB_TextGet("BWB_InventoryAction_Rename");
  },
  icon: (_player, _item) => {
    if (isRenaming) {
      // Checkmark icon
      return "InventoryAction/Use";
    } else {
      // I could use the captive rename icon, but this one stands out more
      return `Data/BWB_Rename${getSupportedLanguageCode()}`;
    }
  },
  valid: (_player, _item) => {
    return true;
  },
  show: (_player, _item) => {
    return true;
  },
  click: (_player, item: BWB_WearableInstance) => {
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
KDInventoryActionsDefault.restraint = (item: BWB_WearableInstance) => {
  // Worn restraints should always have their inventoryVariant set.
  // If not, it's a mundane (or unique) restraint.
  const retVal = Orig_restraint(item);
  if (
    (item.inventoryVariant && bwb_alwaysAllowRenaming()) ||
    (item.bwb_level && item.bwb_level >= Level_GiveName)
  ) {
    retVal.push("BWBRename");
  }
  return retVal;
};
KDInventoryActionsDefault.looserestraint = (item: BWB_WearableInstance) => {
  // Loose restraints however, are weird.
  // Their properties depend on their source (uneqipped, or picked up)
  const retVal = Orig_looserestraint(item);
  const itemTemplate = KDGetRestraintVariant(item);
  if (!itemTemplate) return retVal;

  if (
    bwb_alwaysAllowRenaming() ||
    (item.bwb_level && item.bwb_level >= Level_GiveName)
  ) {
    retVal.push("BWBRename");
  }
  return retVal;
};

const Orig_KDGetItemName = KDGetItemName;
globalThis.KDGetItemName = function (...args): string {
  const item = args[0] as BWB_WearableInstance;
  if (item && item.bwb_trueName) return item.bwb_trueName;
  const template = KDGetRestraintVariant(item) as BWB_VariantTemplate;
  if (template && template.bwb_trueName) return template.bwb_trueName;
  return Orig_KDGetItemName(...args);
};

const Orig_KDGetItemNameString = KDGetItemNameString;
globalThis.KDGetItemNameString = function (name: string): string {
  // For this function call, the cast is OK.
  const template = KDGetRestraintVariant({ name } as item) as BWB_VariantTemplate;
  if (template && template.bwb_trueName) return template.bwb_trueName;
  return Orig_KDGetItemNameString(name);
};

// #endregion

// #region Flavor for locking
// **************************

const Orig_Lockclick = KDInventoryAction.Lock.click;
KDInventoryAction.Lock.click = (e, item: Readonly<BWB_WearableInstance>) => {
  Orig_Lockclick(e, item);
  if (!item.bwb_level) return;

  let textKey: FlavorTextKey;
  if (item.bwb_level >= Level_XHigh) {
    textKey = "BWB_SelfLock_XHigh";
  } else if (item.bwb_level >= Level_High) {
    textKey = "BWB_SelfLock_High";
  } else if (item.bwb_level >= Level_Medium) {
    textKey = "BWB_SelfLock_Medium";
  }
  if (textKey) {
    KinkyDungeonSendTextMessage(5, BWB_TextGet(textKey, { RestraintName: KDGetItemName(item) }), KDBasePink, 2);
  }
};

// #endregion

// #region Stop removing
// *********************

const Orig_KinkyDungeonStruggle = KinkyDungeonStruggle;
globalThis.KinkyDungeonStruggle = function(struggleGroup: string, StruggleType: string, index: number, query: boolean = false, retData?: KDStruggleData) {
  let restraint = KinkyDungeonGetRestraintItem(struggleGroup) as BWB_WearableInstance;
  if (!query && restraint && restraint.bwb_level) {
    if (restraint.bwb_level > Level_StopRemove && (
      StruggleType === 'Remove' || StruggleType === 'Unlock'
    )) {
      KinkyDungeonSendTextMessage(5, BWB_TextGet("BWB_NoRemove", { RestraintName: KDGetItemName(restraint) }), KDBasePink, 2);
      return "Fail";
    }
    if (restraint.bwb_level > Level_StopCut && StruggleType === 'Cut') {
      KinkyDungeonSendTextMessage(
        5,
        BWB_TextGet("BWB_NoCut", { RestraintName: KDGetItemName(restraint) }),
        KDBasePink,
        2
      );
      return "Fail";
    }
    if (
      restraint.bwb_level > Level_StopStruggle &&
      StruggleType === "Struggle"
    ) {
      KinkyDungeonSendTextMessage(
        5,
        BWB_TextGet("BWB_NoStruggle", {
          RestraintName: KDGetItemName(restraint),
        }),
        KDBasePink,
        2
      );
      return "Fail";
    }
  }
  return Orig_KinkyDungeonStruggle(struggleGroup, StruggleType, index, query, retData);
}

const Orig_RemoveMagicLockActionClick = KDInventoryAction.RemoveMagicLock.click;
KDInventoryAction.RemoveMagicLock.click = (e, item: BWB_WearableInstance) => {
  if (item.bwb_level && item.bwb_level >= Level_StopRemove) {
    KinkyDungeonSendTextMessage(
      5,
      BWB_TextGet("BWB_NoUnlock", { RestraintName: KDGetItemName(item) }),
      KDBasePink,
      2
    );
  } else {
    return Orig_RemoveMagicLockActionClick(e, item);
  }
};

// #endregion
