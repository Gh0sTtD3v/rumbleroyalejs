const { randomId, runRound, defaultActions } = require('./mechanics');
const { defaultLore, resolveLore } = require('./lore');

const defaultSettings = {
	max: 1_000_000,
	difficulty: 0.5,
	costToJoin: 10,
	xp: 100,
	roundDelay: 60_000,
	gametime: 300_000,
};

class RumbleRoyale {
	constructor(options = {}) {
		if (!options.db) {
			throw new Error('A database adapter is required.');
		}

		this.db = options.db;
		this.lore = options.lore || defaultLore;
		this.settings = { ...defaultSettings, ...options.settings };
		this.formatPlayer = options.formatPlayer || (p => p?.id || '???');
		this.actions = options.actions || defaultActions;

		// Event callbacks
		this.onBattleCreated = options.onBattleCreated || (() => {});
		this.onPlayerJoined = options.onPlayerJoined || (() => {});
		this.onRoundEnd = options.onRoundEnd || (() => {});
		this.onBattleEnd = options.onBattleEnd || (() => {});
		this.onError = options.onError || (() => {});
	}

	narrateResults(results) {
		return results.map(r => resolveLore(this.lore, r, this.formatPlayer));
	}

	async createBattle(meta = {}) {
		const battleId = randomId();
		const now = Date.now();

		const battle = await this.db.createBattle({
			battleId,
			players: [],
			prizepool: 0,
			xp: this.settings.xp,
			round: 0,
			gametime: this.settings.gametime,
			starttime: meta.starttime || Math.floor((now + this.settings.gametime) / 1000),
			results: [],
			createdAt: now,
			...meta,
		});

		this.onBattleCreated(battle);
		return battle;
	}

	async join(battleId, playerId) {
		const member = await this.db.getMember(playerId);
		if (!member) {
			return { error: true, message: 'Player not registered.' };
		}

		if (parseFloat(member.balance) < this.settings.costToJoin) {
			return { error: true, message: `Not enough tokens. Need at least ${this.settings.costToJoin}.` };
		}

		const battle = await this.db.getBattle(battleId);
		if (!battle) {
			return { error: true, message: 'Battle not found.' };
		}

		if (battle.players.find(p => p.id === playerId)) {
			return { error: true, message: 'Already joined this battle.' };
		}

		const newBalance = `${(parseFloat(member.balance) - this.settings.costToJoin).toFixed(8)}`;
		const newPrizepool = `${(parseFloat(battle.prizepool) + this.settings.costToJoin).toFixed(8)}`;

		const player = {
			id: playerId,
			xp: member.xp || 0,
			balance: newBalance,
		};

		const players = [...battle.players, player];

		const updatedBattle = await this.db.updateBattle(battleId, {
			players,
			prizepool: newPrizepool,
		});

		await this.db.updateMember(playerId, { balance: newBalance });

		this.onPlayerJoined({ battle: updatedBattle, player, players });

		return { error: false, message: 'Joined the battle.', battle: updatedBattle };
	}

	async fight(battleId) {
		const battle = await this.db.getBattle(battleId);
		if (!battle) return;

		const { players, round, prizepool } = battle;

		if (players.length < 2) {
			this.onError({ battleId, message: 'Not enough players to fight.' });
			return;
		}

		const { results, survivors } = runRound(players, this.settings, this.actions);
		const narration = this.narrateResults(results);

		if (survivors.length === 0) {
			this.onError({ battleId, message: 'No survivors. Battle void.' });
			return;
		}

		if (survivors.length === 1) {
			const winner = survivors[0];
			const newBalance = `${(parseFloat(winner.balance) + parseFloat(prizepool)).toFixed(8)}`;
			const newXp = (winner.xp || 0) + (battle.xp || 0);

			await this.db.updateBattle(battleId, {
				winner: winner.id,
				endtime: Date.now(),
				players: [],
				prizepool: 0,
			});

			await this.db.updateMember(winner.id, {
				balance: newBalance,
				xp: newXp,
			});

			this.onBattleEnd({
				battle,
				winner: { ...winner, balance: newBalance, xp: newXp },
				results,
				narration,
				round: round + 1,
				prizepool,
			});

			return;
		}

		// Multiple survivors — next round
		await this.db.updateBattle(battleId, {
			players: survivors,
			round: round + 1,
		});

		this.onRoundEnd({
			battle,
			survivors,
			results,
			narration,
			round: round + 1,
			prizepool,
		});
	}
}

module.exports = RumbleRoyale;