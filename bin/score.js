#!/usr/bin/env node
"use strict";

/**
 * ai-humanizer detection-risk estimator (Node.js engine).
 * 
 * 100% feature-compatible mirror of score.py with zero external dependencies.
 * Provides instant scoring in environments where Python 3 is absent or sandboxed.
 */

const fs = require("fs");
const path = require("path");

const TELLS = [
  "crucial", "delve", "underscore", "leverage", "tapestry", "pivotal",
  "intricate", "seamless", "robust", "foster", "realm", "navigate the",
  "testament", "vibrant", "nestled", "boasts", "showcase", "emerged as",
  "at its core", "it's important to note", "it is important to note",
  "in today's", "when it comes to", "plays a crucial role", "rich tapestry",
  "wealth of", "transformative", "for the sake of argument", "let us consider",
  "we will employ", "moreover", "furthermore", "evolving landscape",
  "fast-paced world", "not just about", "comes with trade-offs",
  "putting pen to paper", "innermost thoughts", "self-discovery",
  "ultimately,", "in conclusion", "the future looks bright", "a wealth of",
  "play a crucial role", "stands as", "serves as", "wide range of"
];

const ARTIFACTS = ["—", "–", "“", "”", "‘", "’", "\u200b", "\u200c", "\u2060", "\u00a0", "\u202f", "…"];

function splitSentences(text) {
  const parts = text.trim().split(/(?<=[.!?])\s+/);
  return parts.map(p => p.trim()).filter(Boolean);
}

function wordCount(s) {
  const matches = s.match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g);
  return matches ? matches.length : 0;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function score(text) {
  const sents = splitSentences(text);
  const lengths = sents.map(wordCount).filter(l => l > 0);
  const totalWords = lengths.reduce((a, b) => a + b, 0);
  const n = lengths.length;

  if (totalWords < 25 || n < 3) {
    return {
      estimated_detection_risk: null,
      band: "too short to score",
      note: "Need at least ~25 words and 3 sentences; statistical signals are meaningless on shorter text (real detectors agree).",
      features: { sentences: n, words: totalWords }
    };
  }

  const mu = n ? totalWords / n : 0.0;
  let sigma = 0.0;
  if (n > 1) {
    const variance = lengths.reduce((acc, l) => acc + Math.pow(l - mu, 2), 0) / (n - 1);
    sigma = Math.sqrt(variance);
  }
  const cv = mu ? sigma / mu : 0.0;

  const words = (text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []);
  const ttr = words.length ? new Set(words).size / words.length : 0.0;

  const low = text.toLowerCase();
  const tellHits = [];
  let tellTotal = 0;
  for (const t of TELLS) {
    let count = 0;
    let pos = 0;
    while ((pos = low.indexOf(t, pos)) !== -1) {
      count++;
      pos += t.length;
    }
    if (count > 0) {
      tellHits.push([t, count]);
      tellTotal += count;
    }
  }
  const tellDensity = totalWords ? (tellTotal / totalWords * 100) : 0.0;

  let artifactCount = 0;
  for (const ch of ARTIFACTS) {
    let pos = 0;
    while ((pos = text.indexOf(ch, pos)) !== -1) {
      artifactCount++;
      pos += ch.length;
    }
  }

  // Composite estimated detection risk (0-100)
  const burstRisk = clamp((0.60 - cv) / (0.60 - 0.20), 0, 1) * 35;
  const tellRisk = clamp(tellDensity / 4.0, 0, 1) * 40;
  const artRisk = Math.min(artifactCount * 6, 15);
  const ttrRisk = clamp((0.55 - ttr) / (0.55 - 0.35), 0, 1) * 10;
  const risk = clamp(burstRisk + tellRisk + artRisk + ttrRisk, 0, 100);

  let band = "likely human";
  if (risk < 25) band = "likely human";
  else if (risk < 50) band = "leaning human";
  else if (risk < 75) band = "leaning AI";
  else band = "likely AI";

  return {
    estimated_detection_risk: Math.round(risk * 10) / 10,
    band,
    features: {
      sentences: n,
      words: totalWords,
      mean_sentence_len: Math.round(mu * 10) / 10,
      stdev_sentence_len: Math.round(sigma * 10) / 10,
      burstiness_cv: Math.round(cv * 1000) / 1000,
      type_token_ratio: Math.round(ttr * 1000) / 1000,
      lexical_tells: tellTotal,
      tell_density_per_100w: Math.round(tellDensity * 100) / 100,
      unicode_artifacts: artifactCount
    },
    components: {
      burstiness_risk: Math.round(burstRisk * 10) / 10,
      tell_risk: Math.round(tellRisk * 10) / 10,
      artifact_risk: Math.round(artRisk * 10) / 10,
      ttr_risk: Math.round(ttrRisk * 10) / 10
    },
    tell_hits: tellHits
  };
}

function fmt(r) {
  if (r.estimated_detection_risk === null) {
    return `  ${r.band}: ${r.note}\n  (sentences ${r.features.sentences}, words ${r.features.words})`;
  }
  const f = r.features;
  const c = r.components;
  const out = [
    `  Estimated detection risk: ${r.estimated_detection_risk}/100  (${r.band})`,
    `    (statistical-detector estimate only; NOT a guarantee vs trained classifiers)`,
    `  Burstiness CV: ${f.burstiness_cv}  (AI ~0.15-0.30, human ~0.60-1.00)  [sentence-len stdev ${f.stdev_sentence_len}, target >7]`,
    `  Lexical tells: ${f.lexical_tells}  (${f.tell_density_per_100w}/100w)`,
    `  Vocab richness (TTR): ${f.type_token_ratio}`,
    `  Unicode artifacts: ${f.unicode_artifacts}`,
    `  Sentences/words: ${f.sentences}/${f.words}  mean len ${f.mean_sentence_len}`,
    `  Risk breakdown -> burst ${c.burstiness_risk} + tells ${c.tell_risk} + artifacts ${c.artifact_risk} + ttr ${c.ttr_risk}`
  ];
  if (r.tell_hits && r.tell_hits.length > 0) {
    const hits = r.tell_hits.map(([t, count]) => (count > 1 ? `${t}×${count}` : t)).join(", ");
    out.push(`  Tells found: ${hits}`);
  }
  return out.join("\n");
}

function fmtSummary(r) {
  if (r.estimated_detection_risk === null) {
    return `[AI Humanizer: ${r.band} - ${r.features.words} words, ${r.features.sentences} sents]`;
  }
  const f = r.features;
  const tellsStr = f.lexical_tells > 0 ? `${f.lexical_tells} tells` : "0 tells";
  return `[AI Humanizer: Risk ${r.estimated_detection_risk}/100 (${r.band}) | Burstiness CV: ${f.burstiness_cv} | ${tellsStr} | ${f.words} words]`;
}

function runScore(text, options) {
  const r = score(text);
  if (options.json) {
    console.log(JSON.stringify(r, null, 2));
  } else if (options.summary) {
    console.log(fmtSummary(r));
  } else {
    console.log(fmt(r));
  }
  return r;
}

function handleHook(hookType) {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => { buf += chunk; });
  process.stdin.on("end", () => {
    let payload = {};
    try {
      payload = JSON.parse(buf || "{}");
    } catch (e) {
      payload = {};
    }

    if (hookType === "pre-invocation") {
      const lastInput = (payload.lastUserInput || "").toLowerCase();
      const writingKeywords = [
        "write", "draft", "rewrite", "humanize", "edit", "article", "post",
        "email", "essay", "content", "prose", "blog", "copy", "summarize",
        "paraphrase", "clarify", "deslop", "clean up"
      ];
      const isWriting = writingKeywords.some(kw => lastInput.includes(kw));
      if (isWriting) {
        console.log(JSON.stringify({
          injectSteps: [
            {
              ephemeralMessage: "AI Humanizer Active: Audit text against AI tells, ensure high sentence burstiness (CV >= 0.60), run detection risk scoring, and revise until risk < 25 before finalizing."
            }
          ]
        }));
      } else {
        console.log(JSON.stringify({ injectSteps: [] }));
      }
      process.exit(0);
    } else {
      console.log(JSON.stringify({}));
      process.exit(0);
    }
  });
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--hook")) {
    const idx = args.indexOf("--hook");
    const hookType = (idx + 1 < args.length) ? args[idx + 1] : "pre-invocation";
    handleHook(hookType);
    return;
  }

  const asJson = args.includes("--json");
  const asSummary = args.includes("--summary");
  const cleanArgs = args.filter(a => a !== "--json" && a !== "--summary");

  let text = null;

  for (let i = 0; i < cleanArgs.length; i++) {
    if ((cleanArgs[i] === "-t" || cleanArgs[i] === "--text") && i + 1 < cleanArgs.length) {
      text = cleanArgs[i + 1];
      break;
    }
  }

  if (text === null && cleanArgs.length > 0) {
    const candidate = cleanArgs[0];
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      text = fs.readFileSync(candidate, "utf8");
    } else {
      text = candidate;
    }
  }

  if (text !== null) {
    runScore(text, { json: asJson, summary: asSummary });
  } else {
    // Read from stdin
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => { buf += chunk; });
    process.stdin.on("end", () => {
      if (!buf.trim()) {
        console.error("Error: No text or file provided. Run with --help for usage.");
        process.exit(1);
      }
      runScore(buf, { json: asJson, summary: asSummary });
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = { score, fmt, fmtSummary };
