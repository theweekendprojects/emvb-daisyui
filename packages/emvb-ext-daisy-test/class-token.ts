const PREFIX = "daisy-";

/**
 * One catalog class as the extension writes it. The catalog uses plain names (`btn`, `[--value:70]`).
 * daisyUI with a prefix renames its own CSS variables as well as its classes, so its rules read
 * `--daisy-value`, not `--value`. A per-instance variable class is renamed to match, or the rule
 * never sees it and a countdown or a radial stays at 0.
 */
export function prefixClassToken(token: string): string {
  return PREFIX + token.replace(/^\[--([a-z][a-z0-9-]*):/, `[--${PREFIX}$1:`);
}
