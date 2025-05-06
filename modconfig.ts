"use strict";

function bwb_alwaysAllowRenaming() {
  return !!KDModSettings["BWB"]?.BWB_AlwaysAllowRenaming;
}

KDModConfigs["BWB"] = [
  {
    name: "BWB_AlwaysAllowRenaming",
    type: "boolean",
    default: false,
    refvar: "BWB_AlwaysAllowRenaming",
  },
];
