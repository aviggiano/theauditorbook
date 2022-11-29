import cmd from "./cmd";
import { Logger } from "tslog";
import { format } from "date-fns";
const log = new Logger();

export default async function main(filename: string): Promise<void> {
  log.info(`generate-ebook '${filename}' start`);

  const date = format(new Date(), "yyyy-MM-dd");

  await cmd(
    `pandoc -o 'The Auditor Book.epub' \\
    --metadata creator="Compiled by aviggiano.eth"  \\
    --metadata title="The Auditor Book" \\
    --metadata description="The Auditor Book is a compilation of high and medium-severity findings from Code4rena & Sherlock" \\
    --metadata date="${date}" \\
    --metadata cover-image="cover.png" \\
    --toc \\
    --number-sections \\
    --standalone \\
    --from markdown-yaml_metadata_block \\
    '${filename}'`
  );

  log.info(`generate-ebook '${filename}' end`);
}

main(process.argv[2]);
