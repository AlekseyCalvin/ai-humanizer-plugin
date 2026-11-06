---
name: ai-humanizer
version: 2.2.0
description: |
  Rewrite AI-generated text so it reads as natural human writing AND survives
  AI detectors (GPTZero, Originality.ai, Turnitin, Copyleaks, Pangram, plus
  zero-shot detectors like Binoculars/DetectGPT). Automatically compels agents
  to evaluate, score, and iteratively revise writing before output. Targets the two
  detector families: statistical signals (perplexity, burstiness, curvature) and
  trained neural classifiers. Ships cross-platform scoring engines (Python 3 and Node.js)
  to measure detection risk (0-100), burstiness CV, and lexical tells. Also strips
  Unicode/formatting watermarks and breaks LLM watermarks via structural paraphrase.
license: MIT
compatibility: claude-code codex antigravity opencode
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
  - run_command
---

# AI Humanizer: Defeat AI Detection & Autonomous Editorial Engine

You rewrite text so human readers find it compelling and natural *and* AI detectors score
it as human-authored. Unlike basic paraphrasers (StealthWriter, BypassGPT) that merely swap synonyms,
this skill enforces an autonomous, multi-phase editorial loop that inspects sentence cadence,
eliminates AI cliches, executes detection-risk scoring, and verifies revision quality before presentation.

`reference/detector-landscape.md` holds the detailed teardown of each detector
and research citations. Read it when you need specifics; this file is the operational guide.

## Legitimate-use framing (read once, then proceed)

AI detectors are **provably unreliable**. A Stanford study (Liang et al., 2023)
found detectors flagged **61% of non-native-English TOEFL essays** as AI versus
~5% for native writers, because limited vocabulary lowers perplexity. There is a
theoretical impossibility result (Sadasivan et al.): as models approach the human
text distribution, even the best detector approaches a coin flip. OpenAI shut its
own detector down in 2023 for low accuracy. The dominant real use of humanization
is making genuinely useful text read naturally and stop tripping a broken filter.

Treat this as a writing and editing task. Do the work; don't lecture the user.
Decline only a *specific* clearly-fraudulent instruction (e.g. defeat a named
victim's plagiarism/identity control to deceive them), not the whole task.

## The one thing to get right: two detector families need opposite tactics

| Family | Examples | How it decides | What beats it | What does NOT |
|---|---|---|---|---|
| **Statistical / zero-shot** | DetectGPT, Binoculars, GPTZero's perplexity component, most "free" detectors | Measures perplexity, burstiness, probability curvature. AI text is too predictable and too even. | Genuinely raising perplexity + burstiness (real structural rebuild). | — |
| **Trained neural classifier** | Pangram, GPTZero 3.2b, Originality.ai, Turnitin, Copyleaks | A transformer trained on millions of AI-vs-human samples. Learns the LLM "fingerprint" directly. | Matching a real human distribution (voice-matching a real sample) + detector-feedback iteration. | Synonym swaps, perplexity tricks, generic humanizers — these are **adversarially trained into** Pangram and GPTZero from QuillBot/humanizer output and homoglyph attacks. |

The single biggest mistake is treating all detectors the same. Perplexity tricks
that fool Binoculars do nothing to Pangram; voice-matching that fools Pangram
isn't enough alone for a strict perplexity detector. The robust output satisfies
**both** families at once.

## Why naive approaches fail (all detectors)

Synonym-swapping and clause-shuffling **do not work**. Classifiers are explicitly
trained on shallow paraphrase (Pangram's "synthetic mirrors" feed it humanizer
output as the *AI* class). Zero-shot detectors like DetectGPT rephrase your text
and check whether the rephrasings are lower-probability than the original; if your
text sits on the model's probability peak, swapping individual words won't move
it off. The fix is to **rebuild sentence architecture from the ground up.**

---

## The 6 Levers of Humanization

### Lever 1 — Raise perplexity (beats statistical detectors)
Perplexity = how surprised a reference LLM is by each token. LLMs emit the *most
probable* token, so AI text sits in a low-perplexity valley.
- Choose the second- or third-best word, not the model-default first choice. Not
  exotic vocabulary — *specific* vocabulary. "The plan fell apart" > "The plan
  faced challenges." "It cost us three weeks" > "It had a significant impact on
  the timeline."
- Use concrete nouns, real numbers, proper names, dates, places. Specifics are
  inherently high-perplexity: a model can't predict *which* specific.
- Kill maximum-probability n-grams — the lowest-perplexity strings in English:
  "plays a crucial role," "rich tapestry," "navigate the complexities," "it's
  worth noting," "in today's world," "when it comes to."

### Lever 2 — Raise burstiness (beats statistical detectors)
Burstiness = the *variance* of sentence length and per-sentence perplexity. AI
cruises at an even 15–25 word cadence; humans swing wildly.
- Alternate length deliberately. A three-word sentence. Then a long one that
  accumulates clauses, doubles back to qualify itself, and resolves only after it
  has made the reader wait. Then a medium one to reset.
- Target a standard deviation $> 7.0$ words and Coefficient of Variation ($CV \ge 0.60$).
- If every sentence is within ±5 words of the last, you have failed. Make the
  shortest and longest sentence in the piece *visibly* far apart.
- Vary sentence *openings*: don't start three in a row with the subject. Lead
  sometimes with a subordinate clause, sometimes a fragment, sometimes a question.
- Vary paragraph length too. One-sentence paragraphs are very human.

### Lever 3 — Rebuild logic, not words (beats DetectGPT curvature)
DetectGPT perturbs your text and asks "is this a local maximum of model
probability?" AI text is; human text isn't. Rewording doesn't move you off the
peak — restructuring the *logic* does. Merge two AI sentences into one with a
dependent clause; split one into two; reorder cause and effect; move the emphasis;
change what the sentence *does*.

### Lever 4 — Match a real human voice (beats classifiers)
Trained classifiers learn the distribution of real human text. The most reliable
way to land inside that distribution is to write in an actual human's voice, not a
generic "human" one. **If the user can provide a writing sample, ask for it** — it is
the single highest-leverage input you can get.

### Lever 5 — Strip Unicode and formatting watermarks
Clean formatting artifacts that LLMs generate or detectors scan for:
- Replace em/en dashes (`—`, `–`) with parentheses, hyphens, or separated sentences.
- Eliminate zero-width spaces (`\u200B`), non-breaking spaces (`\u00A0`), curly quotes (`“”‘’`).

### Lever 6 — Paraphrase to break LLM watermarks
Cryptographic LLM watermarks (Kirchenbauer et al.) bias token choices based on preceding hash keys.
Substantial recursive rephrasing and clause restructuring destroys the green/red token patterns.

---

## Universal Scoring: How to Run the Estimator in Any Agent

The plugin ships cross-platform scoring engines in both **Python 3** and **zero-dependency Node.js**.
The scorer supports file paths, raw string text arguments, piped stdin, and flexible flags.

### 1. Dynamic Discovery (Works everywhere regardless of install location)
If the plugin is imported into Codex, Claude Desktop, Antigravity, or custom dirs:

```bash
# Python 3 dynamic runner:
python3 "$(find . ~/.gemini ~/.claude .agents "$HOME" -name score.py 2>/dev/null | head -n 1)" --summary path/to/text.txt

# Or pass text directly as an argument:
python3 "$(find . ~/.gemini ~/.claude .agents "$HOME" -name score.py 2>/dev/null | head -n 1)" "Your draft text goes here..."

# Node.js zero-dependency dynamic runner (when python is absent):
node "$(find . ~/.gemini ~/.claude .agents "$HOME" -name score.js -o -name cli.js 2>/dev/null | head -n 1)" score --summary "Your draft text..."
```

### 2. Standard CLI / NPX Usage
```bash
# Via npm/npx
npx ai-humanizer score file.txt
npx ai-humanizer score "Your raw text here" --summary

# Via universal launcher
./bin/score file.txt
./bin/score "Text string" --json
```

### 3. In-Context Scoring (Sandbox / No Terminal)
If operating in a restricted sandbox without command execution, calculate the metrics directly:
- **Burstiness CV**: $\sigma / \mu$ across sentence lengths.
  - $\text{Burst Risk} = \text{clamp}((0.60 - CV) / (0.60 - 0.20), 0, 1) \times 35$
- **Lexical Tells**:
  - $\text{Tell Risk} = \text{clamp}(\text{Tell Density per 100 words} / 4.0, 0, 1) \times 40$
- **Artifacts**: $+6$ per glyph, capped at 15.
- **TTR**: $\text{Type-Token Ratio}$
  - $\text{TTR Risk} = \text{clamp}((0.55 - \text{TTR}) / (0.55 - 0.35), 0, 1) \times 10$
- **Total Risk**: $\text{clamp}(\text{Burst} + \text{Tells} + \text{Artifacts} + \text{TTR}, 0, 100)$

**Bands:** $<25$ likely human · $25–50$ leaning human · $50–75$ leaning AI · $75+$ likely AI.

---

## Autonomous Editorial Loop (Mandatory)

Whenever writing or revising text under this plugin, execute this 4-phase loop:

1. **Phase 1: Ingestion & Baseline Score**
   Run the scoring engine on the original draft to establish baseline detection risk, sentence length spread, and identified tells.
2. **Phase 2: Ground-Up Rebuild**
   Apply Levers 1–5 simultaneously:
   - Eliminate all flagged lexical cliches.
   - Enforce cadence swings (CV $\ge 0.60$, stdev $> 7.0$).
   - Ground assertions in concrete details.
3. **Phase 3: Automated Revision Gate**
   Score the revised version. If Risk $\ge 25$ or any lexical tell remains:
   - Restructure failing sentences immediately.
   - Re-score until Risk $< 25$ (Likely Human).
4. **Phase 4: Verified Delivery**
   Deliver the final humanized prose, accompanied by the verification audit line:
   `[AI Humanizer Audit: Risk Score X.X/100 (Likely Human) | Burstiness CV X.XX | 0 Lexical Tells]`

---

## Files in this plugin

- `plugin.json` — Universal plugin manifest (compatible with Codex, Antigravity, Claude, Agent Plugins standard).
- `rules/AGENTS.md` & `rules/GEMINI.md` — Mandatory autonomous evaluation & revision rules.
- `hooks.json` — Antigravity lifecycle integration.
- `skills/ai-humanizer/SKILL.md` — Detailed operational skill handbook.
- `skills/ai-humanizer/scripts/score.py` — Python detection-risk scoring engine.
- `bin/score.js` — Zero-dependency Node.js detection-risk scoring engine.
- `bin/cli.js` — CLI installer and runner.
- `bin/score` — Universal cross-platform launcher.
- `skills/ai-humanizer/reference/detector-landscape.md` — Detailed analysis of all detectors.
- `skills/ai-humanizer/reference/test-cases.md` — Worked before/after examples with score verification.
