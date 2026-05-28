/**
 * Tiny class-name combinator.
 *
 * We intentionally avoid pulling in `clsx`/`classnames` — keeping the
 * shared/ui layer dependency-free makes the primitives easier to copy or
 * inline-extract.
 */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}
