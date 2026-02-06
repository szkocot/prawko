#!/usr/bin/env python3
"""
Filter out questions from category JSON files that should have media but don't.

These are questions where media is null but the question text implies there's
a visual element (image or video) the user should be looking at.

Patterns detected (Polish driving exam questions):
- "W tej sytuacji" (In this situation)
- "W przedstawionej sytuacji" (In the presented situation)
- References to visible elements: signs, lines, posts, vehicles, etc.
- "tak oznakow/oznacz" (marked like this)
- "na zdjęciu", "na fotografii", "na ilustracji", "na rysunku", "na filmie"
- Demonstrative references: "tego znaku", "tym sygnale", "takim/takiej"
"""

import json
import os
import re
import sys

# Path configuration
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data")
CATEGORIES = ["A", "A1", "A2", "AM", "B", "B1", "C", "C1", "D", "D1", "PT", "T"]

# Patterns that indicate a question references visual media content.
# These are Polish phrases commonly used in driving exam questions that refer
# to an image, video, or visual scenario the test-taker should be looking at.
MEDIA_REFERENCE_PATTERNS = [
    # Direct situational references (the question describes "this situation"
    # which is shown in an accompanying image/video)
    r"[Ww] tej sytuacji",
    r"[Ww] przedstawionej sytuacji",
    r"[Ww] takiej sytuacji",
    r"[Ww] takim terenie",

    # References to media types
    r"na zdjęciu",          # in the photo
    r"na fotografii",       # in the photograph
    r"na ilustracji",       # in the illustration
    r"na rysunku",          # in the drawing
    r"na filmie",           # in the film/video
    r"na widocznym",        # on the visible [element]

    # "marked/signed like this" -- refers to a sign/marking shown in media
    r"tak oznakow",         # tak oznakowanej/oznakowanym/oznakowanego
    r"tak oznacz",          # tak oznaczonym/oznaczonej/oznaczonego

    # Demonstrative references implying a visual element
    r"takim odcinku",       # such a section [of road]
    r"takiej drod",         # such a road
    r"takim skrzyżowaniu",  # such an intersection
    r"na takiej autostradzie",  # on such a motorway
    r"na takiej drodze",    # on such a road
    r"tego znaku",          # this sign
    r"tym sygnale",         # this signal

    # "widoczny/widoczna/widoczne + noun" -- refers to a visible element
    # shown in the accompanying media. We use compound patterns to avoid
    # matching generic uses like "widoczność drogi" (road visibility) or
    # "niewidoczna" (invisible).
    r"widoczn\w+ znak",     # visible sign(s)
    r"widoczn\w+ słupk",    # visible post
    r"widoczn\w+ lini",     # visible line
    r"widoczn\w+ pojazd",   # visible vehicle
    r"widoczn\w+ przejazd", # visible [railway] crossing
    r"widoczn\w+ przejści", # visible [pedestrian] crossing
    r"widoczn\w+ przystan", # visible [bus/tram] stop
    r"widoczn\w+ po lewej", # visible on the left
    r"widoczn\w+ po prawej",# visible on the right
    r"widoczn\w+ zakręt",   # visible curve
]

# Compile into a single regex for efficiency
MEDIA_REFERENCE_REGEX = re.compile("|".join(MEDIA_REFERENCE_PATTERNS), re.IGNORECASE)


def question_needs_media(question_text: str) -> bool:
    """Check if a question's text implies it should have accompanying media."""
    return bool(MEDIA_REFERENCE_REGEX.search(question_text))


def process_category(category_id: str, dry_run: bool = False) -> dict:
    """
    Process a single category JSON file.

    Returns a dict with:
        - category: category ID
        - original_count: number of questions before filtering
        - removed_count: number of questions removed
        - remaining_count: number of questions after filtering
        - removed_basic: number of basic questions removed
        - removed_specialist: number of specialist questions removed
        - removed_questions: list of (id, q) tuples for removed questions
    """
    filepath = os.path.join(DATA_DIR, f"{category_id}.json")

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data["questions"]
    original_count = len(questions)

    kept = []
    removed = []

    for q in questions:
        if q["media"] is None and question_needs_media(q["q"]):
            removed.append(q)
        else:
            kept.append(q)

    removed_basic = sum(1 for q in removed if q["type"] == "basic")
    removed_specialist = sum(1 for q in removed if q["type"] == "specialist")

    if not dry_run and removed:
        data["questions"] = kept
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    return {
        "category": category_id,
        "original_count": original_count,
        "removed_count": len(removed),
        "remaining_count": len(kept),
        "removed_basic": removed_basic,
        "removed_specialist": removed_specialist,
        "removed_questions": [(q["id"], q["q"][:80]) for q in removed],
    }


def update_meta(results: list[dict], dry_run: bool = False) -> None:
    """Update meta.json with the new question counts after filtering."""
    meta_path = os.path.join(DATA_DIR, "meta.json")

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    # Build a lookup from results
    result_map = {r["category"]: r for r in results}

    for cat_meta in meta["categories"]:
        cat_id = cat_meta["id"]
        if cat_id in result_map:
            r = result_map[cat_id]
            old_total = cat_meta["questionCount"]
            old_basic = cat_meta["basicCount"]
            old_specialist = cat_meta["specialistCount"]

            new_basic = old_basic - r["removed_basic"]
            new_specialist = old_specialist - r["removed_specialist"]
            new_total = new_basic + new_specialist

            if r["removed_count"] > 0:
                print(f"  meta.json [{cat_id}]: "
                      f"questionCount {old_total} -> {new_total}, "
                      f"basicCount {old_basic} -> {new_basic}, "
                      f"specialistCount {old_specialist} -> {new_specialist}")

            cat_meta["questionCount"] = new_total
            cat_meta["basicCount"] = new_basic
            cat_meta["specialistCount"] = new_specialist

    if not dry_run:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
            f.write("\n")


def main():
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv or "-v" in sys.argv

    if dry_run:
        print("=== DRY RUN MODE (no files will be modified) ===\n")

    print("Filtering questions with missing media from category JSON files...\n")

    results = []
    total_removed = 0
    total_original = 0

    for cat_id in CATEGORIES:
        result = process_category(cat_id, dry_run=dry_run)
        results.append(result)
        total_removed += result["removed_count"]
        total_original += result["original_count"]

        status = f"  {cat_id:>3}: removed {result['removed_count']:>3} questions " \
                 f"(basic: {result['removed_basic']}, specialist: {result['removed_specialist']}) " \
                 f"| {result['original_count']} -> {result['remaining_count']}"
        print(status)

        if verbose and result["removed_questions"]:
            for qid, qtext in result["removed_questions"]:
                print(f"       - [{qid}] {qtext}...")

    print(f"\n{'='*60}")
    print(f"  TOTAL: removed {total_removed} questions out of {total_original}")
    print(f"  Remaining: {total_original - total_removed}")
    print(f"{'='*60}")

    # Update meta.json
    print("\nUpdating meta.json...")
    update_meta(results, dry_run=dry_run)

    if dry_run:
        print("\n(Dry run complete -- no files were modified)")
    else:
        print("\nDone. All files updated successfully.")


if __name__ == "__main__":
    main()
