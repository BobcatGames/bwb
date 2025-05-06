#!/usr/bin/env node
import fs from 'node:fs';
import { execSync } from "node:child_process";

const modJson = JSON.parse(fs.readFileSync('./mod.json'));
const fileName = `${modJson.modname}-${modJson.modbuild}.zip`

fs.renameSync("dist/index.js", "dist/index.ks");
execSync(`7z a -tzip "./dist/${fileName}" ./dist/index.ks ./mod.json ./README.md Data/*.png Data/*.csv`, {
  stdio: 'inherit'
});
