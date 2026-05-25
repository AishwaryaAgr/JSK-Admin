export function buildIntroducerIdLookup(
  members: { name: string; jskId: number }[]
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const member of members) {
    const key = member.name.toLowerCase().trim();
    if (key && !lookup.has(key)) {
      lookup.set(key, `JSK-${member.jskId}`);
    }
  }
  return lookup;
}

export function buildIntroducerNameLookup(
  members: { name: string; jskId: number }[]
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const member of members) {
    lookup.set(`JSK-${member.jskId}`, member.name);
  }
  return lookup;
}

export function resolveIntroducerId(
  introducerName: string,
  lookup: Map<string, string>
): string | null {
  const key = introducerName.toLowerCase().trim();
  if (!key) return null;
  return lookup.get(key) ?? null;
}

export function getIntroducerDisplayName(
  introducerId: string | null | undefined,
  nameLookup: Map<string, string>
): string {
  if (!introducerId) return '—';
  return nameLookup.get(introducerId) ?? introducerId;
}
