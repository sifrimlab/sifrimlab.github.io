import { siteContent } from '../generated/content';
import type { CitationItem, TeamMember } from '../types/content';

/** Prefix a root-relative public path (e.g. /images/x.jpg) with the deploy base. */
export function withBase(p: string | undefined): string {
  if (!p) return '';
  if (!p.startsWith('/') || p.startsWith('//')) return p;
  return import.meta.env.BASE_URL.replace(/\/$/, '') + p;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Deterministic date formatting (identical on server and client). */
export function formatDate(iso: string, style: 'long' | 'month' = 'long'): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m) return iso;
  const month = MONTHS[m - 1] ?? '';
  return style === 'month' || !d ? `${month} ${y}` : `${d} ${month} ${y}`;
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase();
}

const citationsById = new Map(siteContent.citations.map((c) => [c.id, c]));
const membersBySlug = new Map(siteContent.team.map((m) => [m.slug, m]));

export function citation(id: string): CitationItem | undefined {
  return citationsById.get(id);
}

export function member(slug: string): TeamMember | undefined {
  return membersBySlug.get(slug);
}

export const LINKS = {
  github: 'https://github.com/sifrimlab',
  scholar: 'https://scholar.google.com/citations?user=VJPqNlQAAAAJ',
  orcid: 'https://orcid.org/0000-0001-8247-4020',
  contact: 'https://www.kuleuven.be/wieiswie/en/person/00041034',
  kuleuven: 'https://www.kuleuven.be',
  lisco: 'https://lisco.kuleuven.be',
} as const;
