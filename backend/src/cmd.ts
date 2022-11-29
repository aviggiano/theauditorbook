import { exec } from "child_process";
import { Logger } from "tslog";

const log = new Logger();

export default async function (cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    log.info(cmd);
    exec(cmd, { maxBuffer: 1024 * 1024 * 2 }, (error, stdout, stderr) => {
      log.debug(error, stdout, stderr);
      if (error) {
        reject(error);
      } else {
        resolve(stdout.replace("\r", "").replace("\n", ""));
      }
    });
  });
}
