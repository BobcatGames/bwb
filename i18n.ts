"use strict";

type FlavorTextKey = keyof typeof TextEnglish;

// In this mod, only allow our text keys.
const BWB_TextGet = TextGet as (key: FlavorTextKey, params?: object) => string;

Object.entries(TextEnglish).forEach((e) => addTextKey(e[0], e[1]));
