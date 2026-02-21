type ReviewQueueLikeItem = {
  artifactId: number;
  streak: number;
  interval: number;
  front?: string | null;
};

export function getReviewStats(
  todayItems: ReviewQueueLikeItem[] | undefined,
  allItems: ReviewQueueLikeItem[] | undefined,
) {
  const totalCards = allItems?.length || 0;
  const dueCards = todayItems?.length || 0;
  const estimatedMinutes = dueCards * 2;
  const streak = allItems?.reduce((max, item) => Math.max(max, item.streak), 0) || 0;

  return { totalCards, dueCards, estimatedMinutes, streak };
}

export function getReviewQueueLabel(item: ReviewQueueLikeItem) {
  const front = item.front?.trim();
  if (front) return front;
  return `Flashcard #${item.artifactId}`;
}
