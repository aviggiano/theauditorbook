import database, { connect, Audit, Finding } from "fluffy-waddle-database";
import fs from "fs/promises";
import mkdirp from "mkdirp";
import cmd from "../cmd";
import { Logger } from "tslog";
import { format } from "date-fns";
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
  log.info("generate-ebook start");
  await connect();
  const audits = await database.manager.find(Audit);

  log.debug(`Found ${audits.length} audits`);

  const date = format(new Date(), "yyyy-MM-dd");
  const title = "The Auditor Book";
  const dir = `/tmp/the-auditor-book-${date}`;
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

  await cmd(
    `pandoc -o '${title}.epub' \\
    --metadata creator="Compiled by aviggiano.eth"  \\
    --metadata title="${title}" \\
    --metadata date="${date}" \\
    --metadata cover-image="cover.png" \\
    --toc \\
    --number-sections \\
    --standalone \\
    --from markdown-yaml_metadata_block \\
    ${dir}/*.md`
  );

  log.info("generate-ebook end");
}

main();
