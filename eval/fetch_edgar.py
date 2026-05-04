"""Fetch deal packages from SEC EDGAR for evaluation.

Usage:
    python eval/fetch_edgar.py                    # Fetch 10 deals (default)
    python eval/fetch_edgar.py --count 50         # Fetch 50 deals
    python eval/fetch_edgar.py --query "credit agreement"  # Custom search
"""

from __future__ import annotations

import argparse
import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path

import httpx

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
EDGAR_ARCHIVES_URL = "https://www.sec.gov/Archives/edgar/data"
OUTPUT_DIR = Path(__file__).parent / "test_deals"

# SEC requires a User-Agent with contact info
USER_AGENT = "Counsel-in-a-Box research@example.com"

SEARCH_QUERIES = [
    '"merger agreement"',
    '"stock purchase agreement"',
    '"asset purchase agreement"',
    '"credit agreement"',
    '"severance agreement"',
    '"employment agreement"',
]

# Rate limit: SEC asks for max 10 requests/second
REQUEST_DELAY = 0.15


# ---------------------------------------------------------------------------
# HTML stripping
# ---------------------------------------------------------------------------
class HTMLTextExtractor(HTMLParser):
    """Strip HTML tags and extract plain text."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ("script", "style"):
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style"):
            self._skip = False
        if tag in ("p", "br", "div", "tr", "li", "h1", "h2", "h3", "h4"):
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._skip:
            self._parts.append(data)

    def get_text(self) -> str:
        raw = "".join(self._parts)
        # Collapse excessive whitespace but keep paragraph breaks
        raw = re.sub(r"[ \t]+", " ", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip()


def strip_html(html: str) -> str:
    """Convert HTML to clean plain text."""
    extractor = HTMLTextExtractor()
    extractor.feed(html)
    return extractor.get_text()


# ---------------------------------------------------------------------------
# EDGAR API
# ---------------------------------------------------------------------------
def search_filings(
    query: str,
    form_type: str = "8-K",
    count: int = 10,
) -> list[dict]:
    """Search EDGAR full-text search for filings matching the query."""
    client = httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )

    params = {
        "q": query,
        "forms": form_type,
        "dateRange": "custom",
        "startdt": "2023-01-01",
        "enddt": "2025-12-31",
    }

    try:
        resp = client.get(EDGAR_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        hits = data.get("hits", {}).get("hits", [])
        return hits[:count]
    except httpx.HTTPError as e:
        print(f"  Search failed for '{query}': {e}")
        return []
    finally:
        client.close()


def fetch_filing_documents(
    cik: str,
    accession: str,
) -> list[dict[str, str]]:
    """Fetch all documents from a filing's index page."""
    acc_clean = accession.replace("-", "")
    index_url = f"{EDGAR_ARCHIVES_URL}/{cik}/{acc_clean}/{accession}-index.htm"

    client = httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )

    try:
        resp = client.get(index_url)
        resp.raise_for_status()
        index_html = resp.text

        # Find document links in the index
        doc_pattern = re.compile(
            r'<a href="([^"]+\.(htm|txt))"[^>]*>',
            re.IGNORECASE,
        )
        matches = doc_pattern.findall(index_html)

        documents: list[dict[str, str]] = []
        for match_url, _ in matches[:12]:  # Max 12 docs per deal
            if match_url.startswith("/"):
                doc_url = f"https://www.sec.gov{match_url}"
            else:
                doc_url = f"{EDGAR_ARCHIVES_URL}/{cik}/{acc_clean}/{match_url}"

            time.sleep(REQUEST_DELAY)

            try:
                doc_resp = client.get(doc_url)
                doc_resp.raise_for_status()
                raw_text = strip_html(doc_resp.text)

                # Skip very short documents (cover pages, etc.)
                if len(raw_text) < 500:
                    continue

                filename = Path(match_url).stem
                filename = re.sub(r"[^\w\-]", "_", filename)

                documents.append({
                    "filename": f"{filename}.txt",
                    "content": raw_text,
                    "source_url": doc_url,
                })
            except httpx.HTTPError:
                continue

        return documents

    except httpx.HTTPError as e:
        print(f"  Failed to fetch index for {accession}: {e}")
        return []
    finally:
        client.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def fetch_deals(total_count: int = 10, query: str | None = None) -> None:
    """Fetch deal packages from EDGAR and save to test_deals/."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    queries = [query] if query else SEARCH_QUERIES
    deals_fetched = 0
    per_query = max(1, total_count // len(queries))

    for search_query in queries:
        if deals_fetched >= total_count:
            break

        print(f"\nSearching: {search_query}")
        hits = search_filings(search_query, count=per_query)
        print(f"  Found {len(hits)} filings")

        for hit in hits:
            if deals_fetched >= total_count:
                break

            source = hit.get("_source", {})
            cik = str(source.get("entity_id", ""))
            entity_name = source.get("entity_name", "unknown")

            # Extract accession from hit ID
            file_id = hit.get("_id", "")
            accession = ""
            if ":" in file_id:
                parts = file_id.split(":")
                if len(parts) >= 2:
                    accession = parts[1]

            if not cik or not accession:
                continue

            deal_id = f"deal_{deals_fetched + 1:03d}"
            print(f"\n  [{deal_id}] {entity_name}")
            print(f"    CIK: {cik}, Accession: {accession}")

            time.sleep(REQUEST_DELAY)
            documents = fetch_filing_documents(cik, accession)

            if not documents:
                print("    Skipped — no usable documents found")
                continue

            # Save documents
            deal_dir = OUTPUT_DIR / deal_id
            deal_dir.mkdir(parents=True, exist_ok=True)

            for doc in documents:
                filepath = deal_dir / doc["filename"]
                filepath.write_text(doc["content"], encoding="utf-8")

            # Save metadata
            metadata = {
                "deal_id": deal_id,
                "entity_name": entity_name,
                "cik": cik,
                "accession": accession,
                "document_count": len(documents),
                "filenames": [d["filename"] for d in documents],
            }

            meta_path = deal_dir / "_metadata.json"
            meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

            deals_fetched += 1
            print(f"    Saved {len(documents)} documents to {deal_dir}")

    print(f"\n{'=' * 60}")
    print(f"Fetched {deals_fetched} deal packages to {OUTPUT_DIR}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch deal packages from SEC EDGAR")
    parser.add_argument("--count", type=int, default=10, help="Number of deals to fetch")
    parser.add_argument("--query", type=str, default=None, help="Custom search query")
    args = parser.parse_args()

    fetch_deals(total_count=args.count, query=args.query)
