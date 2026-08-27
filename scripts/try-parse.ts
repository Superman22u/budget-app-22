import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseFile } from "../lib/parsers";

async function main() {
  const dir = join(process.cwd(), "res");
  for (const name of readdirSync(dir)) {
    const buf = readFileSync(join(dir, name));
    const result = await parseFile(buf, name);
    console.log("\n===", name, "===");
    console.log("kind", result.sourceKind, "tx", result.transactions.length, "errors", result.errors);
    console.log("header", result.header);
    console.log("first", result.transactions[0]);
    console.log("last", result.transactions.at(-1));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
