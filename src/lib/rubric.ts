import fs from "node:fs";
import path from "node:path";

import type { Role } from "./types";

// Structured mirror of data/rubric.txt (the source of truth). Weights must total 100 per role.

export type Criterion = {
  id: string;
  name: string;
  weight: number;
  definition: string;
  strong: string;
};

export const ROLE_LABEL: Record<Role, string> = {
  PM: "Product Manager",
  SPM: "Senior Product Manager",
};

export const RUBRICS: Record<Role, Criterion[]> = {
  PM: [
    {
      id: "PM1",
      name: "Unprompted build → peer adoption (P1)",
      weight: 25,
      definition:
        "Spots an unowned operational pain, builds a rough working fix without being asked, and gets it adopted.",
      strong:
        "Names a specific pain they noticed themselves, what they built and how fast, and who adopted it without a mandate, with numbers. Weak: every example was an assigned project.",
    },
    {
      id: "PM2",
      name: "Lived operations fluency",
      weight: 20,
      definition:
        "Has personally done or sat inside freight, customs, carrier or port work, not just interviewed people who do.",
      strong:
        "Can walk through a real freight forwarder's day: documents, holds, DO releases, berth windows, and what breaks. Can name a workflow gap they saw from inside the operation.",
    },
    {
      id: "PM3",
      name: "Ship–kill–document discipline",
      weight: 20,
      definition:
        "Kills work based on usage data, even when discovery was positive, and writes up why things failed so the lesson spreads.",
      strong:
        "Gives a real kill decision with the data behind it and what replaced it, and has a written post-mortem that changed how the team works. Weak: only success stories, or \"we learned a lot\" with no artifact.",
    },
    {
      id: "PM4",
      name: "Silent recovery under pressure (P2)",
      weight: 20,
      definition:
        "When something breaks, fixes it fast and keeps the customer from absorbing the pain.",
      strong:
        "A concrete incident with timeline, what they personally did, and customer impact (ideally none). Weak: escalated and waited, or the story is only about the team.",
    },
    {
      id: "PM5",
      name: "Builds rhythms others adopt",
      weight: 15,
      definition:
        "Creates templates, frameworks or processes that become the team standard.",
      strong:
        "Shows the artifact, who adopted it, and what measurably changed, for example less misalignment or fewer queries.",
    },
  ],
  SPM: [
    {
      id: "SPM1",
      name: "Integration & migration judgment under live stakes",
      weight: 25,
      definition:
        "Has moved or connected live operational systems (vendors, carriers, 3PLs, FMS) without disrupting users, and made the build / configure / avoid call.",
      strong:
        "A named migration or integration with its trade-offs, the rollback or safety plan, measured result, and one thing they deliberately chose not to build.",
    },
    {
      id: "SPM2",
      name: "Silent recovery & reliability instinct (P2)",
      weight: 20,
      definition:
        "Treats failures as their own responsibility, fixes fast, and shields customers.",
      strong:
        "A specific incident plus a structural fix that stopped it happening again, such as on-call, monitoring or review.",
    },
    {
      id: "SPM3",
      name: "Documented decision ownership",
      weight: 20,
      definition:
        "Makes calls in ambiguity, commits, and writes down the reasoning, including when they were wrong.",
      strong:
        "A hard call made without senior cover, its written rationale, what happened, and what they would change. Referees confirm the team trusted the call.",
    },
    {
      id: "SPM4",
      name: "Grows people to promotion (P3)",
      weight: 15,
      definition: "Develops others with measurable outcomes.",
      strong:
        "Names the people they developed, what they did differently for each, and the outcome, such as a promotion or a new scope. Weak: \"I mentor informally.\"",
    },
    {
      id: "SPM5",
      name: "Lived operations fluency",
      weight: 10,
      definition:
        "Has direct, hands-on experience in logistics or operations-heavy work.",
      strong:
        "Can explain how a real integration gap, such as a slot booking or document handoff, breaks a forwarder's workflow.",
    },
    {
      id: "SPM6",
      name: "Commercial read of product gaps",
      weight: 10,
      definition:
        "Understands why deals stall, such as the buyer, the procurement cycle, or a missing integration, and connects product work to revenue.",
      strong:
        "Names a specific deal or segment a product or integration change unlocked, and how they found the blocker.",
    },
  ],
};

for (const role of Object.keys(RUBRICS) as Role[]) {
  const total = RUBRICS[role].reduce((s, c) => s + c.weight, 0);
  if (total !== 100) throw new Error(`${role} rubric weights total ${total}, expected 100`);
}

export const RUBRIC_VERSION = "rubric.txt v1";

const dataDir = path.join(process.cwd(), "data");
const read = (f: string) => fs.readFileSync(path.join(dataDir, f), "utf8");

export function rubricText() {
  return read("rubric.txt");
}

export function jobDescription(role: Role) {
  return read(role === "PM" ? "jd_pm.txt" : "jd_spm.txt");
}

/** Rubric formula: sum(rating ÷ 5 × weight). Ratings are 1–5. */
export function weightedScore(role: Role, ratings: Record<string, number>) {
  const total = RUBRICS[role].reduce((s, c) => s + ((ratings[c.id] ?? 1) / 5) * c.weight, 0);
  return Math.round(total * 10) / 10;
}

/** Non-binding band shown next to the score. Arjun makes the decision. */
export function scoreBand(score: number) {
  if (score >= 75) return "Strong match";
  if (score >= 55) return "Possible match";
  return "Weak match";
}
