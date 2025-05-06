
## Bonding with Bondage

A mod for Kinky Dungeon (https://ada18980.itch.io/kinky-dungeon/ https://github.com/Ada18980/KinkiestDungeon/), by Strait Laced Games LLC.

[Download the mod from here](https://github.com/BobcatGames/bwb/releases)

## What is the mod about?

It adds a new game mechanic where you gain extra enchantment stats if you wear a piece of restraint during a whole floor, and don't take it off even once, implying that the character is getting emotionally atttached, and/or magically attuned to it. Wearing one for a long time might have other effects too. For example, have you ever thought about giving your favorite toy a cute name? (instead of "Epic Massagers of Warding (Cursed)", you could just call it "Buzzy").

The mod only affects Enchanted (and cursed) restraints. It has no effect on:

* Weapons
* Armor
* Generic restraints
* Unique restraints (like the potion absorber, ancient restraints etc.)

Equally for balance, thematic, and technical reasons.

### What counts as a whole floor?

From leaving a perk room, to leaving the next one (when the floor number increments).

New Game+ also counts.

### Does saving work?

Yes! The save code/file should contain every bit of info. The saves generated should also be loadable in the vanilla game, but of course, the mod specific info (unique name, the time you've been wearing the specific restraint etc.) might be lost.

### Can I search for the item by it's custom name?

Yes, and I didn't even have to add a single of code, it just worked! Thanks Ada!

### What are the exact effects of levelling up your "bond" with the item?

Try the mod to find out 🙂. But as this mod is intended for longer runs, if you don't have that much time or patience, here's the quick rundown.

<details>
  <summary>Spoilers (click to open)</summary>

  * You have to wear the restraint during the whole floor, you cannot take it off even once.
  * If you manage to do it, the numeric stats will increase by 7% (e.g. from +50% accuracy to +53.5%). Let's call it the "bond level", the number of floors cleared this way.
  * If you (or someone) takes it off, the bonus for this floor will be lost (your bond level won't increase), but all past bonuses will remain (it won't decrease either). Just equip it back an continue.
  * If you reach bond level 3, you'll be able to rename the item from the inventory menu.
  * Even later on, you'll lose the ability to cut, then struggle, then unlock/uneqip: the character doesn't want to harm it, or even take it off.
    * It can always be removed with shrines, scrolls (for toys), and shopkeep.
  * If you lock your item on (type of lock doesn't matter), you get an extra +1% per level cleared that way.
  * Bonuses are multiplicative:
    * Bond level 2 = +14.49%
    * Bond level 1 with lock level 1 = +8.07%
    * Reasoning: a restraint levelled up to +100% bonus and a new restraint with +100% bonus should behave the same, the player shouldn't be incentivized to ditch the old one b/c the new one has better "base stats".

  **Can't I just rename everything without waiting that many floors?**

  You want the rewards without playing the game, huh? JK.

  In "Mod Configuration" / "Bonding with Bondage", check the "Always allow" option.

  Now you'll be able to rename every enchanted restraint and armor. Generic/unique restraints still can't be renamed, and it's outside the scope of this mod.
</details>

## Licence

You may freely make derivative works based on this mod, as long as you comply with the "Kinky Dungeon" terms (e.g. you cannot charge for the mod), and credit BobcatG as the original mod author.

## Building

This mod is written in TypeScript, just like the base game. Not only that, it actually uses the base code for type checking.

For the whole build process, you'll need a recent NodeJS version, and 7zip in the PATH.

First, build the base game. We only need the types, but we need the node_modules:

    git submodule init
    git submodule update
    cd KinkiestDungeon
    npm install
    npm run buildTypes
    cd ..

Then, in main project:

    npm install
    npm run build      # Linux, MacOS, Win+Bash
    npm run build:win  # Win (cmd or powershell)

If you don't have 7zip installed, you can do this instead:

    npm install
    npx tsc

Then zip up the relevant files:

 * dist/index.js (rename to .ks if needed)
 * mod.json
 * the png's inside Data folder

## Contributing, bug reporting

For the time being, the KD discord is the main platform, the appropritate mod-* channels (I mean, how else did you find this mod?). Once I'm ready to publish it on itch, it might change.

Translations are welcome! There's not much text currently, all can be found in data.ts.

Found a bug? Open a bug report on the KD discord. Make sure to include the error log (if any) and a save file, just like you'd report an error in the base game.
