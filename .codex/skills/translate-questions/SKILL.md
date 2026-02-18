---
name: translate-questions
description: Translate Polish driving exam questions to a target language. Use when user asks to translate questions, add a new language, or update translations for the Prawko app.
allowed-tools: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion
---

# Translate Driving Exam Questions

**Role**: Translation specialist for the Prawko driving license exam app. Translates all 3,719 official Polish driving exam questions to a target language.

## Data Structure

### Source: Category JSON files
Location: `src/data/{A,A1,A2,AM,B,B1,C,C1,D,D1,PT,T}.json`

Each file contains:
```json
{
  "category": "B",
  "questions": [
    {
      "id": 1234,
      "q": "Polish question text",
      "type": "basic",
      "correct": "T"
    },
    {
      "id": 5678,
      "q": "Polish question text",
      "type": "specialist",
      "correct": "A",
      "a": "Answer option A",
      "b": "Answer option B",
      "c": "Answer option C"
    }
  ]
}
```

- `type: "basic"` — Yes/No (TAK/NIE) questions. Only translate `q`.
- `type: "specialist"` — Multiple choice (A/B/C). Translate `q`, `a`, `b`, `c`.

### Output: Translation file
Location: `src/data/translations_{lang}.json`

Format:
```json
{
  "1234": { "q": "Translated question" },
  "5678": { "q": "Translated question", "a": "Option A", "b": "Option B", "c": "Option C" }
}
```

Only include fields with non-empty content. Questions are keyed by string ID.

## Workflow

### Step 1: Collect unique questions
Questions are shared across categories. Deduplicate by ID:

```bash
python3 -c "
import json, os
data_dir = 'src/data'
questions = {}
for f in sorted(os.listdir(data_dir)):
    if f in ('meta.json',) or not f.endswith('.json') or f.startswith('translations_'):
        continue
    d = json.load(open(os.path.join(data_dir, f)))
    for q in d['questions']:
        questions[str(q['id'])] = q
print(f'Total unique questions: {len(questions)}')
"
```

### Step 2: Check existing translations
Load the existing translation file (if any) and find untranslated questions:

```python
existing = json.load(open(f'src/data/translations_{lang}.json'))
remaining = {qid: q for qid, q in questions.items() if qid not in existing}
```

### Step 3: Split into batches and translate in parallel
Split untranslated questions into 6 batches (~620 each). Write each batch to `/tmp/prawko_batch_{i}.json`.

Spawn 6 parallel agents using the Task tool, each translating one batch. Each agent:
1. Reads its batch file
2. Translates all questions to the target language
3. Writes output to `/tmp/prawko_translated_{i}.json`

Agent prompt template:
```
You are translating Polish driving license exam questions to {LANGUAGE}.
Read /tmp/prawko_batch_{i}.json containing ~620 questions.

Translate each question's "q" field. For specialist questions (type="specialist"),
also translate "a", "b", "c" answer options. For basic questions, only translate "q".

Write output to /tmp/prawko_translated_{i}.json in format:
{"id": {"q": "translated", "a": "...", "b": "...", "c": "..."}}

Only include fields with content. Translate naturally and accurately — these are
driving theory questions about traffic rules, road signs, vehicle operation, etc.

IMPORTANT: Process ALL questions. Write the complete output file.
```

### Step 4: Merge results
After all agents complete, merge all batch outputs into the final translation file:

```python
import json

merged = {}
for i in range(6):
    try:
        with open(f'/tmp/prawko_translated_{i}.json') as f:
            batch = json.load(f)
        merged.update(batch)
    except Exception as e:
        print(f'Batch {i} failed: {e}')

with open(f'src/data/translations_{lang}.json', 'w') as f:
    json.dump(merged, f, ensure_ascii=False)

print(f'Total translations: {len(merged)}')
```

### Step 5: Wire up the new language (if adding a new language)
If this is a new language (not English):

1. **Add UI translations** to `src/js/i18n.js` — add a new key in the `translations` object
2. **Add language button** to `src/index.html` in the `.lang-toggle` div
3. **Update `translateQuestion()`** in `src/js/i18n.js` to handle the new lang code
4. **Add to service worker** cache if needed in `src/sw.js`

## Translation Guidelines

- Keep translations concise and clear
- Use standard driving/traffic terminology for the target language
- Preserve technical terms (e.g., vehicle types, road sign names)
- Do not translate proper nouns or Polish legal references — keep them as-is
- For abbreviations like "km/h", "t" (tonnes), keep the original units
- "TAK/NIE" answers are not translated in the JSON — they're handled by the UI i18n system

## Verification

After translation, verify the output:
```python
import json
d = json.load(open(f'src/data/translations_{lang}.json'))
print(f'Translated: {len(d)} / 3719 questions')

# Check for missing questions
missing = [qid for qid in questions if qid not in d]
if missing:
    print(f'Missing: {len(missing)} questions')
```
