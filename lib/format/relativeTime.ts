export type RelativeTimeUnit = 'now' | 'minutes' | 'hours' | 'days';

export interface RelativeTimeParts {
  unit: RelativeTimeUnit;
  count: number;
}

export function getRelativeTimeParts(dateString: string): RelativeTimeParts {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return { unit: 'now', count: 0 };
  if (diffMinutes < 60) return { unit: 'minutes', count: diffMinutes };
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return { unit: 'hours', count: diffHours };
  const diffDays = Math.floor(diffHours / 24);
  return { unit: 'days', count: diffDays };
}
