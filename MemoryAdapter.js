class MemoryAdapter {
	constructor() {
		this.battles = new Map();
		this.members = new Map();
	}

	async getBattle(battleId) {
		return this.battles.get(battleId) || null;
	}

	async createBattle(data) {
		this.battles.set(data.battleId, { ...data });
		return this.battles.get(data.battleId);
	}

	async updateBattle(battleId, updates) {
		const battle = this.battles.get(battleId);
		if (!battle) return null;
		Object.assign(battle, updates);
		return battle;
	}

	async getMember(memberId) {
		return this.members.get(memberId) || null;
	}

	async updateMember(memberId, updates) {
		const member = this.members.get(memberId);
		if (!member) return null;
		Object.assign(member, updates);
		return member;
	}

	async createMember(data) {
		this.members.set(data.id, { ...data });
		return this.members.get(data.id);
	}
}

module.exports = MemoryAdapter;
