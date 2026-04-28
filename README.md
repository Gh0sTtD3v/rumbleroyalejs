# rumble-royale

A pluggable battle royale game engine. Bring your own database, lore, items, actions, and presentation layer.

## Install

```bash
npm install rumble-royale
```

Or directly from GitHub:

```json
"rumble-royale": "github:youruser/rumble-royale"
```

## Quick Start

```js
const { RumbleRoyale, MemoryAdapter } = require('rumble-royale');

const game = new RumbleRoyale({
    db: new MemoryAdapter(),
    formatPlayer: (p) => p?.id || '???',
    onRoundEnd: ({ survivors, narration, drops, round }) => {
        console.log(`Round ${round} — ${survivors.length} survivors`);
        narration.forEach(n => console.log(n.text));
        drops.forEach(d => console.log(`${d.player.id} found ${d.item.name}!`));
    },
    onBattleEnd: ({ winner, narration, drops, prizepool }) => {
        console.log(`Winner: ${winner.id} — won ${prizepool} tokens`);
        narration.forEach(n => console.log(n.text));
    },
});

const battle = await game.createBattle();

await game.join(battle.battleId, 'player-1');
await game.join(battle.battleId, 'player-2');
await game.join(battle.battleId, 'player-3');

await game.fight(battle.battleId);
```

## Narration

Every narration entry is an object:

```js
{
    text: 'Player1 strikes Player2 from the shadows!',
    image: '/scenes/ambush.png',   // null if no image
    item: { id: 'shadow-dagger', name: 'Shadow Dagger', ... },  // null if no item triggered
}
```

## Custom Lore

Lore keys map directly to action result types. Entries can be plain strings or objects with `text` and `image`.

```js
const game = new RumbleRoyale({
    db: new MemoryAdapter(),
    lore: {
        'fight': {
            kill: [
                '{winner} vaporizes {loser} with a plasma cannon!',
                { text: '{winner} hacks {loser}\'s shield. Eliminated!', image: '/scenes/hack.png' },
            ],
            survive: [
                '{winner} grazes {loser} with a laser. {loser} staggers back.',
            ],
        },
        'wander-winner': {
            kill: ['{winner} finds an orbital strike beacon!'],
            survive: ['{winner} patches into a supply drop.'],
        },
        'wander-loser': {
            kill: ['{loser} triggers a landmine. Game over.'],
            survive: ['{loser} gets lost in the radiation zone but crawls back.'],
        },
        // Custom action types get their own lore keys
        'ambush': {
            kill: ['{winner} ambushes {loser} from the shadows!'],
            survive: ['{winner} ambushes {loser} — a hit, but not fatal.'],
        },
    },
});
```

## Custom Actions

Actions are pluggable. Each defines a type, mode (solo/duo), weight, and execute function.

```js
const { RumbleRoyale, MemoryAdapter, defaultActions, dChance } = require('rumble-royale');

const game = new RumbleRoyale({
    db: new MemoryAdapter(),
    actions: [
        ...defaultActions,
        {
            type: 'ambush',
            mode: 'duo',
            weight: 0.5,
            execute: ({ player, opponent, settings }) => {
                const success = Math.random() > 0.5;
                return {
                    winner: success ? player : opponent,
                    loser: success ? opponent : player,
                    isKill: dChance(settings.difficulty),
                    type: 'ambush',
                };
            },
        },
        {
            type: 'trap',
            mode: 'solo',
            weight: 0.3,
            execute: ({ player, settings }) => {
                const escaped = Math.random() > 0.4;
                return {
                    winner: escaped ? player : null,
                    loser: escaped ? null : player,
                    isKill: !escaped,
                    type: 'trap',
                };
            },
        },
    ],
});
```

Action interface:

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Lore key for this action |
| `mode` | `'solo' \| 'duo'` | Solo = 1 player, duo = 2 players |
| `weight` | `number` | Relative probability (default 1) |
| `execute` | `function` | Receives `{ player, opponent?, settings, playerItems, opponentItems? }`, returns `{ winner, loser, isKill, type }` |

## Items & Drops

Players collect items that affect gameplay and override lore. Items drop randomly after each round for survivors.

```js
const game = new RumbleRoyale({
    db: new MemoryAdapter(),
    dropRate: 0.3, // chance per survivor per round (default 0.3)
    items: [
        {
            id: 'flame-sword',
            name: 'Flame Sword',
            type: 'weapon',
            rarity: 'rare',        // common, uncommon, rare, epic, legendary
            image: '/items/flame-sword.png',
            modifiers: {
                difficulty: -0.15,  // easier kills for the holder
                surviveChance: 0,   // bonus chance to survive a lethal blow
                attackWeight: 0.3,  // bonus weight toward duo actions
            },
            lore: {
                'fight': {
                    kill: ['{winner} swings the Flame Sword, engulfing {loser} in fire!'],
                    survive: ['{winner} scorches {loser} with the Flame Sword — painful, but not fatal.'],
                },
            },
        },
        {
            id: 'iron-shield',
            name: 'Iron Shield',
            type: 'armor',
            rarity: 'uncommon',
            image: null,
            modifiers: {
                surviveChance: 0.2,
            },
            lore: {},
        },
    ],
    onDrop: ({ player, item }) => {
        console.log(`${player.id} found ${item.name} (${item.rarity})!`);
    },
});
```

5 default items ship with the package. Rarity drop weights: common 50, uncommon 30, rare 15, epic 4, legendary 1.

Members need an `inventory` array (list of item IDs) in the database:

```js
await db.createMember({ id: 'player-1', balance: '100', xp: 0, inventory: [] });
```

## Database Adapters

### Custom Adapter

Implement these methods:

```js
const myAdapter = {
    getBattle: async (battleId) => {},
    createBattle: async (data) => {},
    updateBattle: async (battleId, updates) => {},
    getMember: async (memberId) => {},
    updateMember: async (memberId, updates) => {},
    createMember: async (data) => {},
};
```

### Built-in: MemoryAdapter

In-memory Map-based. Good for testing or single-session web games.

### Built-in: MongoAdapter

```js
const { RumbleRoyale, MongoAdapter } = require('rumble-royale');
const { MongoClient } = require('mongodb');

const client = await MongoClient.connect('mongodb://localhost:27017');
const db = client.db('mybot');

const game = new RumbleRoyale({
    db: new MongoAdapter(db, {
        battlesCollection: 'battles',   // default: 'battles'
        membersCollection: 'members',   // default: 'members'
        memberIdField: 'discord_id',    // default: 'discord_id'
    }),
});
```

## Discord Bot Example

```js
const { RumbleRoyale, MongoAdapter } = require('rumble-royale');

const game = new RumbleRoyale({
    db: new MongoAdapter(db),
    formatPlayer: (p) => `<@${p?.id || '?'}>`,
    onRoundEnd: async ({ survivors, narration, drops, round, prizepool }) => {
        let desc = narration.map(n => n.text).join('\n');
        if (drops.length > 0) {
            desc += '\n\n' + drops.map(d =>
                `🎁 <@${d.player.id}> found **${d.item.name}**!`
            ).join('\n');
        }
        desc += `\n\n**${survivors.length} survivors advance to round ${round}.**`;

        await channel.send({ embeds: [{ title: '**Battle**', description: desc, color: 0x8b0000 }] });
    },
    onBattleEnd: async ({ winner, narration, drops, prizepool }) => {
        let desc = narration.map(n => n.text).join('\n');
        desc += `\n\n🏆 <@${winner.id}> wins ${prizepool} tokens!`;

        await channel.send({ embeds: [{ title: '**Battle — Winner!**', description: desc, color: 0x8b0000 }] });
    },
});
```

## Callbacks

| Callback | Payload |
|---|---|
| `onBattleCreated` | `battle` |
| `onPlayerJoined` | `{ battle, player, players }` |
| `onRoundEnd` | `{ battle, survivors, results, narration, drops, round, prizepool }` |
| `onBattleEnd` | `{ battle, winner, results, narration, drops, round, prizepool }` |
| `onDrop` | `{ player, item }` |
| `onError` | `{ battleId, message }` |

## Settings

| Key | Default | Description |
|---|---|---|
| `max` | `1000000` | Random ceiling for fight chance |
| `difficulty` | `0.5` | Kill probability (0–1, higher = harder to survive) |
| `costToJoin` | `10` | Token cost to enter a battle |
| `xp` | `100` | XP awarded per battle |
| `roundDelay` | `60000` | Delay between rounds (ms) |
| `gametime` | `300000` | Time before battle starts (ms) |

## Local Development

```bash
# In the rumble-royale folder
npm link

# In your project
npm link rumble-royale
```

## License

MIT