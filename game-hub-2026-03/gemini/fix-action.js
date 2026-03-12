const fs = require('fs');
const file = './app/api/room/[id]/action/route.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  "import { rooms, broadcastRoomEvent, TTTData, RPSData, TTTBoard, RPSChoice } from '@/lib/server/store';",
  "import { rooms, TTTData, RPSData, TTTBoard, RPSChoice } from '@/lib/server/store';\nimport { broadcastRoomEvent } from '@/lib/server/events';"
);
fs.writeFileSync(file, code);
