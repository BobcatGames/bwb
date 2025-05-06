"use strict";

const Level_1 = 1;
const Level_Low = 2;
const Level_Medium = 3;
const Level_High = 4;
const Level_XHigh = 6;

/**
 * The min. bond level needed to rename the item.
 * Default is Level_Medium.
 */
let Level_GiveName = Level_Medium;

const Level_StopCut = 5;
const Level_StopStruggle = 6;
const Level_StopRemove = 7;

/**
 * For debugging.
 * After completeing a floor, the starting bond level will be this.
 * Default is 1.
 */
let Base_Level = 7;

const TextEnglish = {
  BWB_Powerup_Generic: "Your bond with ${RestraintName} increased a little!",
  BWB_Powerup_1st:
    "You notice you've been wearing ${RestraintName} for a while.",
  BWB_Powerup_Low: "It's getting comfy wearing ${RestraintName}.",
  BWB_Powerup_Medium:
    "Why not give ${RestraintName} a cute nickname? (in inventory)",
  BWB_Powerup_High:
    "Maybe it wouldn't be so bad if you never took off ${RestraintName} ever again.",
  BWB_Powerup_XHigh:
    "You think of ${RestraintName} as an actual part of your body.",
  BWB_Powerup_TooHigh:
    "You don't even remember what it was like not to wear ${RestraintName} anymore.",
  BWB_LockUrge: "You feel an urge to lock it...",

  BWB_SelfLock_Medium: "You lock ${RestraintName}, just in case.",
  BWB_SelfLock_High: "You lock ${RestraintName}, nice and secure!",
  BWB_SelfLock_XHigh: "You lock ${RestraintName}, you feel much safer now!",

  BWB_NoCut: "No! Cutting would destroy ${RestraintName}!",
  BWB_NoStruggle: "No! Struggling might destroy ${RestraintName}!",
  BWB_NoUnlock: "You don't want to take it off, and it's safer with the lock.",
  BWB_NoRemove: "Nah, it's too comfy.",

  BWB_InventoryAction_Rename: "Give it a nickname (empty to reset)",
  KDModButtonBWB: "Bonding with Bondage",
  KDModButtonBWB_AlwaysAllowRenaming: "Always allow renaming restraints",
} as const;
