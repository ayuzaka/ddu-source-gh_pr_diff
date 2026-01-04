import { BaseSource } from "@shougo/ddu-vim/source";
import type { Item } from "@shougo/ddu-vim/types";
import { is, type PredicateType } from "@core/unknownutil";
import { runGh, runGhGraphQLJson, runGhJson } from "../../gh_pr_diff/infra/gh.ts";
import { getHeadCommitSha } from "../../gh_pr_diff/infra/git.ts";
import { parseJson } from "../../gh_pr_diff/gh_pr_diff_lib.ts";

type Params = Record<never, never>;

type ActionData = {
  path: string;
  isViewed: boolean;
  prId: string;
  baseRefName: string;
};

const isRepoView = is.ObjectOf({
  owner: is.ObjectOf({ login: is.String }),
  name: is.String,
});

const isPrView = is.ObjectOf({
  number: is.Number,
});

const isPrListItem = is.ObjectOf({
  number: is.Number,
  headRefOid: is.String,
});
const isPrList = is.ArrayOf(isPrListItem);
type PrListItem = PredicateType<typeof isPrListItem>;

const isFileNode = is.ObjectOf({
  path: is.String,
  viewerViewedState: is.String,
});

const isPrFilesResponse = is.ObjectOf({
  data: is.ObjectOf({
    repository: is.ObjectOf({
      pullRequest: is.ObjectOf({
        id: is.String,
        baseRefName: is.String,
        files: is.ObjectOf({
          nodes: is.ArrayOf(isFileNode),
        }),
      }),
    }),
  }),
});
type PrFilesResponse = PredicateType<typeof isPrFilesResponse>;

const findPrByHeadCommit = async (): Promise<number | undefined> => {
  const headSha = await getHeadCommitSha();
  const output = await runGh(["pr", "list", "--state", "open", "--json", "number,headRefOid"]);
  const prList = parseJson(output, isPrList, "Invalid pr list response");
  const matchingPr = prList.find((pr: PrListItem) => pr.headRefOid === headSha);

  return matchingPr?.number;
};

const resolvePrNumber = async (): Promise<number> => {
  try {
    const pr = await runGhJson(
      ["pr", "view", "--json", "number"],
      isPrView,
      "gh pr view failed",
    );
    return pr.number;
  } catch {
    const foundPrNumber = await findPrByHeadCommit();
    if (foundPrNumber !== undefined) {
      return foundPrNumber;
    }
    throw new Error("Could not determine PR number.");
  }
};

const getPrFiles = async (): Promise<PrFilesResponse> => {
  const repo = await runGhJson(
    ["repo", "view", "--json", "owner,name"],
    isRepoView,
    "Invalid repo view response",
  );
  const prNumber = await resolvePrNumber();

  const query = `
    query {
      repository(owner: "${repo.owner.login}", name: "${repo.name}") {
        pullRequest(number: ${prNumber}) {
          id
          baseRefName
          files(first: 100) {
            nodes {
              path
              viewerViewedState
            }
          }
        }
      }
    }
  `;

  return await runGhGraphQLJson(query, isPrFilesResponse, "Invalid GraphQL response");
};

export class Source extends BaseSource<Params, ActionData> {
  override kind = "gh_pr_diff";

  gather = (): ReadableStream<Item<ActionData>[]> => {
    return new ReadableStream({
      start: async (controller) => {
        const response = await getPrFiles();
        const pr = response.data.repository.pullRequest;
        const files = pr.files.nodes;

        const items = files.map((file) => {
          const isViewed = file.viewerViewedState === "VIEWED";
          return {
            word: file.path,
            display: isViewed ? `✓ ${file.path}` : `  ${file.path}`,
            action: {
              path: file.path,
              isViewed,
              prId: pr.id,
              baseRefName: pr.baseRefName,
            },
          };
        });

        controller.enqueue(items);
        controller.close();
      },
    });
  };

  params = (): Params => ({});
}
