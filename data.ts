"use strict";

const Level_1 = 1;
const Level_Low = 2;
const Level_Medium = 5;
const Level_High = 10;
const Level_XHigh = 14;

/**
 * The min. bond level needed to rename the item.
 * Default is Level_Medium.
 * Set to 0 to rename ALL enchanted items.
 */
let Level_GiveName = 0;

/**
 * For debugging.
 * After completeing a floor, the starting bond level will be this.
 * Default is 1.
 */
let Base_Level = 5;

const TextEnglish = {
  BWB_Powerup_Generic: "Your bond with ${RestraintName} increased a little!",
  BWB_Powerup_1st: "You've been wearing ${RestraintName} for a while.",
  BWB_Powerup_Low: "You're getting used to wearing ${RestraintName}.",
  BWB_Powerup_Medium:
    "Wearing ${RestraintName} is starting to feel comfortable. Why not give it a name? (in inventory)",
  BWB_Powerup_High:
    "Maybe it wouldn't be so bad if you never took off ${RestraintName} ever again.",
  BWB_Powerup_XHigh:
    "You think of ${RestraintName} as an actual part of your body.",
  BWB_Powerup_TooHigh:
    "You don't even remember what it was like not to wear ${RestraintName} anymore.",
  BWB_LockUrge: "You feel an urge to lock it...",

  BWB_InventoryAction_Rename: "Give it a name (empty to reset)",
} as const;
