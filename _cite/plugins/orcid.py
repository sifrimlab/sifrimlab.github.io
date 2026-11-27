from util import *


def main(entry):
    """
    receives single list entry from orcid data file
    returns list of sources to cite
    """

    # get id from entry
    _id = orcid_id(get_safe(entry, "orcid", ""))
    if not _id:
        raise Exception('No valid "orcid" key')

    response = orcid_works(_id)

    # list of sources to return
    sources = []
    seen = set()

    # id types Manubot can cite
    citeable = {"doi", "arxiv", "pmid", "pmcid"}

    def ext_ids(work):
        ids = list(get_safe(work, "external-ids.external-id", []))
        for summary in get_safe(work, "work-summary", []):
            ids += get_safe(summary, "external-ids.external-id", [])
        return ids

    def first(summaries, get_func):
        return next((v for v in map(get_func, summaries) if v), None)

    def pub_date(summary):
        year = get_safe(summary, "publication-date.year.value", "")
        if not year:
            return ""
        month = get_safe(summary, "publication-date.month.value", "") or "1"
        day = get_safe(summary, "publication-date.day.value", "") or "1"
        return format_date(f"{year}-{int(month)}-{int(day)}")

    # go through response structure and pull out ids e.g. doi:1234/56789
    for work in response:
        ids = [
            i
            for i in ext_ids(work)
            if get_safe(i, "external-id-type", "") in citeable
            and get_safe(i, "external-id-value", "")
        ]
        if not ids:
            # no citeable id on the ORCID record: try to find the DOI from the title
            summaries = get_safe(work, "work-summary", [])
            title = first(summaries, lambda s: get_safe(s, "title.title.value", "")) or ""
            year = (first(summaries, pub_date) or "")[:4]
            try:
                doi = (
                    doi_from_title(title, year, get_safe(entry, "author", ""))
                    if title and get_safe(entry, "resolve_titles", True)
                    else None
                )
            except Exception as e:
                doi = None
                log(f"Crossref lookup failed ({e})", 3, "WARNING")
            if not doi:
                log(f'Skipping work without DOI/arXiv/PMID: "{title}"', 3, "WARNING")
                continue
            ids = [{"external-id-type": "doi", "external-id-value": doi}]

        # prefer doi id type, then arxiv, then first id
        _id = next(
            (i for t in ("doi", "arxiv") for i in ids if i["external-id-type"] == t),
            ids[0],
        )
        id_type = _id["external-id-type"]
        id_value = _id["external-id-value"].strip()
        # ORCID sometimes stores DOIs as URLs
        if id_type == "doi":
            id_value = id_value.replace("https://doi.org/", "").replace("http://dx.doi.org/", "")
        source_id = normalize_id(f"{id_type}:{id_value}")

        if source_id in seen:
            continue
        seen.add(source_id)

        # fallback details, used only if Manubot cannot cite the id (cite.py never overrides these
        # for orcid sources with Manubot output, see cite.py)
        summaries = get_safe(work, "work-summary", [])
        source = {"id": source_id}
        title = first(summaries, lambda s: get_safe(s, "title.title.value", ""))
        publisher = first(summaries, lambda s: get_safe(s, "journal-title.value", ""))
        date = first(summaries, pub_date)
        if title:
            source["_fallback_title"] = title
        if publisher:
            source["_fallback_publisher"] = publisher
        if date:
            source["_fallback_date"] = date

        # copy fields from entry to source
        source.update(entry)
        sources.append(source)

    return sources
