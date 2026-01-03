import { ensure, type Predicate } from "@core/unknownutil";

export const parseNameOnlyOutput = (output: string): string[] => {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

export const parseJson = <T>(
  text: string,
  predicate: Predicate<T>,
  errorMessage: string,
): T => {
  const parsed: unknown = JSON.parse(text);
  try {
    return ensure(parsed, predicate);
  } catch {
    throw new Error(errorMessage);
  }
};
