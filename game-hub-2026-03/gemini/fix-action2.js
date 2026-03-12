const fs = require('fs');
const file = './app/api/room/[id]/action/route.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  "if (action === 'next_round' || action === 'rematch') {",
  "if (action === 'next_round' || action === 'rematch') {\n        const p1Id = room.players[0].id;\n        const p2Id = room.players[1].id;"
);
fs.writeFileSync(file, code);
