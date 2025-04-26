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

if (!KDEventMapGeneric.postApply) KDEventMapGeneric.postApply = {};
KDEventMapGeneric.postApply.bwb_newRestraint = (
  _e,
  data: KDEventData_PostApply
) => {
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
        case 1:
          flavorTextKey = "BWB_Powerup_1st";
          break;
        case 2:
          flavorTextKey = "BWB_Powerup_Low";
          break;
        case 5:
          flavorTextKey = "BWB_Powerup_Medium";
          break;
        case 10:
          flavorTextKey = "BWB_Powerup_High";
          break;
        case 14:
          flavorTextKey = "BWB_Powerup_XHigh";
          break;
        case undefined:
          throw new Error(
            "BWBMod: increaseRestraintLevel should have set bwb_level"
          );
        default:
          if (r.item.bwb_level > 15 && r.item.bwb_level % 5 == 0) {
            flavorTextKey = "BWB_Powerup_TooHigh";
          } else {
            flavorTextKey = "BWB_Powerup_Generic";
            color = KDBaseWhite;
          }
          break;
      }
      const text = CheckedTextGet(flavorTextKey, {
        RestraintName: fullName,
      });
      KinkyDungeonSendTextMessage(5, text, color, 5);

      // TODO: Some restraints cannot be locked, e.g. toys need a belt.
      if (r.item.bwb_level >= 5 && !r.item.lock) {
        KinkyDungeonSendTextMessage(
          5,
          CheckedTextGet("BWB_LockUrge"),
          KDBasePink,
          5
        );
      }
    }
  }
  return retVal;
};

const TextEnglish = {
  BWB_Powerup_Generic: "Your bond with ${RestraintName} increased a little!",
  BWB_Powerup_1st: "You've been wearing ${RestraintName} for a while.",
  BWB_Powerup_Low: "You're getting used to wearing ${RestraintName}.",
  BWB_Powerup_Medium:
    "Wearing ${RestraintName} is starting to feel comfortable.",
  BWB_Powerup_High:
    "Maybe it wouldn't be so bad if you never took off ${RestraintName} ever again.",
  BWB_Powerup_XHigh:
    "You think of ${RestraintName} as an actual part of your body.",
  BWB_Powerup_TooHigh:
    "You don't even remember what it was like not to wear ${RestraintName} anymore.",
  BWB_LockUrge: "You feel an urge to lock it...",
} as const;
type FlavorTextKey = keyof typeof TextEnglish;

function CheckedTextGet(key: FlavorTextKey, params: object = {}) {
  return TextGet(key, params);
}
Object.entries(TextEnglish).forEach((e) => addTextKey(e[0], e[1]));
