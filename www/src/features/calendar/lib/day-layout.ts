/** A timed block on one day, in minutes from midnight. */
export interface Block {
  key: string;
  start: number;
  end: number;
}

export interface PlacedBlock extends Block {
  /** Which column it sits in, from 0. */
  column: number;
  /** How many columns its overlapping group shares the width between. */
  columns: number;
}

/** A block this short still gets room for its title. */
const MIN_LENGTH = 20;

/**
 * Side by side where they overlap, as on Apple's calendar: blocks that
 * overlap, directly or through others, share the day's width, each in
 * the first column free at its start.
 */
export function layoutDay(blocks: readonly Block[]): PlacedBlock[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed: PlacedBlock[] = [];
  let group: PlacedBlock[] = [];
  let groupEnd = -1;
  const settle = () => {
    const columns = Math.max(0, ...group.map((block) => block.column)) + 1;
    for (const block of group) block.columns = columns;
    group = [];
  };

  for (const block of sorted) {
    const end = Math.max(block.end, block.start + MIN_LENGTH);
    if (group.length > 0 && block.start >= groupEnd) settle();
    const taken = new Set(
      group
        .filter((other) => Math.max(other.end, other.start + MIN_LENGTH) > block.start)
        .map((other) => other.column),
    );
    let column = 0;
    while (taken.has(column)) column += 1;
    const entry = { ...block, column, columns: 1 };
    group.push(entry);
    placed.push(entry);
    groupEnd = Math.max(groupEnd, end);
  }
  if (group.length > 0) settle();
  return placed;
}
