/**
 * Compiles the Markdown content in content/ and the generated citation list in
 * _data/citations.yaml into a typed bundle (src/generated/content.ts).
 *
 * The build FAILS when content references something that does not exist
 * (an unknown DOI, team member, resource or image). This keeps every factual
 * claim on the site traceable to a curated source.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import YAML from 'yaml';
import type {
  CitationAuthor,
  CitationItem,
  HomeContent,
  JoinTrack,
  MemberRole,
  NewsPost,
  ResearchResource,
  ResearchTheme,
  SiteContentBundle,
  TeamMember,
  TeamMemberLinks,
} from '../src/types/content.ts';

const root = process.cwd();
const BASE = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/');
const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
const errors: string[] = [];

type Data = Record<string, unknown>;
interface MdFile {
  filename: string;
  data: Data;
  content: string;
}

function fail(msg: string): void {
  errors.push(msg);
}

/** Render markdown and prefix root-relative src/href with the deploy base path. */
function render(markdown: string): string {
  const html = md.render(markdown);
  if (BASE === '/') return html;
  return html.replace(/(src|href)="\/(?!\/)/g, `$1="${BASE}`);
}

function plain(html: string, maxLen = 180): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).replace(/\s+\S*$/, '')}…`;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback;
}

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()) : [];
}

function imageExists(img: string): boolean {
  return fs.existsSync(path.join(root, 'public', img));
}

function readDir(rel: string): MdFile[] {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => {
      const parsed = matter(fs.readFileSync(path.join(dir, e.name), 'utf8'));
      return { filename: e.name, data: (parsed.data ?? {}) as Data, content: parsed.content.trim() };
    });
}

/* ── Team ─────────────────────────────────────────────────── */

const ROLE_ORDER: Record<MemberRole, number> = {
  pi: 1,
  postdoc: 2,
  staff: 3,
  phd: 4,
  programmer: 4,
  grad: 6,
  alumni: 7,
};

function compileTeam(): TeamMember[] {
  const parse = (item: MdFile, alumni: boolean): TeamMember => {
    const d = item.data;
    const slug = path.basename(item.filename, '.md');
    const rawRole = str(d.role, 'phd') as MemberRole;
    const role: MemberRole = alumni ? 'alumni' : rawRole in ROLE_ORDER ? rawRole : 'phd';
    const img = str(d.image);
    const normalized = img ? (img.startsWith('/') ? img : `/${img}`) : '';
    const hasPhoto = Boolean(normalized) && imageExists(normalized);
    // Prefer the web-sized derivative in public/images/team/web/ when present.
    const web = normalized.replace(/^\/images\/team\/([^/]+)\.[^.]+$/, '/images/team/web/$1.jpg');
    const photo = hasPhoto && web !== normalized && imageExists(web) ? web : normalized;
    const bioHtml = item.content ? render(item.content) : '';
    const raw = (d.links && typeof d.links === 'object' ? d.links : {}) as Data;
    const links: TeamMemberLinks = Object.fromEntries(
      ['github', 'googleScholar', 'orcid', 'linkedin', 'twitter', 'website']
        .filter((k) => typeof raw[k] === 'string' && String(raw[k]).trim())
        .map((k) => [k, String(raw[k]).trim()]),
    );
    return {
      slug,
      name: str(d.name, slug),
      role,
      roleLabel: str(d.roleLabel, alumni ? 'Previous member' : 'Researcher'),
      image: hasPhoto ? photo : '',
      hasPhoto,
      isAlumni: alumni,
      links,
      excerpt: bioHtml ? plain(bioHtml, 150) : '',
      bioHtml,
    };
  };
  return [
    ...readDir('content/team').map((i) => parse(i, false)),
    ...readDir('content/team/previous-members').map((i) => parse(i, true)),
  ].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));
}

/* ── Citations ────────────────────────────────────────────── */

function normName(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function matchMember(author: string, team: readonly TeamMember[]): string | undefined {
  const a = normName(author);
  if (a.length < 2) return undefined;
  for (const m of team) {
    const n = normName(m.name);
    // same first given name and same final family-name token
    if (n[0] === a[0] && n[n.length - 1] === a[a.length - 1]) return m.slug;
  }
  return undefined;
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function compileCitations(team: readonly TeamMember[]): CitationItem[] {
  const file = path.join(root, '_data/citations.yaml');
  if (!fs.existsSync(file)) return [];
  const parsed = YAML.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((e: Data): CitationItem => {
      const id = str(e.id);
      const date = str(e.date, '');
      const authors: CitationAuthor[] = list(e.authors).map((name) => {
        const member = matchMember(name, team);
        return member ? { name, member } : { name };
      });
      const doi = id.startsWith('doi:') ? id.slice(4) : '';
      const arxiv = id.startsWith('arxiv:') ? id.slice(6) : '';
      const link = doi ? `https://doi.org/${doi}` : arxiv ? `https://arxiv.org/abs/${arxiv}` : str(e.link);
      const venue = decode(str(e.publisher, ''));
      const isPreprint = /rxiv|research square|ssrn|preprints|authorea|osf/i.test(venue) || Boolean(arxiv);
      const first = authors[0];
      const last = authors[authors.length - 1];
      if (!date) fail(`citations.yaml: ${id} has no date`);
      return {
        id,
        title: decode(str(e.title, '')),
        authors,
        venue: venue === 'openRxiv' ? 'bioRxiv' : venue,
        date,
        year: date.slice(0, 4),
        link,
        isPreprint,
        labLed: Boolean(first?.member || last?.member),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ── Research & resources ─────────────────────────────────── */

function compileResources(): ResearchResource[] {
  return readDir('content/projects')
    .map((item): ResearchResource => {
      const d = item.data;
      const slug = str(d.slug, path.basename(item.filename, '.md'));
      const image = str(d.image);
      if (image && !imageExists(image)) fail(`resource ${slug}: image ${image} not found in public/`);
      const rawLinks = (d.links && typeof d.links === 'object' ? d.links : {}) as Data;
      const links = Object.fromEntries(
        ['paper', 'code', 'docs', 'browser'].filter((k) => str(rawLinks[k])).map((k) => [k, str(rawLinks[k])]),
      );
      const caption = str(d.imageCaption);
      return {
        slug,
        title: str(d.title, slug),
        theme: str(d.theme),
        kind: str(d.kind, 'Method'),
        order: typeof d.order === 'number' ? d.order : 99,
        summary: str(d.summary),
        ...(image ? { image } : {}),
        imageFit: d.imageFit === 'cover' ? 'cover' : 'contain',
        ...(caption ? { imageCaption: caption } : {}),
        links,
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function compileResearch(): ResearchTheme[] {
  return readDir('content/research')
    .map((item, idx): ResearchTheme => {
      const d = item.data;
      const slug = str(d.slug, path.basename(item.filename, '.md'));
      const question = str(d.question);
      const approach = str(d.approach);
      if (!question || !approach) fail(`research ${slug}: both "question" and "approach" are required`);
      return {
        slug,
        title: str(d.title, slug),
        order: typeof d.order === 'number' ? d.order : idx + 1,
        question,
        approach,
        resources: list(d.resources),
        publications: list(d.publications),
        people: list(d.people),
        bodyHtml: render(item.content),
      };
    })
    .sort((a, b) => a.order - b.order);
}

/* ── Home, news, join ─────────────────────────────────────── */

function compileHome(): HomeContent {
  const parsed = matter(fs.readFileSync(path.join(root, 'content/home/index.md'), 'utf8'));
  const d = (parsed.data ?? {}) as Data;
  return {
    title: str(d.title, 'Laboratory of Multi-omic Integrative Bioinformatics'),
    tagline: str(d.tagline),
    affiliation: str(d.affiliation),
    introHtml: render(parsed.content.trim()),
    people: str(d.people),
    featuredPublications: list(d.featuredPublications),
  };
}

function compileNews(): NewsPost[] {
  return readDir('content/news')
    .map((item): NewsPost => {
      const d = item.data;
      const m = item.filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      const date = str(d.date, m?.[1] ?? '');
      const slug = str(d.slug, m?.[2] ?? path.basename(item.filename, '.md'));
      const bodyHtml = render(item.content);
      const image = str(d.image);
      if (image && !imageExists(image)) fail(`news ${item.filename}: image ${image} not found`);
      return {
        slug: `${date}-${slug}`,
        title: str(d.title, slug).replace(/\.$/, ''),
        date,
        tags: list(d.tags),
        ...(image && imageExists(image) ? { image } : {}),
        excerpt: plain(bodyHtml, 200),
        bodyHtml,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function compileJoin(): JoinTrack[] {
  return readDir('content/join')
    .map((item, idx): JoinTrack => ({
      slug: str(item.data.slug, path.basename(item.filename, '.md')),
      title: str(item.data.title),
      order: typeof item.data.order === 'number' ? item.data.order : idx + 1,
      bodyHtml: render(item.content),
    }))
    .sort((a, b) => a.order - b.order);
}

/* ── Assemble & validate ──────────────────────────────────── */

const team = compileTeam();
const citations = compileCitations(team);
const resources = compileResources();
const research = compileResearch();
const home = compileHome();

const citationIds = new Set(citations.map((c) => c.id));
const memberSlugs = new Set(team.map((m) => m.slug));
const themeSlugs = new Set(research.map((r) => r.slug));
const resourceSlugs = new Set(resources.map((r) => r.slug));

for (const theme of research) {
  for (const id of theme.publications)
    if (!citationIds.has(id)) fail(`research ${theme.slug}: publication ${id} is not in _data/citations.yaml`);
  for (const p of theme.people) if (!memberSlugs.has(p)) fail(`research ${theme.slug}: unknown team member "${p}"`);
  for (const r of theme.resources) if (!resourceSlugs.has(r)) fail(`research ${theme.slug}: unknown resource "${r}"`);
}
for (const r of resources) if (!themeSlugs.has(r.theme)) fail(`resource ${r.slug}: unknown theme "${r.theme}"`);
for (const id of home.featuredPublications)
  if (!citationIds.has(id)) fail(`home: featured publication ${id} is not in _data/citations.yaml`);

if (errors.length) {
  console.error(`Content integrity check failed:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}

const bundle: SiteContentBundle = {
  home,
  research,
  resources,
  team,
  news: compileNews(),
  citations,
  join: compileJoin(),
};

const outDir = path.join(root, 'src/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'content.ts'),
  `// AUTO-GENERATED BY scripts/compile-content.ts — DO NOT EDIT MANUALLY
import type { SiteContentBundle } from '../types/content';

export const siteContent: SiteContentBundle = ${JSON.stringify(bundle, null, 2)};
`,
  'utf8',
);
console.log(
  `Compiled content: ${research.length} research themes, ${resources.length} resources, ${team.length} people, ` +
    `${bundle.news.length} news posts, ${citations.length} publications, ${bundle.join.length} join tracks.`,
);
