import { BaseSource } from "@shougo/ddu-vim/source";
import type { Item } from "@shougo/ddu-vim/types";
import { is, type PredicateType } from "@core/unknownutil";
import { runGhGraphQLJson, runGhJson } from "../../gh_pr_diff/infra/gh.ts";

type Params = Record<never, never>;

type ActionData = {
  path: string;
  isViewed: boolean;
};

const isRepoView = is.ObjectOf({
  owner: is.ObjectOf({ login: is.String }),
  name: is.String,
});

const isPrView = is.ObjectOf({
  number: is.Number,
});

const isFileNode = is.ObjectOf({
  path: is.String,
  viewerViewedState: is.String,
});

const isPrFilesResponse = is.ObjectOf({
  data: is.ObjectOf({
    repository: is.ObjectOf({
      pullRequest: is.ObjectOf({
        files: is.ObjectOf({
          nodes: is.ArrayOf(isFileNode),
        }),
      }),
    }),
  }),
});
type PrFilesResponse = PredicateType<typeof isPrFilesResponse>;

const getPrFiles = async (): Promise<PrFilesResponse> => {
  const repo = await runGhJson(
    ["repo", "view", "--json", "owner,name"],
    isRepoView,
    "Invalid repo view response",
  );
  const pr = await runGhJson(
    ["pr", "view", "--json", "number"],
    isPrView,
    "Invalid pr view response",
  );

  const query = `
    query {
      repository(owner: "${repo.owner.login}", name: "${repo.name}") {
        pullRequest(number: ${pr.number}) {
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
        const files = response.data.repository.pullRequest.files.nodes;

        const items = files.map((file) => {
          const isViewed = file.viewerViewedState === "VIEWED";
          return {
            word: file.path,
            display: isViewed ? `✓ ${file.path}` : `  ${file.path}`,
            action: {
              path: file.path,
              isViewed,
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
