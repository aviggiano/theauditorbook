import database, { connect, Audit, Finding } from "fluffy-waddle-database";
import fs from "fs/promises";
import mkdirp from "mkdirp";
import { Logger } from "tslog";
import { In } from "typeorm";

const log = new Logger();

function sortBySeverity(a: Finding, b: Finding): number {
  const map = {
    high: 0,
    medium: 1,
    low: 2,
  };
  if (map[a.severity] < map[b.severity]) {
    return -1;
  } else if (map[a.severity] > map[b.severity]) {
    return 1;
  } else return 0;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function main(): Promise<void> {
  log.info("save-book-content-to-disk start");
  await connect();
  const audits = await database.manager.find(Audit);

  log.debug(`Found ${audits.length} audits`);

  const dir = `/tmp/theauditorbook`;
  await mkdirp(dir);

  const totalFindings = await database.manager.count(Finding);
  log.debug(`Found ${totalFindings} findings`);

  for (const audit of audits) {
    const findings = await database.manager.find(Finding, {
      where: {
        auditId: audit.id,
        severity: In(["high", "medium"]),
      } as any,
      order: {
        severity: "ASC",
      },
    });

    if (findings.length === 0) continue;

    await fs.writeFile(`${dir}/${audit.name}-${"000"}.md`, `# ${audit.name}`);
    await Promise.all(
      findings.sort(sortBySeverity).map(async (finding, index) => {
        const content = [
          `## [${finding.title} (${capitalize(finding.severity)})](${finding.url
            .replace("api.", "")
            .replace("repos/", "")})`,
          "\n\n",
          finding.body
            .split("\n")
            .map((line) => line.replace(/^#/g, "###"))
            .join("\n"),
        ].join("");
        await fs.writeFile(
          `${dir}/${audit.name}-${(index + 1).toString().padStart(3, "0")}.md`,
          content
        );
      })
    );
  }

  log.info("save-book-content-to-disk end");
}

main();
