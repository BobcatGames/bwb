"use strict";

/*
  The overall algorithm:

  At the end of every floor, we must check whether restraints were removed on this floor.
  The game does not store the history, and catching every possible way an item can be removed/unequipped
  (manually, shrine, shopkeep, offers...) is daunting, and would probably be buggy.
  A check still must happen somehow, however.

  Instead, we override the AddRestraint function, listen in for adding attempts,
  and remember them for this floor.
  It doesn't matter if the equipping ended in a failure, or the item wasn't even a proper
  restraint, the algorithm will still work.

  At the end of the floor, we now have:
   * A list of restraints the player is wearing, and
   * A list of restraints the player tried to equip this floor
  If an item is on the former list, and not on the second, then it must have been equipped on a prev. level.

  We do the magic, and then clear the "new restraints" list.
  That way, all currently equipped restraint will count for the next floor.
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
  If you removed an item that already has some levels (e.g. min 5?), and put it back:
    Min 5:
      You can't help but notice that putting the ${RestraintName} felt just a little bit good...
    Min 10:
      You felt so lonely without the ${RestraintName}, but finally it's back!
    Min 14:
      How did the ${RestraintName} even get off? You promise that you'll never take it off again.



*/

KDEventMapGeneric.postApply = {};
KDEventMapGeneric.postApply.bwb_newRestraint = (
  e,
  data: KDEventData_PostApply,
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
  for (const e of item.events) {
    if (!e.bwb_basePower) {
      e.bwb_basePower = e.power;
    }

    // Calculate the new stats as function of the bond level and the base power of the enchantment.
    // This way, we can avoid a bunch of floating point issues (might not be an issue, but still),
    // and we can apply more complex functions.

    // Base: +10% stat per level
    // Might be a bit too strong?
    if (e.original === "Accuracy") {
      switch (e.trigger) {
        case "tick":
          e.power = e.bwb_basePower * (1.1 ** item.bwb_level);
          break;
        case "inventoryTooltip":
          e.power = e.bwb_basePower * (1.1 ** item.bwb_level);
          break;
      }
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
          break;
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
    }
  }
  return retVal;
};

const TextKeys = Object.freeze({
  BWB_Powerup_Generic:
    "Your bond with the ${RestraintName} increased a little bit!",
  BWB_Powerup_1st:
    "As you've been wearing the ${RestraintName} for while, you start to get attached.",
  BWB_Powerup_Low: "Your're getting used to wearing the ${RestraintName}.",
  BWB_Powerup_Medium:
    "The ${RestraintName} is starting to feel actually comfortable.",
  BWB_Powerup_High:
    "Maybe it wouldn't even be so bad if you never took off the ${RestraintName}...",
  BWB_Powerup_XHigh:
    "You feel like the ${RestraintName} is an actual part of your body.",
  BWB_Powerup_TooHigh:
    "You don't even remember what was it like not wearing the ${RestraintName} anymore.",
});
type FlavorTextKey = keyof typeof TextKeys;

function CheckedTextGet(key: FlavorTextKey, params: object) {
  return TextGet(key, params);
}
Object.entries(TextKeys).forEach((e) => addTextKey(e[0], e[1]));
