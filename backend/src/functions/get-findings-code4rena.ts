import database, {
  Audit,
  Auditor,
  connect,
  disconnect,
  Finding,
  Severity,
} from "fluffy-waddle-database";
import { Octokit } from "@octokit/rest";
import { Logger } from "tslog";
import { In } from "typeorm";

const log = new Logger();

export async function main() {
  log.info("get-findings-code4rena start");
  await connect();
  await database.synchronize();
  const auditor = await database.manager.findOne(Auditor, {
    where: {
      name: "Code4rena",
    },
  });

  const octokit = new Octokit({});

  const per_page = 100;
  const API_LIMITS = 10;
  const org = "code-423n4";

  for (let repoPage = 1; ; repoPage++) {
    const repos = await octokit.rest.repos.listForOrg({
      org,
      per_page,
      page: repoPage,
    });

    log.debug(`${repos.data.length} repos found for ${org}`);
    const auditNames = repos.data
      .map((repo) => repo.name)
      .filter((name) => name.includes("-findings"));

    log.debug(`${auditNames.length} audits found for ${org}`);

    const audits = await database.manager.find(Audit, {
      where: {
        auditorId: auditor!.id,
        name: In(auditNames),
      } as any,
    });

    const newAuditNames = auditNames.filter(
      (name) => !audits.find((audit) => audit.name === name)
    );

    log.debug(`${newAuditNames.length} new audits for ${org}`);

    let count = 0;
    for (const repo of newAuditNames) {
      const audit = await database.manager.save(Audit, {
        auditorId: auditor!.id,
        name: repo,
      });

      log.debug(`Create audit ${audit.id} ${repo}`);

      for (let issuesPage = 1; ; issuesPage++) {
        const issues = await octokit.rest.issues.listForRepo({
          owner: org,
          repo,
          page: issuesPage,
          per_page,
        });

        log.debug(`${issues.data.length} issues found for ${repo}`);

        const labels = ["sponsor acknowledged", "sponsor confirmed"];
        const medium = "2 (Med Risk)";
        const high = "3 (High Risk)";
        const issuesFiltered = issues.data
          .map((issue) => ({
            id: issue.id,
            title: issue.title,
            body: issue.body || "",
            url: issue.url,
            state: issue.state,
            labels: issue.labels.map((label) =>
              typeof label === "string" ? label : label.name || ""
            ),
          }))
          .map((issue) => ({
            ...issue,
            severity: issue.labels.some((label) => label === high)
              ? "high"
              : issue.labels.some((label) => label === medium)
              ? "medium"
              : "low",
          }))
          .filter(
            (issue) =>
              issue.state === "open" &&
              issue.labels.some((label) => labels.includes(label))
          );

        const findings = issuesFiltered.map((issue) => ({
          auditId: audit.id,
          externalId: issue.id,
          severity: issue.severity as Severity,
          title: issue.title,
          body: issue.body,
          url: issue.url,
        }));

        log.debug(`Create ${findings.length} findings for ${repo}`);

        await database.manager.save(Finding, findings);

        if (issues.data.length < per_page) break;
      }
    }

    count++;
    if (count > API_LIMITS) break;

    if (repos.data.length < per_page) break;
  }

  await disconnect();
}

export default {
  handler: "src/functions/get-findings-code4rena.main",
  maximumRetryAttempts: 0,
  events: [
    {
      schedule: {
        rate: ["rate(6 hours)"],
      },
    },
  ],
};
