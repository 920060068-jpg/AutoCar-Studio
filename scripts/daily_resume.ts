import { parseDailyCliOptions, runDailyController } from "./lib/daily.ts";

try {
  runDailyController(parseDailyCliOptions(process.argv.slice(2)));
} catch (error) {
  console.error(`DAILY_RESUME_FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
