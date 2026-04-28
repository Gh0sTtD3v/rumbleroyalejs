class MongoAdapter {
	constructor(db, options = {}) {
		this.db = db;
		this.battlesCol = options.battlesCollection || 'battles';
		this.membersCol = options.membersCollection || 'members';
		this.memberIdField = options.memberIdField || 'discord_id';
	}

	async getBattle(battleId) {
		return this.db.collection(this.battlesCol).findOne({ battleId });
	}

	async createBattle(data) {
		await this.db.collection(this.battlesCol).insertOne(data);
		return data;
	}

	async updateBattle(battleId, updates) {
		const result = await this.db
			.collection(this.battlesCol)
			.findOneAndUpdate(
				{ battleId },
				{ $set: updates },
				{ returnDocument: 'after' }
			);
		return result;
	}

	async getMember(memberId) {
		return this.db
			.collection(this.membersCol)
			.findOne({ [this.memberIdField]: memberId });
	}

	async updateMember(memberId, updates) {
		const result = await this.db
			.collection(this.membersCol)
			.findOneAndUpdate(
				{ [this.memberIdField]: memberId },
				{ $set: updates },
				{ returnDocument: 'after' }
			);
		return result;
	}

	async createMember(data) {
		await this.db.collection(this.membersCol).insertOne(data);
		return data;
	}
}

module.exports = MongoAdapter;
