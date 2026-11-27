"""
utility functions for cite process and plugins
"""

import subprocess
import html
from difflib import SequenceMatcher
import json
import re
import yaml
from yaml.loader import SafeLoader
from pathlib import Path
from datetime import datetime
from rich import print
from diskcache import Cache


# cache for time-consuming network requests
cache = Cache("./_cite/.cache")


# clear expired items from cache
cache.expire()


def log_cache(func):
    """
    decorator to use around memoized function to log if cached or or not
    """

    def wrap(*args):
        key = func.__cache_key__(*args)
        if key in cache:
            log(" (from cache)", level="INFO", newline=False)
        return func(*args)

    return wrap


def log(message="\n--------------------\n", indent=0, level="", newline=True):
    """
    log to terminal, color determined by indent and level
    """

    palette = {
        0: "[orange1]",
        1: "[salmon1]",
        2: "[violet]",
        3: "[sky_blue1]",
        "ERROR": "[white on #F43F5E]",
        "WARNING": "[black on #EAB308]",
        "SUCCESS": "[black on #10B981]",
        "INFO": "[grey70]",
    }
    color = get_safe(palette, level, "") or get_safe(palette, indent, "") or "[white]"
    if newline:
        print()
    print(indent * "    " + color + str(message) + "[/]", end="", flush=True)


def label(entry):
    """
    get "label" of dict entry (for logging purposes)
    """

    return str(list(entry.keys())[0]) + ": " + str(list(entry.values())[0])


def get_safe(item, path, default=None):
    """
    safely access value in nested lists/dicts
    """

    for part in str(path).split("."):
        try:
            part = int(part)
        except ValueError:
            part = part
        try:
            item = item[part]
        except (KeyError, IndexError, AttributeError, TypeError):
            return default
    return item


def list_of_dicts(data):
    """
    check if data is list of dicts
    """

    return isinstance(data, list) and all(isinstance(entry, dict) for entry in data)


def format_date(date):
    """
    format date as YYYY-MM-DD, or no date if malformed
    """

    if isinstance(date, int):
        return datetime.fromtimestamp(date // 1000.0).strftime("%Y-%m-%d")
    try:
        return datetime.strptime(date, "%Y-%m-%d").strftime("%Y-%m-%d")
    except Exception:
        return ""


def load_data(path):
    """
    read data from yaml or json file
    """

    # convert to path object
    path = Path(path)

    # check if file exists
    if not path.is_file():
        raise Exception("Can't find file")

    # try to open file
    try:
        file = open(path, encoding="utf8")
    except Exception as e:
        raise Exception(e or "Can't open file")

    # try to parse as yaml
    try:
        with file:
            data = yaml.load(file, Loader=SafeLoader)
    except Exception:
        raise Exception("Can't parse file. Make sure it's valid YAML.")

    # if no errors, return data
    return data


def save_data(path, data):
    """
    write data to yaml file
    """

    # convert to path object
    path = Path(path)

    # try to open file
    try:
        file = open(path, mode="w")
    except Exception:
        raise Exception("Can't open file for writing")

    # prevent yaml anchors/aliases (pointers)
    yaml.Dumper.ignore_aliases = lambda *args: True

    # try to save data as yaml
    try:
        with file:
            yaml.dump(data, file, default_flow_style=False, sort_keys=False)
    except Exception:
        raise Exception("Can't save YAML to file")

    # write warning note to top of file
    note = "# DO NOT EDIT, GENERATED AUTOMATICALLY"
    try:
        with open(path, "r") as file:
            data = file.read()
        with open(path, "w") as file:
            file.write(f"{note}\n\n{data}")
    except Exception:
        raise Exception("Can't write to file")


@log_cache
@cache.memoize(name="manubot", expire=30 * (60 * 60 * 24))
def cite_with_manubot(_id):
    """
    generate citation data for source id with Manubot
    """

    # run Manubot
    try:
        commands = ["manubot", "cite", _id, "--log-level=WARNING"]
        output = subprocess.Popen(commands, stdout=subprocess.PIPE).communicate()
    except Exception as e:
        log(e, 3)
        raise Exception("Manubot could not generate citation")

    # parse results as json
    try:
        manubot = json.loads(output[0])[0]
    except Exception:
        raise Exception("Couldn't parse Manubot response")

    # new citation with only needed info
    citation = {}

    # original id
    citation["id"] = _id

    # title
    citation["title"] = get_safe(manubot, "title", "").strip()

    # authors
    citation["authors"] = []
    for author in get_safe(manubot, "author", {}):
        given = get_safe(author, "given", "").strip()
        family = get_safe(author, "family", "").strip()
        if given or family:
            citation["authors"].append(" ".join([given, family]))

    # publisher
    container = get_safe(manubot, "container-title", "").strip()
    collection = get_safe(manubot, "collection-title", "").strip()
    publisher = get_safe(manubot, "publisher", "").strip()
    citation["publisher"] = container or publisher or collection or ""

    # extract date part
    def date_part(citation, index):
        try:
            return citation["issued"]["date-parts"][0][index]
        except (KeyError, IndexError, TypeError):
            return ""

    # date
    year = date_part(manubot, 0)
    if year:
        # fallbacks for month and day
        month = date_part(manubot, 1) or "1"
        day = date_part(manubot, 2) or "1"
        citation["date"] = format_date(f"{year}-{month}-{day}")
    else:
        # if no year, consider date missing data
        citation["date"] = ""

    # link
    citation["link"] = get_safe(manubot, "URL", "").strip()

    # return citation data
    return citation


# ── normalisation helpers ─────────────────────────────────────

# acronyms / tokens kept upper- or mixed-case when an ALL-CAPS title is sentence-cased
ACRONYMS = [
    "CRISPR", "DNA", "RNA", "mRNA", "scRNA-seq", "snRNA-seq", "ATAC", "ATAC-seq", "CITE-seq",
    "RNA-seq", "scATAC-seq", "HIV", "COVID-19", "SARS-CoV-2", "ALS", "AI", "FISH", "MERFISH",
    "ChIP-seq", "iPSC", "iPSCs", "GWAS", "eQTL", "QTL", "PCR", "UMAP", "t-SNE", "RNP", "APOE",
    "CNS", "PBMC", "PBMCs", "NGS", "SNP", "SNPs", "CNV", "CNVs", "3D", "2D", "US", "UK",
]
_ACRONYM_LOOKUP = {a.upper(): a for a in ACRONYMS}

_DASHES = dict.fromkeys(map(ord, "\u2010\u2011\u2012\u2212"), "-")


# DOI prefixes of preprint servers whose Crossref "publisher" is not the server name
PREPRINT_SERVERS = {
    "10.21203/": "Research Square",
    "10.2139/ssrn.": "SSRN",
    "10.20944/": "Preprints.org",
    "10.31219/": "OSF Preprints",
    "10.22541/": "Authorea",
}


def clean_text(text):
    """
    unescape HTML entities, strip tags, unify dashes and collapse whitespace
    """

    text = str(text or "")
    # entities may be double-escaped (e.g. &amp;amp;)
    for _ in range(2):
        text = html.unescape(text)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.translate(_DASHES)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _sentence_case_word(word, first):
    core = re.sub(r"^\W+|\W+$", "", word)
    known = _ACRONYM_LOOKUP.get(core.upper())
    if known:
        return word.replace(core, known)
    # hyphenated compounds: lower-case each part but keep acronym parts
    parts = word.split("-")
    out = []
    for i, part in enumerate(parts):
        k = _ACRONYM_LOOKUP.get(re.sub(r"\W", "", part).upper())
        out.append(k if k else part.lower())
    lowered = "-".join(out)
    return lowered[:1].upper() + lowered[1:] if first else lowered


def fix_caps_title(title):
    """
    sentence-case a title that is entirely upper case, keeping known acronyms
    """

    letters = [c for c in title if c.isalpha()]
    if len(letters) < 8 or not all(c.isupper() for c in letters):
        return title
    words = title.split(" ")
    return " ".join(_sentence_case_word(w, i == 0) for i, w in enumerate(words))


def fix_caps_name(name):
    """
    title-case an author name that is written in all caps or all lower case
    """

    letters = [c for c in name if c.isalpha()]
    if letters and (all(c.isupper() for c in letters) or all(c.islower() for c in letters)):
        return " ".join(
            "-".join(p[:1].upper() + p[1:].lower() for p in w.split("-")) for w in name.split(" ")
        )
    return name


def canonical_link(_id, fallback=""):
    """
    canonical URL for doi:/arxiv: ids
    """

    if _id.startswith("doi:"):
        return "https://doi.org/" + _id[4:]
    if _id.startswith("arxiv:"):
        return "https://arxiv.org/abs/" + _id[6:]
    return fallback


def normalize_id(_id):
    """
    lower-case doi:/arxiv: ids so the same work is never listed twice
    """

    _id = str(_id or "").strip()
    if _id.lower().startswith(("doi:", "arxiv:", "pmid:")):
        prefix, rest = _id.split(":", 1)
        return prefix.lower() + ":" + rest.strip().lower()
    return _id


def normalize_citation(citation):
    """
    clean and standardise one generated citation
    """

    c = dict(citation)
    c["id"] = normalize_id(c.get("id", ""))
    c["title"] = fix_caps_title(clean_text(c.get("title", "")))
    c["publisher"] = clean_text(c.get("publisher", ""))
    # preprint servers deposit under their parent company's name; show the server instead
    for prefix, server in PREPRINT_SERVERS.items():
        if c["id"].startswith("doi:" + prefix):
            c["publisher"] = server

    authors = []
    for name in c.get("authors") or []:
        name = fix_caps_name(clean_text(name))
        if name and (not authors or authors[-1] != name):
            authors.append(name)
    c["authors"] = authors

    c["link"] = canonical_link(c["id"], clean_text(c.get("link", "")))

    # internal bookkeeping fields are not part of the output
    c.pop("plugin", None)
    c.pop("file", None)
    return c


def crossref_get(path, params=None):
    """
    GET from the Crossref REST API (polite, cached for a day)
    """

    import time
    import requests

    @cache.memoize(name="crossref", expire=1 * (60 * 60 * 24))
    def query(path, params_key):
        # public pool allows 1 request/second; retry once if still throttled
        for attempt in range(3):
            time.sleep(1.1)
            response = requests.get(
                "https://api.crossref.org/" + path,
                params=dict(params_key),
                headers={"User-Agent": "sifrimlab-website-citations"},
                timeout=30,
            )
            if response.status_code != 429:
                break
            time.sleep(5 * (attempt + 1))
        response.raise_for_status()
        return response.json().get("message", {})

    return query(path, tuple(sorted((params or {}).items())))


def title_key(text):
    """
    lower-case alphanumeric form of a title, for comparing titles
    """

    return re.sub(r"[^a-z0-9]+", " ", clean_text(text).lower()).strip()


def title_similarity(a, b):
    return SequenceMatcher(None, title_key(a), title_key(b)).ratio()


def doi_from_title(title, year="", author=""):
    """
    resolve a work title to a DOI with Crossref (None if no confident match)
    """

    items = get_safe(
        crossref_get(
            "works",
            {
                "query.bibliographic": title,
                **({"query.author": author} if author else {}),
                "rows": "5",
                "select": "DOI,title,issued",
            },
        ),
        "items",
        [],
    )
    best, best_score = None, 0
    for item in items:
        found = (get_safe(item, "title", [""]) or [""])[0]
        score = title_similarity(title, found)
        # allow +-1 year (preprint vs publication)
        item_year = get_safe(item, "issued.date-parts.0.0", 0)
        if year and item_year and abs(int(year) - int(item_year)) > 1:
            continue
        if score > best_score:
            best, best_score = item, score
    if best and best_score >= 0.9:
        return best["DOI"].lower()
    return None


def crossref_authors(doi):
    """
    author names straight from Crossref, including consortium names that Manubot drops
    """

    names = []
    for a in get_safe(crossref_get("works/" + doi), "author", []):
        given, family = a.get("given", "").strip(), a.get("family", "").strip()
        name = " ".join(x for x in (given, family) if x) or a.get("name", "").strip()
        if name:
            names.append(name)
    return names


CORRECTION_RE = re.compile(
    r"^\s*(author |publisher |erratum|correction|retraction|expression of concern)", re.I
)


# ── lab membership filter ─────────────────────────────────────


def name_tokens(name):
    """
    accent-stripped, lower-case name tokens (mirrors normName in scripts/compile-content.ts)
    """

    import unicodedata

    name = unicodedata.normalize("NFD", str(name))
    name = "".join(c for c in name if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z\s-]", " ", name).split()


def same_person(a, b):
    """
    same first given name and same final family-name token (mirrors matchMember)
    """

    a, b = name_tokens(a), name_tokens(b)
    return len(a) >= 2 and len(b) >= 2 and a[0] == b[0] and a[-1] == b[-1]


ORCID_RE = re.compile(r"\d{4}-\d{4}-\d{4}-\d{3}[\dXx]")


def orcid_id(text):
    """
    bare ORCID iD (upper-case X) from an id or orcid.org URL, or ""
    """

    match = ORCID_RE.search(str(text or ""))
    return match.group(0).upper() if match else ""


def load_team(team_dir="content/team"):
    """
    team members from the markdown files (previous members included) as
    {"name", "orcid" ("" if unknown), "leader"}
    """

    team = []
    for file in sorted(Path(team_dir).glob("**/*.md")):
        parts = file.read_text(encoding="utf8").split("---", 2)
        if len(parts) < 3:
            continue
        try:
            meta = yaml.safe_load(parts[1]) or {}
        except Exception:
            continue
        name = str(meta.get("name", "")).strip()
        if not name:
            continue
        team.append(
            {
                "name": name,
                "orcid": orcid_id(get_safe(meta, "links.orcid", "")),
                "leader": meta.get("role") == "pi",
            }
        )
    return team


def orcid_works(orcid):
    """
    raw ORCID work groups for an ORCID iD (cached for a day)
    """

    from urllib.request import Request, urlopen

    @log_cache
    @cache.memoize(name="orcid-works", expire=1 * (60 * 60 * 24))
    def query(orcid):
        request = Request(
            f"https://pub.orcid.org/v3.0/{orcid}/works",
            headers={"Accept": "application/json"},
        )
        return get_safe(json.loads(urlopen(request, timeout=60).read()), "group", [])

    return query(orcid)


def orcid_work_ids(orcid):
    """
    set of normalised doi:/arxiv: ids listed on an ORCID record
    """

    ids = set()
    for work in orcid_works(orcid):
        for i in get_safe(work, "external-ids.external-id", []):
            kind = get_safe(i, "external-id-type", "")
            value = get_safe(i, "external-id-value", "").strip()
            if kind == "doi":
                value = re.sub(r"^https?://(dx\.)?doi\.org/", "", value, flags=re.I)
            if kind in ("doi", "arxiv") and value:
                ids.add(normalize_id(f"{kind}:{value}"))
    return ids


def crossref_author_details(doi):
    """
    [(name, orcid)] for a DOI from Crossref, ORCID "" when not deposited
    """

    details = []
    for a in get_safe(crossref_get("works/" + doi), "author", []):
        given, family = a.get("given", "").strip(), a.get("family", "").strip()
        name = " ".join(x for x in (given, family) if x) or a.get("name", "").strip()
        if name:
            details.append((name, orcid_id(a.get("ORCID", ""))))
    return details


def author_is_member(name, author_orcid, member):
    """
    an author is a member if the ORCIDs agree; when both sides have an ORCID the names
    are ignored (so name look-alikes are told apart); otherwise fall back to the name
    """

    if author_orcid and member["orcid"]:
        return author_orcid == member["orcid"]
    return same_person(name, member["name"])


def lab_members_on(citation_id, authors, team, listed):
    """
    indices of team members who are on a paper: its id is on the member's ORCID record,
    or one of the (name, orcid) authors is the member
    """

    hits = set()
    for i, member in enumerate(team):
        if member["orcid"] and citation_id in listed.get(member["orcid"], set()):
            hits.add(i)
        elif any(author_is_member(n, o, member) for n, o in authors):
            hits.add(i)
    return hits


def is_lab_publication(citation_id, authors, team, listed):
    """
    True if a group leader and at least one other lab member are on the paper
    """

    hits = lab_members_on(citation_id, authors, team, listed)
    leaders = {i for i in hits if team[i]["leader"]}
    return bool(leaders) and bool(hits - leaders)


# venue names of preprint servers
PREPRINT_RE = re.compile(r"rxiv|research square|ssrn|preprints|authorea|osf", re.I)
