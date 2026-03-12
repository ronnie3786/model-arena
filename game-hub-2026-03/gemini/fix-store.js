const fs = require('fs');
const code = fs.readFileSync('./src/lib/server/store.ts', 'utf8');
const fixed = code.replace(/Array\.from\(rooms\.entries\(\)\)\.forEach\(\(\[id, room\]\) => \{\s*\/\/ If room is waiting and older than 2 mins, delete\s*if \(room\.state === 'waiting' && \(now - room\.createdAt > ROOM_TIMEOUT_MS\)\) \{\s*rooms\.delete\(id\);\s*\}\);\s*\}\s*\}/m, 
`Array.from(rooms.entries()).forEach(([id, room]) => {
      // If room is waiting and older than 2 mins, delete
      if (room.state === 'waiting' && (now - room.createdAt > ROOM_TIMEOUT_MS)) {
        rooms.delete(id);
      }
    });`);
fs.writeFileSync('./src/lib/server/store.ts', fixed);
