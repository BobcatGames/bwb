"use strict";

/** @type {Set<string>} */
let newRestraints = new Set();

let Orig_KinkyDungeonAddRestraint = KinkyDungeonAddRestraint;

KinkyDungeonAddRestraint = function(restraint, ...args) {
	console.log('Equipping restraint');
	console.log(restraint);
	return Orig_KinkyDungeonAddRestraint(restraint, ...args);
}


let Orig_KDAdvanceLevel = KDAdvanceLevel;

KDAdvanceLevel = function (...args) {
	const retVal = Orig_KDAdvanceLevel(...args);
	if (MiniGameKinkyDungeonLevel > KDGameData.HighestLevelCurrent) {
		console.log("Restraintchallenge: New floor");
		const wornRestraints = KinkyDungeonAllRestraintDynamic();
		console.log(wornRestraints);
		for (const r of wornRestraints) {
			if (r.item.lock) {
				// Only consider locked items
				for (const e of r.item.events) {
					if (e.original === 'Accuracy') {
						switch(e.trigger) {
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
		}
		console.log();
	}
	return retVal;
}
