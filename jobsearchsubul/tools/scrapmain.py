"""
Job scraper entrypoint — minimal default runs Qureos only (dependencies present in repo).
Set SCRAPER_MODE=full only after adding careerjet, expat, gulftalent, naukrigulf, himalayas modules.
"""
from __future__ import annotations

import os

from jobsearchsubul.tools.qureos import scrape_qureos_jobs


def main() -> None:
    mode = (os.getenv("SCRAPER_MODE") or "minimal").strip().lower()
    print(f"[scrapmain] SCRAPER_MODE={mode}")
    if mode == "full":
        raise RuntimeError(
            "SCRAPER_MODE=full requires optional scraper modules not shipped in this repo. "
            "Use minimal or add careerjet/expat/gulftalent/naukrigulf/himalayas under jobsearchsubul/tools/.",
        )
    print("[scrapmain] Running Qureos scrape (minimal)")
    jobs = scrape_qureos_jobs()
    print(f"[scrapmain] done, jobs={len(jobs)}")


if __name__ == "__main__":
    main()
