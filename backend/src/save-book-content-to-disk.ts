import database, {
  connect,
  Audit,
  Finding,
  disconnect,
} from "fluffy-waddle-database";
import fs from "fs/promises";
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

function formatUrls(word: string): string {
  const match = word.match(/.*\/(.*\.sol#.*)\b/);
  return word.startsWith("http") && match
    ? `[${match[1]}](${word})`
    : word.startsWith("http")
    ? `[${word}](${word})`
    : word;
}

export default async function main(filename: string): Promise<void> {
  log.info(`save-book-content-to-disk '${filename}' start`);
  await connect();
  const audits = await database.manager.find(Audit, {
    order: {
      name: "ASC",
    },
  });

  log.debug(`Found ${audits.length} audits`);

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

    await fs.appendFile(filename, `# ${audit.name}\n`);
    await Promise.all(
      findings.sort(sortBySeverity).map(async (finding) => {
        const content = [
          `## [${finding.title} (${capitalize(finding.severity)})](${finding.url
            .replace("api.", "")
            .replace("repos/", "")})`,
          "\n\n",
          finding.body
            .split("\n")
            .map((line) => line.replace(/^#/g, "###"))
            .map((line) => line.split(" ").map(formatUrls).join(" "))
            .join("\n"),
          "\n",
        ].join("");
        await fs.appendFile(filename, content);
      })
    );
  }

  await disconnect();

  log.info(`save-book-content-to-disk '${filename}' end`);
}

main(process.argv[2]);
