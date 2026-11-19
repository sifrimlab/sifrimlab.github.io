export type MemberRole = 'pi' | 'postdoc' | 'phd' | 'staff' | 'programmer' | 'grad' | 'alumni';

export interface HomeContent {
  readonly title: string;
  readonly tagline: string;
  readonly affiliation: string;
  readonly introHtml: string;
  readonly people: string;
  readonly featuredPublications: readonly string[];
}

export interface ResourceLinks {
  readonly paper?: string;
  readonly code?: string;
  readonly docs?: string;
  readonly browser?: string;
}

/** A method, piece of software, benchmark or data resource produced by the lab. */
export interface ResearchResource {
  readonly slug: string;
  readonly title: string;
  readonly theme: string;
  readonly kind: string;
  readonly order: number;
  readonly summary: string;
  readonly image?: string;
  readonly imageFit: 'contain' | 'cover';
  readonly imageCaption?: string;
  readonly links: ResourceLinks;
}

export interface ResearchTheme {
  readonly slug: string;
  readonly title: string;
  readonly order: number;
  /** The biological question (biology ink). */
  readonly question: string;
  /** The computational approach (computation ink). */
  readonly approach: string;
  readonly resources: readonly string[];
  readonly publications: readonly string[];
  readonly people: readonly string[];
  readonly bodyHtml: string;
}

export interface TeamMemberLinks {
  readonly github?: string;
  readonly googleScholar?: string;
  readonly orcid?: string;
  readonly linkedin?: string;
  readonly twitter?: string;
  readonly website?: string;
}

export interface TeamMember {
  readonly slug: string;
  readonly name: string;
  readonly role: MemberRole;
  readonly roleLabel: string;
  readonly image: string;
  readonly hasPhoto: boolean;
  readonly isAlumni: boolean;
  readonly links: TeamMemberLinks;
  readonly excerpt: string;
  readonly bioHtml: string;
}

export interface NewsPost {
  readonly slug: string;
  readonly title: string;
  readonly date: string;
  readonly tags: readonly string[];
  readonly image?: string;
  readonly excerpt: string;
  readonly bodyHtml: string;
}

export interface CitationAuthor {
  readonly name: string;
  /** Slug of the matching (current or former) lab member, if any. */
  readonly member?: string;
}

export interface CitationItem {
  readonly id: string;
  readonly title: string;
  readonly authors: readonly CitationAuthor[];
  readonly venue: string;
  readonly date: string;
  readonly year: string;
  readonly link: string;
  readonly isPreprint: boolean;
  /** A lab member is first or last author. */
  readonly labLed: boolean;
}

export interface JoinTrack {
  readonly slug: string;
  readonly title: string;
  readonly order: number;
  readonly bodyHtml: string;
}

export interface SiteContentBundle {
  readonly home: HomeContent;
  readonly research: readonly ResearchTheme[];
  readonly resources: readonly ResearchResource[];
  readonly team: readonly TeamMember[];
  readonly news: readonly NewsPost[];
  readonly citations: readonly CitationItem[];
  readonly join: readonly JoinTrack[];
}
