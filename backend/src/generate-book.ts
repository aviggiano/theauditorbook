import mkdirp from "mkdirp";
import cmd from "./cmd";
import { Logger } from "tslog";
import { format } from "date-fns";
const log = new Logger();

export default async function main(): Promise<void> {
  log.info("generate-ebook start");

  const date = format(new Date(), "yyyy-MM-dd");
  const title = "The Auditor Book";
  const dir = `/tmp/theauditorbook`;
  await mkdirp(dir);

  await cmd(
    `pandoc -o '${title}.epub' \\
    --metadata creator="Compiled by aviggiano.eth"  \\
    --metadata title="${title}" \\
    --metadata description="The Auditor Book is a compilation of high and medium-severity findings from Code4rena & Sherlock" \\
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
