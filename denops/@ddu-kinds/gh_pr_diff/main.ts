import type { Denops } from "@denops/core";
import * as fn from "@denops/std/function";
import { BaseKind } from "@shougo/ddu-vim/kind";
import { type ActionArguments, ActionFlags } from "@shougo/ddu-vim/types";
import { is, type PredicateType } from "@core/unknownutil";
import { runGhGraphQL, runGhJson } from "../../gh_pr_diff/infra/gh.ts";
import { runGitShow } from "../../gh_pr_diff/infra/git.ts";

type Params = Record<never, never>;

const isActionData = is.ObjectOf({
  path: is.String,
});

const isGhPrView = is.ObjectOf({
  id: is.String,
  number: is.Number,
  baseRefName: is.String,
});
type GhPrView = PredicateType<typeof isGhPrView>;

const getPullRequest = async (): Promise<GhPrView> => {
  return await runGhJson(
    ["pr", "view", "--json", "id,number,baseRefName"],
    isGhPrView,
    "Invalid gh pr view response",
  );
};

const markFileAsViewed = async (pullRequestId: string, path: string): Promise<void> => {
  const query = `
    mutation($pullRequestId: ID!, $path: String!) {
      markFileAsViewed(input: {pullRequestId: $pullRequestId, path: $path}) {
        pullRequest {
          id
        }
      }
    }
  `;
  await runGhGraphQL(query, { pullRequestId, path });
};

const openDiff = async (denops: Denops, path: string): Promise<void> => {
  const { baseRefName } = await getPullRequest();

  const baseLines = await runGitShow(baseRefName, path);
  const escaped = await fn.fnameescape(denops, path);

  await denops.cmd("diffoff!");
  await denops.cmd("only");

  await denops.cmd(`edit ${escaped}`);
  await denops.cmd("diffthis");

  await denops.cmd("vnew");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("setlocal bufhidden=wipe");
  await denops.cmd("setlocal noswapfile");
  await fn.setline(denops, 1, baseLines);
  await denops.cmd("diffthis");
};

export class Kind extends BaseKind<Params> {
  actions = {
    open: async (
      args: ActionArguments<Params>,
    ): Promise<ActionFlags> => {
      const item = args.items[0];
      if (!item || !isActionData(item.action)) {
        return ActionFlags.None;
      }
      const escaped = await fn.fnameescape(args.denops, item.action.path);
      await args.denops.cmd(`edit ${escaped}`);
      return ActionFlags.None;
    },

    diff: async (
      args: ActionArguments<Params>,
    ): Promise<ActionFlags> => {
      const item = args.items[0];
      if (!item || !isActionData(item.action)) {
        return ActionFlags.None;
      }

      await openDiff(args.denops, item.action.path);

      return ActionFlags.None;
    },

    markAsViewed: async (
      args: ActionArguments<Params>,
    ): Promise<ActionFlags> => {
      const { id } = await getPullRequest();
      for (const item of args.items) {
        if (!isActionData(item.action)) {
          continue;
        }
        await markFileAsViewed(id, item.action.path);
      }
      return ActionFlags.RefreshItems;
    },
  };

  params = (): Params => ({});
}
