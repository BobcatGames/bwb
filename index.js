"use strict";

/*
  The overall algorithm:
  - At the end of every floor, we must check whether a restraint was removed on this floor.
    The game does not store the history, and catching every possible way an item can be removed/unequipped
    (manually, shrine, shopkeep, offers...) is daunting, and would probably be buggy.
  A check still must happen somehow, however.

  - Instead, we override the AddRestraint function, and listen in for adding attempts.
    If we see any kind of restraint, we remember it for this floor.
  It doesn't even matter if the details are incorrect (success? failure? to the player? to an enemy?),
  since if the game is trying to equip a restraint, it's either a new restraint,
  or it must have been uneqipped beforehand.

  - At the end of the floor, we now have:
    * A list of restraints the player is wearing, and
    * A list of restraints the player tried to equip this floor
  If and item is on the former list, and not on the second, then it must have been equipped on a prev. level.

  - Clear the "new restraints" list, so all current restraint will count for the next floor.

 */

/*
  TODO:
  - Save the "newRestraints" to the save file
  - Correctly identify restraints
  - Add all other enhancements
  - Finetune the stat increase, *1.1 seems alright.
  - Add flavor text
  (e.g. Your bond with XY grows stronger!)
*/


/**
 * The list of restraints (variants) equipped this floor.
 * @type {Set<string>}
 */
let newRestraints = new Set();

let Orig_KinkyDungeonAddRestraint = KinkyDungeonAddRestraint;
KinkyDungeonAddRestraint = function (...args) {
  // The variantname should be unique for enhanced restraints.
  const variantName = args[14];
  if (variantName) {
    newRestraints.add(variantName);
  }
  // It doesn't actually matter if equipping failed or not, only the attempt.
  return Orig_KinkyDungeonAddRestraint(...args);
}


let Orig_KDAdvanceLevel = KDAdvanceLevel;
KDAdvanceLevel = function (...args) {
  const retVal = Orig_KDAdvanceLevel(...args);
  // Run the code AFTER advancing the level, that's when the level
  // variables will be correct

  if (MiniGameKinkyDungeonLevel > KDGameData.HighestLevelCurrent) {
    console.log("Restraintchallenge: New floor");
    const wornRestraints = KinkyDungeonAllRestraintDynamic();
    console.log(wornRestraints);
    console.log(newRestraints);
    for (const r of wornRestraints) {
      // Only consider locked items
      // TODO: better check for actual restraints
      if (!r.item.lock) continue;

      // New restraints do not count, only for the next level
      if (newRestraints.has(r.item.inventoryVariant)) continue;

      for (const e of r.item.events) {
        // For debugging, only adjust accuracy by +100%.
        if (e.original === 'Accuracy') {
          switch (e.trigger) {
            case 'tick':
              e.power += 1;
              break;
            case 'inventoryTooltip':
              e.power += 100;
              break;
          }
        }
      }
    }
    // Now floor, clean slate
    newRestraints.clear();
  }
  return retVal;
}
