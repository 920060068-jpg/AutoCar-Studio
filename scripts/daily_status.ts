import {
  evaluateDailyAction,
  parseDailyCliOptions,
  printEvaluation,
} from "./lib/daily.ts";

try {
  const options = parseDailyCliOptions(process.argv.slice(2));
  printEvaluation(evaluateDailyAction(options), options.json);
} catch (error) {
  console.error(`DAILY_STATUS_FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
