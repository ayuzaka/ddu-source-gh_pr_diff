export const runGitShow = async (
  ref: string,
  path: string,
): Promise<string[]> => {
  const spec = `${ref}:${path}` as const;
  const command = new Deno.Command("git", {
    args: ["show", spec],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout } = await command.output();
  if (code !== 0) {
    return [];
  }

  const output = new TextDecoder().decode(stdout);

  return output.split("\n");
};
