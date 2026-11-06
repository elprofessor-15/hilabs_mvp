import { join } from "node:path";
import { createAnnexWorkbook } from "../lib/annex-export";

async function main() {
  const target = join(process.cwd(), "data", "synthetic-annex.xlsx");
  await createAnnexWorkbook().xlsx.writeFile(target);
  console.log(`Exported the synthetic annex to ${target}`);
}

main().catch((error: unknown) => {
  console.error("Could not export the synthetic annex.", error);
  process.exitCode = 1;
});
