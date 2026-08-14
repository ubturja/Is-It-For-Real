/**
 * Filter-bubble simulation for the Echo Chamber experiment.
 *
 * Deliberate choice: topic-frequency weighting, not ML.
 * Each clicked item (by id) adds 1 to every topic tag it carries. An item's
 * score is the sum of those frequencies for its tags. Once any topic reaches
 * NARROW_AFTER_TOPIC_CLICKS, items that lack the dominant topic are dropped.
 * Ties on dominance break alphabetically; remaining items sort by score
 * descending, then original index. Same inputs always yield the same feed —
 * deterministic and auditable, in the spirit of SYSTEM_REFERENCE.md §8
 * principle 5 (the model must not invent the sequence).
 */

export type FeedItem = {
  id: string;
  topics: readonly string[];
};

/** Clicks on one topic before the feed drops items that lack it. */
export const NARROW_AFTER_TOPIC_CLICKS = 3;

type Scored<T> = {
  item: T;
  index: number;
  score: number;
};

function topicCountsFromClicks(
  itemsById: Map<string, FeedItem>,
  clickHistory: readonly string[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const itemId of clickHistory) {
    const clicked = itemsById.get(itemId);
    if (clicked === undefined) {
      continue;
    }
    for (const topic of clicked.topics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return counts;
}

function scoreItem(item: FeedItem, counts: Map<string, number>): number {
  let score = 0;
  for (const topic of item.topics) {
    score += counts.get(topic) ?? 0;
  }
  return score;
}

function dominantTopic(
  counts: Map<string, number>,
): { topic: string; count: number } | undefined {
  let best: { topic: string; count: number } | undefined;
  for (const [topic, count] of counts) {
    if (
      best === undefined ||
      count > best.count ||
      (count === best.count && topic < best.topic)
    ) {
      best = { topic, count };
    }
  }
  return best;
}

export function narrowFeed<T extends FeedItem>(
  allItems: readonly T[],
  clickHistory: readonly string[],
): T[] {
  if (clickHistory.length === 0) {
    return [...allItems];
  }

  const itemsById = new Map<string, T>();
  for (const item of allItems) {
    itemsById.set(item.id, item);
  }

  const counts = topicCountsFromClicks(itemsById, clickHistory);
  const dominant = dominantTopic(counts);

  const scored: Scored<T>[] = allItems.map((item, index) => ({
    item,
    index,
    score: scoreItem(item, counts),
  }));

  const selected =
    dominant !== undefined && dominant.count >= NARROW_AFTER_TOPIC_CLICKS
      ? scored.filter((entry) => entry.item.topics.includes(dominant.topic))
      : scored;

  selected.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.index - right.index;
  });

  return selected.map((entry) => entry.item);
}
