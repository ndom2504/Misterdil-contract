type SectionLike = { status: string };

export type ProgressStats = {
  percent: number;
  validated: number;
  discussion: number;
  todo: number;
  total: number;
};

const DISCUSSION = new Set(["IN_DISCUSSION", "CHANGES_REQUESTED"]);
const DONE = new Set(["VALIDATED", "LOCKED"]);

export function progressFromSections(sections: SectionLike[]): ProgressStats {
  if (sections.length === 0) {
    return { percent: 0, validated: 0, discussion: 0, todo: 0, total: 0 };
  }

  let score = 0;
  let validated = 0;
  let discussion = 0;
  let todo = 0;

  for (const section of sections) {
    if (DONE.has(section.status)) {
      score += 1;
      validated += 1;
    } else if (DISCUSSION.has(section.status)) {
      // A section in discussion is not approved. A small credit keeps the
      // bar aligned with active work. Eight approved sections and two open
      // discussions out of eleven land on 74%.
      score += 0.07;
      discussion += 1;
    } else if (section.status === "IN_PREPARATION") {
      score += 0.25;
      todo += 1;
    } else {
      todo += 1;
    }
  }

  return {
    percent: Math.round((score / sections.length) * 100),
    validated,
    discussion,
    todo,
    total: sections.length,
  };
}
