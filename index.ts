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
  - Save the "newRestraints" to the save file
  - Add all other enhancements
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
  - You reluctantly remove the ${RestraintName}.
  - You can't remove the ${RestraintName}... but do you really want to?
  - You forlornly look at the remains of the ${RestraintName}...
  - You can't cut the ${RestraintName}... but do you really want to?

*/


/**
 * The list of restraints (variants) equipped this floor.
 */
let newRestraints = new Set<string>();

let Orig_KinkyDungeonAddRestraint = KinkyDungeonAddRestraint;
// @ts-expect-error
KinkyDungeonAddRestraint = function (...args) {
  // Truthy, if we're currently removing an item, and this one becomes the top.
  // In this case, we're not actually equipping anything new.
  const isUnlinking = args[9];
  // The variantname should be unique for enchanted restraints.
  const variantName = args[14];

  if (variantName && !isUnlinking) {
    newRestraints.add(variantName);
  }
  console.debug('Equipping', args);
  // It doesn't actually matter if equipping failed or not, only the attempt.
  return Orig_KinkyDungeonAddRestraint(...args);
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
    console.debug(newRestraints);
    for (const r of wornRestraints) {
      // New restraints do not count, only for the next level
      if (newRestraints.has(r.item.inventoryVariant)) continue;

      const baseRestraint = KDRestraint(r.item);
      // Armors don't count, no matter how enchanted they are.
      // TODO: check for mimic handling.
      if (baseRestraint.armor) continue;

      // TODO: Do something with locked restraints
      //       But only, if it was locked througout the whole floor.
      //       A bit extra stat buff?
      //if (!r.item.lock)

      for (const e of r.item.events) {
        // For debugging, adjust accuracy by +100%.
        if (e.original === "Accuracy") {
          switch (e.trigger) {
            case "tick":
              e.power += 1;
              break;
            case "inventoryTooltip":
              e.power += 100;
              break;
          }
        }
      }
      // TODO: Get the proper name
      const text = CheckedTextGet("BWB_Powerup", {
        RestraintName: KDGetItemName(r.item),
      });
      KinkyDungeonSendTextMessage(5, text, KDBasePink, 5);
    }
    // New floor, clean slate
    newRestraints.clear();
  }
  return retVal;
}

const TextKeys = Object.freeze({
  BWB_Powerup: 'Your bond with the ${RestraintName} increased!',
});

function CheckedTextGet(key: keyof typeof TextKeys, params: object) {
  return TextGet(key, params);
}
Object.entries(TextKeys).forEach(e => addTextKey(e[0], e[1]));

