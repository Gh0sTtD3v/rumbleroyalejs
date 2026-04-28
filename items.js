/**
 * Item interface:
 * {
 *     id: string,                  // unique identifier
 *     name: string,                // display name
 *     type: 'weapon' | 'armor' | 'charm' | 'consumable' | string,
 *     rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
 *     image: string | null,        // optional image path/url
 *     modifiers: {
 *         difficulty: number,      // added to difficulty (negative = easier kills)
 *         attackWeight: number,    // bonus weight for duo actions
 *         surviveChance: number,   // bonus chance to survive (0-1)
 *     },
 *     lore: {                      // optional per-action lore overrides
 *         'fight': { kill: [...], survive: [...] },
 *         'ambush': { kill: [...], survive: [...] },
 *     },
 * }
 */

const rarityWeights = {
	common: 50,
	uncommon: 30,
	rare: 15,
	epic: 4,
	legendary: 1,
};

const defaultItems = [
	{
		id: 'rusty-sword',
		name: 'Rusty Sword',
		type: 'weapon',
		rarity: 'common',
		image: null,
		modifiers: { difficulty: -0.05 },
		lore: {
			fight: {
				kill: ['{winner} swings a rusty sword and catches {loser} off guard!'],
			},
		},
	},
	{
		id: 'wooden-shield',
		name: 'Wooden Shield',
		type: 'armor',
		rarity: 'common',
		image: null,
		modifiers: { surviveChance: 0.1 },
		lore: {},
	},
	{
		id: 'shadow-dagger',
		name: 'Shadow Dagger',
		type: 'weapon',
		rarity: 'rare',
		image: null,
		modifiers: { difficulty: -0.15, attackWeight: 0.3 },
		lore: {
			fight: {
				kill: ['{winner} strikes from the shadows with a cursed dagger. {loser} never saw it coming.'],
				survive: ['{winner} slashes {loser} with a shadow dagger — a deep cut, but not fatal.'],
			},
		},
	},
	{
		id: 'lucky-clover',
		name: 'Lucky Clover',
		type: 'charm',
		rarity: 'uncommon',
		image: null,
		modifiers: { surviveChance: 0.2 },
		lore: {},
	},
	{
		id: 'phoenix-feather',
		name: 'Phoenix Feather',
		type: 'charm',
		rarity: 'legendary',
		image: null,
		modifiers: { surviveChance: 0.4, difficulty: -0.1 },
		lore: {
			fight: {
				kill: ['{winner}\'s phoenix feather ignites — {loser} is consumed by divine flames!'],
			},
		},
	},
];

function rollDrop(items, dropRate = 0.3) {
	if (Math.random() > dropRate) return null;

	const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
	let roll = Math.random() * totalWeight;
	let selectedRarity = 'common';

	for (const [rarity, weight] of Object.entries(rarityWeights)) {
		roll -= weight;
		if (roll <= 0) {
			selectedRarity = rarity;
			break;
		}
	}

	const pool = items.filter(i => i.rarity === selectedRarity);
	if (pool.length === 0) return null;

	return pool[Math.floor(Math.random() * pool.length)];
}

function getPlayerItems(inventory, itemRegistry) {
	return (inventory || [])
		.map(id => itemRegistry.find(i => i.id === id))
		.filter(Boolean);
}

function applyModifiers(settings, playerItems) {
	if (!playerItems || playerItems.length === 0) return settings;

	let diffMod = 0;
	let surviveMod = 0;
	let attackMod = 0;

	for (const item of playerItems) {
		const m = item.modifiers || {};
		diffMod += m.difficulty || 0;
		surviveMod += m.surviveChance || 0;
		attackMod += m.attackWeight || 0;
	}

	return {
		...settings,
		difficulty: Math.max(0, Math.min(1, settings.difficulty + diffMod)),
		_surviveBonus: Math.min(0.5, surviveMod),
		_attackBonus: attackMod,
	};
}

function getItemLore(playerItems, actionType, isKill) {
	for (const item of playerItems) {
		const actionLore = item.lore?.[actionType];
		if (!actionLore) continue;

		const pool = isKill ? actionLore.kill : actionLore.survive;
		if (pool && pool.length > 0) {
			const entry = pool[Math.floor(Math.random() * pool.length)];
			return { entry, item };
		}
	}
	return null;
}

module.exports = {
	defaultItems,
	rarityWeights,
	rollDrop,
	getPlayerItems,
	applyModifiers,
	getItemLore,
};