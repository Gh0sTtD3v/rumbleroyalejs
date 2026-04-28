function randomId(base = 1_000) {
	return `#${btoa(Math.floor(Math.random() * base * Date.now()))}`;
}

function rChance(props = {}) {
	const m = props.multiplier || 10;
	const d = props.divider || 2;
	const MIN = props.min || 0;
	const MAX = props.max || m;
	const r = Math.floor(Math.random() * MAX) + MIN;
	const arr = [...Array(m).fill(0)].map(_ => r % d === 0);
	return arr[m - 1];
}

function dChance(difficulty = 0.5) {
	return Math.floor(Math.random() * 99) + 1 > (100 * difficulty);
}

/**
 * Action interface:
 * {
 *     type: string,              // lore key (e.g. 'fight', 'ambush', 'trap')
 *     mode: 'solo' | 'duo',      // solo = 1 player, duo = 2 players
 *     weight: number,            // relative probability (default 1)
 *     execute: (ctx) => result   // ctx: { player, opponent?, settings }
 * }
 *
 * Result shape:
 * { winner, loser, isKill, type }
 */

const defaultActions = [
	{
		type: 'fight',
		mode: 'duo',
		weight: 1,
		execute: ({ player, opponent, settings }) => {
			const multiplier = Math.floor(Math.random() * 99) + 1;
			const f = rChance({ multiplier, max: settings.max });
			return {
				winner: f ? player : opponent,
				loser: f ? opponent : player,
				isKill: dChance(settings.difficulty),
				type: 'fight',
			};
		},
	},
	{
		type: 'wander',
		mode: 'solo',
		weight: 1,
		execute: ({ player, settings }) => {
			const multiplier = Math.floor(Math.random() * 99) + 1;
			const f = rChance({ multiplier, max: settings.max });
			return {
				winner: f ? player : null,
				loser: f ? null : player,
				isKill: f ? false : dChance(settings.difficulty),
				type: f ? 'wander-winner' : 'wander-loser',
			};
		},
	},
];

function pickWeighted(actions) {
	const total = actions.reduce((sum, a) => sum + (a.weight || 1), 0);
	let roll = Math.random() * total;
	for (const action of actions) {
		roll -= (action.weight || 1);
		if (roll <= 0) return action;
	}
	return actions[actions.length - 1];
}

function runRound(players, settings, actions, itemResolver) {
	const allActions = actions || defaultActions;
	const soloActions = allActions.filter(a => a.mode === 'solo');
	const duoActions = allActions.filter(a => a.mode === 'duo');
	const resolve = itemResolver || (() => []);

	const results = [];
	let pending = null;
	let index = 0;

	while (index < players.length) {
		const isLast = index === players.length - 1;
		let result;

		if (pending && isLast) {
			const action = pickWeighted(duoActions);
			result = action.execute({
				player: pending,
				opponent: players[index],
				settings,
				playerItems: resolve(pending),
				opponentItems: resolve(players[index]),
			});
		}
		else if (!pending && isLast) {
			const action = pickWeighted(soloActions);
			result = action.execute({
				player: players[index],
				settings,
				playerItems: resolve(players[index]),
			});
		}
		else {
			const action = pickWeighted(allActions);

			if (action.mode === 'solo') {
				result = action.execute({
					player: players[index],
					settings,
					playerItems: resolve(players[index]),
				});
			}
			else {
				if (pending && pending.id !== players[index].id) {
					result = action.execute({
						player: pending,
						opponent: players[index],
						settings,
						playerItems: resolve(pending),
						opponentItems: resolve(players[index]),
					});
				}
				else {
					pending = players[index];
					index++;
					continue;
				}
			}
		}

		// Apply survive bonus — loser's items can save them from a kill
		if (result && result.isKill && result.loser) {
			const loserItems = resolve(result.loser);
			const surviveBonus = loserItems.reduce(
				(sum, i) => sum + (i.modifiers?.surviveChance || 0), 0
			);
			if (surviveBonus > 0 && Math.random() < Math.min(0.5, surviveBonus)) {
				result.isKill = false;
				result.savedByItem = true;
			}
		}

		if (result) results.push(result);
		index++;
		if (result && pending) pending = null;
	}

	const survivors = results
		.filter(r => r.winner?.id != null)
		.map(r => r.winner);

	return { results, survivors };
}

module.exports = {
	randomId,
	rChance,
	dChance,
	defaultActions,
	pickWeighted,
	runRound,
};