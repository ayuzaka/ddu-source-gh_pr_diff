import { BaseSource } from "@shougo/ddu-vim/source";
import type { Item } from "@shougo/ddu-vim/types";
import { parseNameOnlyOutput } from "../../gh_pr_diff/gh_pr_diff_lib.ts";
import { runGh } from "../../gh_pr_diff/infra/gh.ts";

type Params = Record<never, never>;

type ActionData = {
  path: string;
};

export class Source extends BaseSource<Params, ActionData> {
  override kind = "gh_pr_diff";

  gather = (): ReadableStream<Item<ActionData>[]> => {
    return new ReadableStream({
      start: async (controller) => {
        const output = await runGh(["pr", "diff", "--name-only"]);
        const paths = parseNameOnlyOutput(output);

        const items = paths.map((path) => ({
          word: path,
          action: {
            path,
          },
        }));

        controller.enqueue(items);
        controller.close();
      },
    });
  };

  params = (): Params => ({});
}
