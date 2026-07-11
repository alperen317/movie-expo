export function getInitials(email: string): string {
  const name = email.split('@')[0] ?? '';
  return name.slice(0, 2).toUpperCase() || '?';
}
