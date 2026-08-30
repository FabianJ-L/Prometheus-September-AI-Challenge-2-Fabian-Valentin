# NOESIS — 120-second demo

Lesson: **`loops-accumulate`** ("Summing a list"). One reel, no feature tour.

```python
numbers = [2, 4, 6]
  
total = 0

for number in numbers:
    total += number

print(total)
```

| # | Time | On screen | Point being made |
| --- | --- | --- | --- |
| 1 | 0:00 | Learn page. Code panel on the left, empty Program-state panel on the right. | This is an instrument, not a chat box. |
| 2 | 0:10 | "Predict what `total` will be" → type **6** → Submit. | The student must commit to a mental model first. |
| 3 | 0:20 | Steps stream in; the executing line highlights; `total` updates `0 → 2 → 6 → 12`. | Execution is concrete and inspectable. |
| 4 | 0:40 | Prediction vs reality: `your model 6` / `actual 12` → "✕ Your mental model diverged". | We track what the student *expected*, not just the code. |
| 5 | 0:55 | "likely gap: Assignment replaces, it doesn't add". No explanation yet. | The system names the misconception. |
| 6 | 1:05 | Socratic question: *"Just before that line runs, `total` already holds a value. What does `=` do with the value that was already there?"* | It teaches by question, never by rewriting code. |
| 7 | 1:20 | Student answers "it replaces it" → "Good — now re-run the prediction." | It checks the corrected understanding. |
| 8 | 1:35 | Re-predict **12** → "✓ Model confirmed · Concept reinforced." | The loop closes on understanding, not on a green checkmark. |
| 9 | 1:50 | Mental-model panel: `accumulation` and `assignment` bars move up. | The student model updated from this one session. |

Closing line: **"The LLM isn't our product. The student model is."**

## Runbook

```bash
make setup           # once
make dev             # backend :8000 + frontend :3000
# open http://localhost:3000/learn
```

Runs fully offline (mock AI). With `GROQ_API_KEY` in `frontend/.env.local` the
misconception + question come from the model instead of the heuristic.
