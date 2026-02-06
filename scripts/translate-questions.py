#!/usr/bin/env python3
"""Translate all unique Polish driving exam questions to English.

Outputs src/data/translations_en.json with structure:
{ "123": { "q": "English question", "a": "Answer A", "b": "Answer B", "c": "Answer C" }, ... }

Uses deep_translator (Google Translate, no API key needed).
Supports resuming from a partial translation file.
"""

import json
import os
import sys
import time

from deep_translator import GoogleTranslator

SRC_DATA = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
OUTPUT = os.path.join(SRC_DATA, 'translations_en.json')

BATCH_SIZE = 40  # Google Translate free tier batch limit
DELAY = 0.5      # Seconds between batches to avoid rate limiting


def load_unique_questions():
    """Load all unique questions from category JSON files."""
    questions = {}
    for fname in sorted(os.listdir(SRC_DATA)):
        if fname == 'meta.json' or not fname.endswith('.json'):
            continue
        if fname == 'translations_en.json':
            continue
        with open(os.path.join(SRC_DATA, fname), encoding='utf-8') as f:
            data = json.load(f)
        for q in data['questions']:
            qid = str(q['id'])
            if qid not in questions:
                questions[qid] = q
    return questions


def load_existing_translations():
    """Load already-translated questions for resume support."""
    if os.path.exists(OUTPUT):
        with open(OUTPUT, encoding='utf-8') as f:
            return json.load(f)
    return {}


def translate_batch(texts, translator):
    """Translate a batch of texts from Polish to English."""
    if not texts:
        return []
    try:
        results = translator.translate_batch(texts)
        return results
    except Exception as e:
        print(f"  Batch translation failed: {e}, trying one by one...")
        results = []
        for text in texts:
            try:
                r = translator.translate(text)
                results.append(r)
            except Exception as e2:
                print(f"  Failed to translate: {text[:50]}... ({e2})")
                results.append(text)  # Keep original on failure
            time.sleep(0.2)
        return results


def main():
    print("Loading questions...")
    questions = load_unique_questions()
    existing = load_existing_translations()
    print(f"Total unique questions: {len(questions)}")
    print(f"Already translated: {len(existing)}")

    # Find questions that need translation
    to_translate = {}
    for qid, q in questions.items():
        if qid in existing:
            continue
        to_translate[qid] = q

    remaining = len(to_translate)
    if remaining == 0:
        print("All questions already translated!")
        return

    print(f"Questions to translate: {remaining}")

    translator = GoogleTranslator(source='pl', target='en')

    # Build list of (qid, field, text) tuples
    work = []
    for qid, q in to_translate.items():
        work.append((qid, 'q', q['q']))
        if q['type'] == 'specialist':
            if q.get('a'):
                work.append((qid, 'a', q['a']))
            if q.get('b'):
                work.append((qid, 'b', q['b']))
            if q.get('c'):
                work.append((qid, 'c', q['c']))

    print(f"Total text strings to translate: {len(work)}")

    # Process in batches
    translations = dict(existing)
    done = 0
    save_interval = 100  # Save every 100 items

    for i in range(0, len(work), BATCH_SIZE):
        batch = work[i:i + BATCH_SIZE]
        texts = [item[2] for item in batch]

        results = translate_batch(texts, translator)

        for (qid, field, _orig), translated in zip(batch, results):
            if qid not in translations:
                translations[qid] = {}
            translations[qid][field] = translated

        done += len(batch)
        pct = done / len(work) * 100
        print(f"  [{done}/{len(work)}] ({pct:.1f}%) translated")

        # Save periodically
        if done % (BATCH_SIZE * save_interval // BATCH_SIZE) < BATCH_SIZE:
            with open(OUTPUT, 'w', encoding='utf-8') as f:
                json.dump(translations, f, ensure_ascii=False, indent=None)

        time.sleep(DELAY)

    # Final save
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(translations, f, ensure_ascii=False, indent=None)

    print(f"\nDone! Translated {len(translations)} questions.")
    print(f"Output: {OUTPUT}")


if __name__ == '__main__':
    main()
