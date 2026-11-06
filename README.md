# AI Humanizer Plugin & Skill

[![npm version](https://img.shields.io/npm/v/ai-humanizer-skill.svg)](https://www.npmjs.com/package/ai-humanizer-skill)
[![npm downloads](https://img.shields.io/npm/dm/ai-humanizer-skill.svg)](https://www.npmjs.com/package/ai-humanizer-skill)
[![license](https://img.shields.io/npm/l/ai-humanizer-skill.svg)](./LICENSE)
[![install](https://img.shields.io/badge/install-npx%20ai--humanizer-blue)](https://www.npmjs.com/package/ai-humanizer-skill)

A universal AI agent plugin and skill that rewrites AI-generated text so it reads with genuine human cadence, rich diction, and natural voice **while holding up against both statistical and neural AI detectors** (GPTZero, Originality.ai, Turnitin, Copyleaks, Pangram, DetectGPT, Binoculars).

Unlike passive skills, **this plugin automatically compels agents to evaluate, score, and revise their own writing** before presenting final output. It bundles cross-platform detection-risk scoring engines in both **Python 3** and **zero-dependency Node.js**.

**Original skill by [Lakshitha Wijerathne](https://github.com/lakshitha-dev).** <br>
**Plugin extension by [Aleksey Calvin Tsukanov](https://huggingface.co/AlekseyCalvin).** <br>

> **Honest disclaimer.** AI detectors are inherently uncalibrated and unreliable. A Stanford study (Liang et al., 2023) found they flagged **61% of non-native-English essays** as AI. There is a proven mathematical impossibility result: as LLMs approach human distribution, even optimal detectors approach a coin flip. This tool is built for legitimate writing improvement — polishing drafts, varying cadence, removing robotic AI cliches, and protecting writers falsely flagged by broken filters. Use it honestly.

---

## What Makes This a Complete Plugin?

This repository is formatted as a universal agent plugin adhering to the [Agent Plugins Schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json), fully compatible with **OpenAI Codex**, **Claude Desktop / Claude Code**, **Google Antigravity**, and other AI agents:

| Environment | Manifest / Registration | Mechanism |
|---|---|---|
| **OpenAI Codex & ChatGPT** | `plugin.json` (`extensions.com.openai`) + `.agents/plugins/marketplace.json` | Plug-and-play marketplace install, custom prompts, and UI metadata |
| **Google Antigravity** | `plugin.json` + `hooks.json` + `rules/AGENTS.md` | Auto-loaded workspace rules and pre-invocation lifecycle hooks |
| **Claude Code & Desktop** | `.claude-plugin/plugin.json` + `skills/ai-humanizer/SKILL.md` | Skill discovery and project/user installation via `cli.js` |
| **Cursor / Windsurf / OpenCode** | `rules/AGENTS.md` + `skills/ai-humanizer/` | Universal instructions and structured agent skill reference |

---

## Autonomous Self-Evaluation & Revision Protocol

When this plugin is active, `rules/AGENTS.md` enforces a strict 4-phase closed loop:

```
[Draft / User Prose] 
       │
       ▼
[Phase 1: Signal Audit] ───► Flag AI lexical tells, check sentence burstiness (CV)
       │
       ▼
[Phase 2: Automated Score] ─► Run detection-risk estimator (0-100 scale)
       │
       ▼
[Phase 3: Revision Gate] ───► If Risk ≥ 25 or tells exist: REVISE logic & cadence
       │
       ▼
[Phase 4: Verified Delivery] ─► Deliver final prose with verification scorecard:
                             [Risk X/100 (Likely Human) | CV 0.XX | 0 tells]
```

---

## Installation & Setup

### 1. OpenAI Codex / ChatGPT Desktop
Add the marketplace catalog or clone the plugin:
```bash
# Via Codex Plugin Marketplace
codex plugin marketplace add mlswijerathne/ai-humanizer-skill --ref main
codex plugin add ai-humanizer
```
Or place the repository inside your project's `.agents/plugins/ai-humanizer` directory.

### 2. Google Antigravity & Gemini CLI
Install as a user-level or project-level plugin:
```bash
# Automated install into Antigravity plugins directory:
npx ai-humanizer install --antigravity
```
Or clone directly into:
`~/.gemini/config/plugins/ai-humanizer/` (Global) or `.agents/plugins/ai-humanizer/` (Workspace).

### 3. Claude Code / Claude Desktop
```bash
# Install for current user (~/.claude/skills)
npx ai-humanizer install

# Or install locally in the current project (.claude/skills)
npx ai-humanizer install --project
```
Then restart Claude Code and run `/ai-humanizer` or prompt Claude to humanize text.

For Claude.ai web: download `ai-humanizer.zip` and upload under **Settings → Customize → Skills**.

---

## Universal Detection-Risk Scoring Script

The plugin ships an automated scoring estimator that evaluates:
- **Burstiness CV** ($\sigma / \mu$ of sentence length; AI $\approx 0.15–0.30$, human $\ge 0.60$)
- **AI Lexical Tells** (density per 100 words of 40+ high-probability LLM cliches)
- **Unicode Artifacts** (em-dashes, curly quotes, invisible zero-width chars)
- **Vocabulary Richness** (Type-Token Ratio)

### How to Run Anywhere (After Plugin Import)

Regardless of where the plugin directory is mounted in Codex, Antigravity, or Claude, the scoring engine can always be invoked:

```bash
# 1. Portable Dynamic Discovery (Python 3):
python3 "$(find . ~/.gemini ~/.claude .agents "$HOME" -name score.py 2>/dev/null | head -n 1)" draft.txt

# 2. Score raw text directly from the command line:
python3 "$(find . ~/.gemini ~/.claude .agents "$HOME" -name score.py 2>/dev/null | head -n 1)" "The plan fell apart yesterday. It was not a surprise..."

# 3. Zero-dependency Node.js runner (when Python is unavailable):
node "$(find . ~/.gemini ~/.claude .agents "$HOME" -name score.js -o -name cli.js 2>/dev/null | head -n 1)" score --summary "Text to score..."

# 4. Universal Shell Wrapper:
./bin/score --summary draft.txt

# 5. Output formats:
./bin/score draft.txt             # Detailed breakdown
./bin/score draft.txt --summary   # Single-line scorecard
./bin/score draft.txt --json      # Raw JSON output
```

### Example Before & After

**Before (AI Draft):**
> Remote work has emerged as a pivotal shift in the modern workplace, fundamentally transforming how organizations operate. It offers numerous benefits — including increased flexibility, improved work-life balance, and enhanced productivity. However, it also presents challenges that must be navigated carefully. Ultimately, the future of work will likely be shaped by how effectively companies adapt to this evolving landscape.

```
Estimated detection risk: 78.4/100 (likely AI)
Burstiness CV: 0.174 [sentence-len stdev 3.4, target >7]
Tells found: emerged as, pivotal, navigate the, ultimately,, evolving landscape
Unicode artifacts: 1 (em-dash)
```

**After (Autonomous Revision):**
> Remote work stuck. Companies that swore everyone would be back at their desks by 2022 are now fighting over who gets to keep the corner office nobody uses. The upsides are real: people skip the commute, see their kids at lunch, and a few of them actually get more done. The downsides are real too, and most of them come down to one thing, which is that managing people you can't see is a skill almost nobody was trained for. What happens next mostly depends on whether managers learn it.

```
Estimated detection risk: 0.0/100 (likely human)
Burstiness CV: 0.712 [sentence-len stdev 12.8, target >7]
Tells found: 0
Unicode artifacts: 0
```

---

## Repository Structure

```
.
├── plugin.json                 # Universal manifest (agent-plugins schema, com.openai, Antigravity)
├── gemini-extension.json       # Gemini / Antigravity extension marker
├── hooks.json                  # Antigravity lifecycle hooks
├── .claude-plugin/
│   └── plugin.json             # Claude plugin manifest
├── .agents/
│   └── plugins/marketplace.json # OpenAI Codex marketplace discovery config
├── rules/
│   ├── AGENTS.md               # Mandatory self-evaluation & revision rules
│   └── GEMINI.md               # Directory rules mirror
├── skills/
│   └── ai-humanizer/
│       ├── SKILL.md            # In-depth operational agent guide
│       ├── scripts/
│       │   └── score.py        # Python detection-risk scoring engine
│       └── reference/
│           ├── detector-landscape.md
│           └── test-cases.md
├── bin/
│   ├── cli.js                  # Installer & CLI runner
│   ├── score.js                # Zero-dependency Node.js scorer
│   └── score                   # Cross-platform executable launcher
├── assets/
│   ├── icon.svg                # 128x128 high-contrast plugin icon
│   └── logo.svg                # Plugin logo asset
├── package.json
└── LICENSE
```

---

## ⚖️ License

MIT © mlswijerathne
