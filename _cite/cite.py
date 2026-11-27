"""
cite process to convert sources and metasources into full citations
"""

import os
import re
import traceback
from importlib import import_module
from pathlib import Path
from dotenv import load_dotenv
from util import *


# load environment variables
load_dotenv()


# error flag
error = False

# output citations file
output_file = "_data/citations.yaml"


log()

log("Compiling sources")

# compiled list of sources
sources = []

# in-order list of plugins to run
plugins = ["google-scholar", "pubmed", "orcid", "sources"]

# loop through plugins
for plugin in plugins:
    # convert into path object
    plugin = Path(f"plugins/{plugin}.py")

    log(f"Running {plugin.stem} plugin")

    # get all data files to process with current plugin
    files = Path.cwd().glob(f"_data/{plugin.stem}*.*")
    files = list(filter(lambda p: p.suffix in [".yaml", ".yml", ".json"], files))

    log(f"Found {len(files)} {plugin.stem}* data file(s)", 1)

    # loop through data files
    for file in files:
        log(f"Processing data file {file.name}", 1)

        # load data from file
        try:
            data = load_data(file)
            # check if file in correct format
            if not list_of_dicts(data):
                raise Exception("File not a list of dicts")
        except Exception as e:
            log(e, 2, "ERROR")
            error = True
            continue

        # loop through data entries
        for index, entry in enumerate(data):
            log(f"Processing entry {index + 1} of {len(data)}, {label(entry)}", 2)

            # run plugin on data entry to expand into multiple sources
            try:
                expanded = import_module(f"plugins.{plugin.stem}").main(entry)
                # check that plugin returned correct format
                if not list_of_dicts(expanded):
                    raise Exception("Plugin didn't return list of dicts")
            # catch any plugin error
            except Exception as e:
                # log detailed pre-formatted/colored trace
                print(traceback.format_exc())
                # log high-level error
                log(e, 3, "ERROR")
                error = True
                continue

            # loop through sources
            for source in expanded:
                if plugin.stem != "sources":
                    log(label(source), 3)

                # case-insensitive ids so the same work is never listed twice
                if source.get("id"):
                    source["id"] = normalize_id(source["id"])

                # include meta info about source
                source["plugin"] = plugin.name
                source["file"] = file.name

                # add source to compiled list
                sources.append(source)

            if plugin.stem != "sources":
                log(f"{len(expanded)} source(s)", 3)


# also discover works through the ORCID iDs of lab members (the group leader is in orcid.yaml);
# only papers co-authored by the leader and a member survive the lab filter below
member_sources = []
for member in load_team():
    if not member["orcid"] or member["leader"]:
        continue
    log(f"Reading ORCID of {member['name']}", 1)
    try:
        found = import_module("plugins.orcid").main({"orcid": member["orcid"], "resolve_titles": False})
    except Exception as e:
        log(f"ORCID of {member['name']} unavailable ({e})", 2, "WARNING")
        continue
    for source in found:
        source["id"] = normalize_id(source["id"])
        source["plugin"] = "orcid.py"
        source["file"] = "content/team"
        member_sources.append(source)
    log(f"{len(found)} source(s)", 2)

# first in the list, so pinned/leader sources override them when merged by id
sources = member_sources + sources

# ids pinned by hand in _data/sources.yaml (never auto-dropped, override scraped fields)
pinned = {s["id"] for s in sources if s.get("plugin") == "sources.py" and s.get("id")}

# ids to drop
exclude = set()
exclude_file = Path.cwd() / "_data/citations-exclude.yaml"
if exclude_file.is_file():
    exclude = {normalize_id(i) for i in (load_data(exclude_file) or [])}
    sources = [s for s in sources if s.get("id") not in exclude]
    log(f"Excluding {len(exclude)} id(s) from citations-exclude.yaml")

log("Merging sources by id")

# merge sources with matching (non-blank) ids
for a in range(0, len(sources)):
    a_id = get_safe(sources, f"{a}.id", "")
    if not a_id:
        continue
    for b in range(a + 1, len(sources)):
        b_id = get_safe(sources, f"{b}.id", "")
        if b_id == a_id:
            log(f"Found duplicate {b_id}", 2)
            sources[a].update(sources[b])
            sources[b] = {}
sources = [entry for entry in sources if entry]


log(f"{len(sources)} total source(s) to cite")


log()

log("Generating citations")

# list of new citations
citations = []


# loop through compiled sources
for index, source in enumerate(sources):
    log(f"Processing source {index + 1} of {len(sources)}, {label(source)}")

    # new citation data for source
    citation = {}

    # source id
    _id = get_safe(source, "id", "").strip()

    # Manubot doesn't work without an id
    if _id:
        log("Using Manubot to generate citation", 1)

        try:
            # run Manubot and set citation
            citation = cite_with_manubot(_id)

        # if Manubot cannot cite source
        except Exception as e:
            # if regular source (id entered by user), throw error
            if get_safe(source, "plugin", "") == "sources.py":
                log(e, 3, "ERROR")
                error = True
            # otherwise, if from metasource (id retrieved from some third-party API), just warn
            else:
                log(e, 3, "WARNING")
                # discard source from citations
                # continue

    # preserve fields from input source, overriding existing fields
    fallback = {k[len("_fallback_"):]: v for k, v in source.items() if k.startswith("_fallback_")}
    citation.update({k: v for k, v in source.items() if not k.startswith("_fallback_")})

    # if Manubot could not cite the id, fall back to details from the plugin (e.g. ORCID)
    for key, value in fallback.items():
        if not get_safe(citation, key, ""):
            citation[key] = value

    # ensure date in proper format for correct date sorting
    if get_safe(citation, "date", ""):
        citation["date"] = format_date(get_safe(citation, "date", ""))

    # Manubot drops consortium authors; take names straight from Crossref
    if not citation.get("authors") and citation.get("id", "").startswith("doi:"):
        try:
            citation["authors"] = crossref_authors(citation["id"][4:])
        except Exception as e:
            log(f"Crossref author lookup failed ({e})", 3, "WARNING")

    # clean up and standardise formatting
    citation = normalize_citation(citation)
    for key in ("orcid", "gsid", "term", "author", "resolve_titles"):
        citation.pop(key, None)

    # add new citation to list
    citations.append(citation)


log()

log("Keeping only lab publications (group leader + at least one other lab member)")

team = load_team()
with_orcid = [m for m in team if m["orcid"]]
log(
    f"{sum(m['leader'] for m in team)} group leader(s), {sum(not m['leader'] for m in team)} other "
    f"member(s) in content/team ({len(with_orcid)} with an ORCID iD, the rest matched by name)",
    1,
)

# ids each member lists on their own ORCID record
listed = {}
for m in with_orcid:
    try:
        listed[m["orcid"]] = orcid_work_ids(m["orcid"])
    except Exception as e:
        log(f"Could not read ORCID record of {m['name']} ({e}), matching by name", 1, "WARNING")

for c in list(citations):
    # Crossref authors carry ORCID iDs when deposited; otherwise use the plain names
    authors = [(a, "") for a in c["authors"]]
    if c["id"].startswith("doi:"):
        try:
            authors = crossref_author_details(c["id"][4:]) or authors
        except Exception as e:
            log(f"Crossref author lookup failed for {c['id']} ({e})", 1, "WARNING")
    if is_lab_publication(c["id"], authors, team, listed):
        continue
    if c["id"] in pinned:
        log(f"Keeping pinned {c['id']} although it has no leader + lab-member authors", 1, "WARNING")
        continue
    log(f"Dropping {c['id']}: {c['title'][:60]}", 1)
    citations.remove(c)


log()

log("Removing corrections")

for c in list(citations):
    if c["id"] not in pinned and CORRECTION_RE.search(c.get("title", "")):
        log(f"Dropping {c['id']}: {c['title'][:60]}", 1)
        citations.remove(c)


log()

log("Removing preprints superseded by a published version")

ids = {c["id"] for c in citations}
for c in list(citations):
    if not c["id"].startswith("doi:") or c["id"] in pinned:
        continue
    try:
        relation = get_safe(crossref_get("works/" + c["id"][4:]), "relation", {})
    except Exception as e:
        log(f"Crossref relation lookup failed for {c['id']} ({e})", 1, "WARNING")
        continue
    for rel in get_safe(relation, "is-preprint-of", []):
        published = normalize_id("doi:" + get_safe(rel, "id", ""))
        if published in ids:
            log(f"Dropping preprint {c['id']} (published as {published})", 1)
            citations.remove(c)
            break

# Crossref does not always link preprints, so also compare titles with published works
def is_preprint(c):
    return bool(PREPRINT_RE.search(c.get("publisher", ""))) or c["id"].startswith("arxiv:")


# several versions of one preprint (e.g. .../rs-123/v1, .../v2): keep the newest
VERSION_RE = re.compile(r"^(doi:.+)/v(\d+)$")
for c in list(citations):
    m = VERSION_RE.match(c["id"])
    if not m or c["id"] in pinned:
        continue
    if any(
        (n := VERSION_RE.match(d["id"])) and n.group(1) == m.group(1) and int(n.group(2)) > int(m.group(2))
        for d in citations
    ):
        log(f"Dropping older version {c['id']}", 1)
        citations.remove(c)


# the same work posted on several servers / as several versions: keep one entry
for c in list(citations):
    if c["id"] in pinned:
        continue
    for d in citations:
        if d is c or title_similarity(c["title"], d["title"]) < 0.9:
            continue
        # prefer pinned, then published, then whichever is listed first
        if d["id"] in pinned or not is_preprint(d) or (
            is_preprint(c) and citations.index(d) < citations.index(c)
        ):
            log(f"Dropping duplicate {c['id']} (same work as {d['id']})", 1)
            citations.remove(c)
            break


published = [c for c in citations if not is_preprint(c)]
for c in list(citations):
    if not is_preprint(c):
        continue
    match = next((p for p in published if title_similarity(c["title"], p["title"]) >= 0.8), None)
    if not match:
        continue
    if c["id"] in pinned:
        log(
            f"Pinned preprint {c['id']} seems to be published as {match['id']}; consider updating sources.yaml and content/",
            1,
            "WARNING",
        )
    else:
        log(f"Dropping preprint {c['id']} (published as {match['id']})", 1)
        citations.remove(c)


log()

log("Validating citations")

for c in list(citations):
    problems = [k for k in ("id", "title", "date") if not c.get(k)]
    if not c.get("authors"):
        problems.append("authors")
    if not problems:
        continue
    if c.get("id") in pinned:
        # a hand-pinned id must always be complete (the site references it)
        log(f"{c['id']} is missing {', '.join(problems)}", 1, "ERROR")
        error = True
    else:
        # scraped entries that could not be fully resolved are skipped, not fatal
        log(f"Skipping {c.get('id') or c.get('title') or '?'}: missing {', '.join(problems)}", 1, "WARNING")
        citations.remove(c)

# newest first, like the site
citations.sort(key=lambda c: c.get("date", ""), reverse=True)

previous = load_data(output_file) if Path(output_file).is_file() else []
allow_shrink = os.environ.get("CITE_ALLOW_SHRINK") == "1"
if (
    not allow_shrink
    and isinstance(previous, list)
    and len(previous) >= 10
    and len(citations) < 0.8 * len(previous)
):
    log(f"Only {len(citations)} citations vs {len(previous)} before, refusing to overwrite (set CITE_ALLOW_SHRINK=1 if intended)", 1, "ERROR")
    error = True


log()

log("Saving updated citations")


# save new citations (never overwrite a good file with a bad one)
if not error:
    try:
        save_data(output_file, citations)
    except Exception as e:
        log(e, level="ERROR")
        error = True


# exit at end, so user can see all errors in one run
if error:
    log("Error(s) occurred above", level="ERROR")
    exit(1)
else:
    log("All done!", level="SUCCESS")

log("\n")
