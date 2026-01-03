import { assertEquals } from "@std/assert";
import { parseNameOnlyOutput } from "./gh_pr_diff_lib.ts";

Deno.test("parseNameOnlyOutput should trim lines and drop empties", () => {
  const input = "src/a.ts\n\n  src/b.ts  \n";
  assertEquals(parseNameOnlyOutput(input), ["src/a.ts", "src/b.ts"]);
});
