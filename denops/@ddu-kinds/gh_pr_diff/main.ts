import type { Denops } from "@denops/core";
import * as fn from "@denops/std/function";
import { BaseKind } from "@shougo/ddu-vim/kind";
import { type ActionArguments, ActionFlags } from "@shougo/ddu-vim/types";
import { is } from "@core/unknownutil";
import { runGhGraphQL } from "../../gh_pr_diff/infra/gh.ts";
import { runGitShow } from "../../gh_pr_diff/infra/git.ts";

type Params = Record<never, never>;

const isActionData = is.ObjectOf({
  path: is.String,
  prId: is.String,
  baseRefName: is.String,
});

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

const openDiff = async (
  denops: Denops,
  path: string,
  baseRefName: string,
): Promise<void> => {
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

      await openDiff(
        args.denops,
        item.action.path,
        item.action.baseRefName,
      );

      return ActionFlags.None;
    },

    markAsViewed: async (
      args: ActionArguments<Params>,
    ): Promise<ActionFlags> => {
      for (const item of args.items) {
        if (!isActionData(item.action)) {
          continue;
        }
        await markFileAsViewed(item.action.prId, item.action.path);
      }
      return ActionFlags.RefreshItems;
    },
  };

  params = (): Params => ({});
}
