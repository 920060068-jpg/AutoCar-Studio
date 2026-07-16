import {
  loadMinimaxConfig,
  publicMinimaxConfig,
} from "../src/audio/minimax/config.ts";

const config = loadMinimaxConfig();
console.log(JSON.stringify({
  status: "passed",
  networkRequestPerformed: false,
  ...publicMinimaxConfig(config),
}, null, 2));
