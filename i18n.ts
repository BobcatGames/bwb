"use strict";

const TextKeysEquip = ["BWB_Equip1", "BWB_Equip2"] as const;
type TextKeysEquipType = (typeof TextKeysEquip)[number];

type TextKey =
  | "BWB_Powerup_Generic"
  | "BWB_Powerup_1st"
  | "BWB_Powerup_Low"
  | "BWB_Powerup_Medium"
  | "BWB_Powerup_High"
  | "BWB_Powerup_XHigh"
  | "BWB_Powerup_TooHigh"
  | "BWB_LockUrge"
  | "BWB_SelfLock_Medium"
  | "BWB_SelfLock_High"
  | "BWB_SelfLock_XHigh"
  | "BWB_NoCut"
  | "BWB_NoStruggle"
  | "BWB_NoUnlock"
  | "BWB_NoRemove"
  | "BWB_InventoryAction_Rename"
  | "KDModButtonBWB"
  | "KDModButtonBWB_AlwaysAllowRenaming"
  | TextKeysEquipType;

// In this mod, only allow our text keys.
const BWB_TextGet = TextGet as (key: TextKey, params?: object) => string;

function getSupportedLanguageCode() {
  if (["EN", "JP"].includes(TranslationLanguage)) {
    return TranslationLanguage;
  } else {
    return "EN";
  }
}
