import cmd from "./cmd";
import { Logger } from "tslog";
import { format } from "date-fns";
const log = new Logger();

export default async function main(md: string, epub: string): Promise<void> {
  log.info(`generate-from-md-to-epub '${md}' '${epub}' start`);

  const date = format(new Date(), "yyyy-MM-dd");

  await cmd(
    `pandoc -o ${epub} \\
    --metadata creator="Compiled by aviggiano.eth"  \\
    --metadata title="The Auditor Book" \\
    --metadata description="The Auditor Book is a compilation of high and medium-severity findings from Code4rena & Sherlock" \\
    --metadata date="${date}" \\
    --metadata cover-image="cover.png" \\
    --toc \\
    --number-sections \\
    --standalone \\
    --from markdown-yaml_metadata_block \\
    '${md}'`
  );

  log.info(`generate-from-md-to-epub '${md}' '${epub}' end`);
}

main(process.argv[2], process.argv[3]);
