import { type Predicate } from "@core/unknownutil";
import { parseJson } from "../gh_pr_diff_lib.ts";

export const runGh = async (args: string[]): Promise<string> => {
  const command = new Deno.Command("gh", { args, stdout: "piped", stderr: "piped" });
  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    const errorOutput = new TextDecoder().decode(stderr);
    throw new Error(`gh command failed: ${args.join(" ")}: ${errorOutput}`);
  }

  return new TextDecoder().decode(stdout);
};

export const runGhJson = async <T>(
  args: string[],
  predicate: Predicate<T>,
  errorMessage: string,
): Promise<T> => {
  const output = await runGh(args);

  return parseJson(output, predicate, errorMessage);
};

export const runGhGraphQL = async (
  query: string,
  variables: Record<string, string> = {},
): Promise<void> => {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    args.push("-f", `${key}=${value}`);
  }
  await runGh(args);
};

export const runGhGraphQLJson = async <T>(
  query: string,
  predicate: Predicate<T>,
  errorMessage: string,
): Promise<T> => {
  const output = await runGh(["api", "graphql", "-f", `query=${query}`]);
  return parseJson(output, predicate, errorMessage);
};
