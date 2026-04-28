# rumble-royale

A pluggable battle royale game engine. Bring your own database, lore, and presentation layer.

## Install

```bash
npm install rumble-royale
```

## Quick Start

```js
const { RumbleRoyale, MemoryAdapter } = require('rumble-royale');

const game = new RumbleRoyale({
    db: new MemoryAdapter(),
    settings: {
        difficulty: 0.5,
        costToJoin: 10,
        xp: 100,
    },
    formatPlayer: (p) => p?.id || '???',
    onRoundEnd: ({ survivors, narration, round, prizepool }) => {
        console.log(`Round ${round} complete. ${survivors.length} survivors.`);
        narration.forEach(line => console.log(line));
    },
    onBattleEnd: ({ winner, narration, prizepool }) => {
        console.log(`Winner: ${winner.id} — won ${prizepool} tokens`);
        narration.forEach(line => console.log(line));
    },
});

// Create a battle
const battle = await game.createBattle();

// Players join
await game.join(battle.battleId, 'player-1');
await game.join(battle.battleId, 'player-2');
await game.join(battle.battleId, 'player-3');

// Fight rounds until a winner emerges
await game.fight(battle.battleId);
```

## Custom Lore

```js
const game = new RumbleRoyale({
    db: new MemoryAdapter(),
    lore: {
        fight: {
            kill: [
                '{winner} vaporizes {loser} with a plasma cannon!',
                '{winner} hacks {loser}\'s shield matrix. {loser} is eliminated!',
            ],
            survive: [
                '{winner} grazes {loser} with a laser. {loser} staggers back.',
            ],
        },
        wanderWinner: {
            kill: ['{winner} finds an orbital strike beacon!'],
            survive: ['{winner} patches into a supply drop.'],
        },
        wanderLoser: {
            kill: ['{loser} triggers a landmine. Game over.'],
            survive: ['{loser} gets lost in the radiation zone but crawls back.'],
        },
    },
});
```

## Custom Database Adapter

Implement these methods:

```js
const myAdapter = {
    getBattle: async (battleId) => { /* return battle object or null */ },
    createBattle: async (data) => { /* store and return battle */ },
    updateBattle: async (battleId, updates) => { /* merge updates, return updated battle */ },
    getMember: async (memberId) => { /* return member object or null */ },
    updateMember: async (memberId, updates) => { /* merge updates, return updated member */ },
    createMember: async (data) => { /* store and return member */ },
};
```

## MongoDB Adapter

```js
const { RumbleRoyale, MongoAdapter } = require('rumble-royale');
const { MongoClient } = require('mongodb');

const client = await MongoClient.connect('mongodb://localhost:27017');
const db = client.db('mybot');

const game = new RumbleRoyale({
    db: new MongoAdapter(db, {
        battlesCollection: 'battles',
        membersCollection: 'members',
        memberIdField: 'discord_id',
    }),
});
```

## Discord Bot Example

```js
const { RumbleRoyale, MongoAdapter } = require('rumble-royale');

const game = new RumbleRoyale({
    db: new MongoAdapter(db),
    formatPlayer: (p) => `<@${p?.id || '?'}>`,
    onRoundEnd: async ({ survivors, narration, round, prizepool }) => {
        await channel.send({
            embeds: [{
                title: '**Battle**',
                description: narration.join('\n') + `\n\n**${survivors.length} survivors advance to round ${round}.**`,
            }],
        });
    },
    onBattleEnd: async ({ winner, narration, prizepool }) => {
        await channel.send({
            embeds: [{
                title: '**Battle — Winner!**',
                description: narration.join('\n') + `\n\n🏆 <@${winner.id}> wins ${prizepool} tokens!`,
            }],
        });
    },
});
```

## Settings

| Key | Default | Description |
|---|---|---|
| `max` | `1000000` | Random ceiling for fight chance |
| `difficulty` | `0.5` | Kill probability (0-1, higher = harder to survive) |
| `costToJoin` | `10` | Token cost to enter a battle |
| `xp` | `100` | XP awarded per battle |
| `roundDelay` | `60000` | Delay between rounds (ms) |
| `gametime` | `300000` | Time before battle starts (ms) |

## License

MIT
