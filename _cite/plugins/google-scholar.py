from util import *


def main(entry):
    """
    receives single list entry from google-scholar data file
    returns list of sources to cite

    Scholar has no official API and often blocks automated clients, so any failure to
    reach it is only a warning: ORCID and the pinned sources still produce citations.
    """

    _id = get_safe(entry, "gsid", "")
    if not _id:
        raise Exception('No "gsid" key')

    @log_cache
    @cache.memoize(name=__file__, expire=1 * (60 * 60 * 24))
    def query(_id):
        from scholarly import scholarly

        author = scholarly.search_author_id(_id)
        author = scholarly.fill(author, sections=["publications"])
        works = []
        for pub in get_safe(author, "publications", []):
            bib = get_safe(pub, "bib", {})
            works.append(
                {
                    "title": get_safe(bib, "title", ""),
                    "year": str(get_safe(bib, "pub_year", "") or ""),
                }
            )
        return works

    try:
        works = query(_id)
    except Exception as e:
        log(f"Google Scholar unavailable, skipping ({type(e).__name__}: {e})", 3, "WARNING")
        return []

    sources = []
    seen = set()
    for work in works:
        title = get_safe(work, "title", "")
        if not title:
            continue
        try:
            doi = doi_from_title(title, get_safe(work, "year", ""), get_safe(entry, "author", ""))
        except Exception as e:
            log(f'Crossref lookup failed for "{title}" ({e})', 3, "WARNING")
            continue
        if not doi:
            log(f'No DOI match for Scholar entry "{title}"', 3, "WARNING")
            continue
        if doi in seen:
            continue
        seen.add(doi)
        sources.append({"id": f"doi:{doi}"})

    return sources
