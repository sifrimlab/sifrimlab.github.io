import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { siteContent } from './generated/content';

export interface HeadData {
  title: string;
  description: string;
}

const SITE = 'LMIB';
/** Browser tab title: just the site name on the home page, "LMIB | Page" elsewhere. */
const tab = (page: string): string => `${SITE} | ${page}`;
const DEFAULT_DESCRIPTION =
  'The Laboratory of Multi-omic Integrative Bioinformatics (LMIB) at KU Leuven develops artificial intelligence for molecular biology: methods for multi-omic, spatial and single-cell data, applied to human disease.';

export function headFor(route: RouteLocationNormalizedLoaded): HeadData {
  const slug = String(route.params.slug ?? '');
  switch (route.name) {
    case 'home':
      return { title: SITE, description: DEFAULT_DESCRIPTION };
    case 'research':
      return {
        title: tab('Research'),
        description: `Research themes of LMIB: ${siteContent.research.map((r) => r.title.toLowerCase()).join('; ')}.`,
      };
    case 'publications':
      return { title: tab('Publications'), description: 'Publications and preprints from the Laboratory of Multi-omic Integrative Bioinformatics at KU Leuven.' };
    case 'team':
      return { title: tab('Team'), description: 'The postdocs, doctoral candidates, staff and previous members of the Laboratory of Multi-omic Integrative Bioinformatics at KU Leuven.' };
    case 'team-member': {
      const m = siteContent.team.find((x) => x.slug === slug);
      return m
        ? { title: tab(m.name), description: m.excerpt || `${m.name}, ${m.roleLabel} at LMIB, KU Leuven.` }
        : { title: tab('Team'), description: DEFAULT_DESCRIPTION };
    }
    case 'news':
      return { title: tab('News'), description: 'News from the Laboratory of Multi-omic Integrative Bioinformatics at KU Leuven.' };
    case 'news-post': {
      const p = siteContent.news.find((x) => x.slug === slug);
      return p ? { title: tab(p.title), description: p.excerpt } : { title: tab('News'), description: DEFAULT_DESCRIPTION };
    }
    case 'join':
      return { title: tab('Join us'), description: 'How to join the Laboratory of Multi-omic Integrative Bioinformatics at KU Leuven as a postdoc, PhD or master student.' };
    case 'privacy':
      return { title: tab('Privacy'), description: DEFAULT_DESCRIPTION };
    case 'terms':
      return { title: tab('Terms of use'), description: DEFAULT_DESCRIPTION };
    default:
      return { title: tab('Page not found'), description: DEFAULT_DESCRIPTION };
  }
}
