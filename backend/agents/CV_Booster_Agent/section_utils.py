# section_utils.py — CV section parsing and missing-section heuristics (shared by main, enhance_cv, cv_extraction)
import re
from typing import Dict, List

# Normalized header line: strip bullets, numbering, markdown, trailing colons
def _normalize_header_line(line: str) -> str:
    s = line.strip()
    s = re.sub(r"^\*+|\*+$", "", s).strip()
    s = re.sub(r"^[\d]{1,2}[\.\)]\s*", "", s)
    s = re.sub(r"^[ivxlcdm]{1,8}[\.\)]\s*", "", s, flags=re.I)
    s = re.sub(r"^[-–—•●▪]\s*", "", s)
    s = s.rstrip(" :：").strip()
    return s


def _header_match(norm: str, pattern: re.Pattern) -> bool:
    if len(norm) > 90:
        return False
    return bool(pattern.match(norm))


# Per-section patterns tested against normalized single-line headers
SECTION_HEADER_PATTERNS: Dict[str, re.Pattern] = {
    "profile": re.compile(
        r"^(profile|profil|about(\s+me)?|objective|summary|résumé|resume|présentation|professional\s+summary|"
        r"career\s+objective|personal\s+statement|overview)$",
        re.I,
    ),
    "education": re.compile(
        r"^(education|formation|études|studies|academic(\s+background)?|educational(\s+background)?|"
        r"qualifications?|diplomas?|degrees?|university|academic\s+credentials)$",
        re.I,
    ),
    "experience": re.compile(
        r"^(experience|expérience|professional\s+experience|work\s+experience|work\s+history|employment(\s+history)?|"
        r"career\s+history|professional\s+background|relevant\s+experience|career(\s+summary)?|"
        r"positions?|internships?|stage|employment)$",
        re.I,
    ),
    "skills": re.compile(
        r"^(skills?|technical\s+skills?|compétences?|technologies|core\s+skills?|key\s+skills?|expertise|"
        r"technical\s+expertise|stack|tools)$",
        re.I,
    ),
    "projects": re.compile(
        r"^(projects?|academic\s+projects?|projets?|portfolio|personal\s+projects?|side\s+projects?|notable\s+projects?)$",
        re.I,
    ),
    "certifications": re.compile(
        r"^(certifications?|certificates?|badges?|awards?|achievements?|training|licenses?|courses?|"
        r"professional\s+certifications?)$",
        re.I,
    ),
    "languages": re.compile(r"^(languages?|langues?|spoken\s+languages?|language\s+skills?)$", re.I),
}


def parse_cv_sections(text: str) -> dict:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    sections: Dict[str, list] = {"header": []}
    current = "header"
    for line in lines:
        norm = _normalize_header_line(line)
        matched = next(
            (k for k, p in SECTION_HEADER_PATTERNS.items() if _header_match(norm, p)),
            None,
        )
        if matched:
            current = matched
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, [])
            sections[current].append(line)
    return sections


def infer_section_presence_heuristics(text: str) -> Dict[str, bool]:
    """Best-effort detection when strict header parsing fails (e.g. scrambled PDF columns)."""
    tl = text.lower()
    # Experience: employment date ranges, Present, or role + year patterns
    has_exp = bool(
        re.search(r"20\d{2}\s*[-–—]\s*(20\d{2}|present|now|current|aujourd|aujourd'hui)", tl, re.I)
        or (
            re.search(r"\b(present|currently|now)\b", tl)
            and re.search(r"20\d{2}", tl)
            and re.search(
                r"\b(developer|engineer|consultant|manager|lead|architect|analyst|designer|intern|stagiaire)\b",
                tl,
            )
        )
    )
    # Education: degrees, institutions
    has_edu = bool(
        re.search(
            r"\b(bachelor|master|ph\.?d|mba|b\.?sc|m\.?sc|bts|dut|licence|dipl[oô]me|engineering|école|university|"
            r"université|institute|school|faculty)\b",
            tl,
            re.I,
        )
        or re.search(r"20\d{2}.*\b(university|université|school|école|institute)\b", tl, re.I)
    )
    # Languages section or inline language levels
    has_lang = bool(
        re.search(
            r"(^|\n)\s*(languages?|langues)\s*[:：]?\s*$",
            tl,
            re.MULTILINE,
        )
        or re.search(
            r"\b(english|french|arabic|german|spanish|italian)\b[^.\n]{0,50}\b("
            r"native|fluent|bilingual|professional|intermediate|b1|b2|c1|c2|a1|a2)\b",
            tl,
            re.I,
        )
    )
    return {"experience": has_exp, "education": has_edu, "languages": has_lang}


def compute_missing_sections(cv_sections: dict, text: str) -> List[str]:
    """
    List sections the user should be prompted to add only if strict parse AND heuristics
    both suggest the content is absent (avoids false positives from bad PDF layout).
    """
    h = infer_section_presence_heuristics(text)
    out: List[str] = []
    for key in ("experience", "education", "languages"):
        if cv_sections.get(key):
            continue
        if h.get(key):
            continue
        out.append(key)
    return out
