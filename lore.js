const defaultLore = {
	'fight': {
		kill: [
			'{winner} lands a devastating blow, knocking {loser} out of the arena!',
			'{winner} outmaneuvers {loser} with a swift combo. {loser} is eliminated!',
			'{winner} unleashes a finishing move on {loser}. Game over for {loser}!',
		],
		survive: [
			'{winner} lands a solid hit on {loser}, but {loser} stumbles away bruised.',
			'{winner} wins the clash — {loser} barely escapes with their life.',
			'{winner} overpowers {loser} in a fierce exchange. {loser} limps away.',
		],
	},
	'wander-winner': {
		kill: [
			'{winner} discovers a hidden power-up in the wilderness!',
			'{winner} befriends a mystical creature that grants them a lucky charm.',
		],
		survive: [
			'{winner} rests in a quiet clearing and regains strength.',
			'{winner} finds a hidden stash of supplies. Refreshed and ready!',
		],
	},
	'wander-loser': {
		kill: [
			'{loser} falls into a trap and is eliminated from the battle!',
			'{loser} wanders into dangerous territory and doesn\'t make it back.',
		],
		survive: [
			'{loser} gets lost in the forest but finds their way back.',
			'{loser} stumbles into a dead end. Shaken, but still standing.',
		],
	},
};

function resolveLore(lore, result, formatPlayer) {
	const fmt = formatPlayer || (p => p?.id || '???');

	const category = lore[result.type];
	if (!category) return 'Unknown event.';

	const pool = result.isKill ? category.kill : category.survive;
	if (!pool || pool.length === 0) return 'Unknown event.';

	const entry = pool[Math.floor(Math.random() * pool.length)];
	const isObject = typeof entry === 'object' && entry !== null;
	const template = isObject ? entry.text : entry;
	const image = isObject ? entry.image : null;

	const text = template
		.replaceAll('{winner}', fmt(result.winner))
		.replaceAll('{loser}', fmt(result.loser));

	return { text, image };
}

module.exports = {
	defaultLore,
	resolveLore,
};