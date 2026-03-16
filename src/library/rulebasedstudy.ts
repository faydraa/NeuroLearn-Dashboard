import type { StudyPlan } from "../App";

export type FocusBand =
  | "very_low_engagement"
  | "distracted"
  | "moderate_focus"
  | "strong_focus";

export function classifyMeanFocus(mean: number): FocusBand {
  if (mean < 0.3) return "very_low_engagement";
  if (mean < 0.5) return "distracted";
  if (mean < 0.7) return "moderate_focus";
  return "strong_focus";
}

function bandProfile(band: FocusBand): { studyMin: number; breakMin: number; targetTotalMin: number } {
  switch (band) {
    case "very_low_engagement":
      return { studyMin: 10, breakMin: 5, targetTotalMin: 45 };
    case "distracted":
      return { studyMin: 12, breakMin: 4, targetTotalMin: 60 };
    case "moderate_focus":
      return { studyMin: 18, breakMin: 4, targetTotalMin: 90 };
    case "strong_focus":
      return { studyMin: 25, breakMin: 5, targetTotalMin: 120 };
  }
}

function breakTypeFor(i: number) {
  const types = ["Water break", "Stretch break", "Breathing break", "Snack break"];
  return types[i % types.length];
}

export function generateRuleBasedPlan(meanFocus: number): StudyPlan {
  const focusBand = classifyMeanFocus(meanFocus);
  const { studyMin, breakMin, targetTotalMin } = bandProfile(focusBand);

  let t = 0; // minutes elapsed
  const breaks: { time: number; duration: number; type: string }[] = [];
  let breakCount = 0;

  while (t + studyMin <= targetTotalMin) {
    t += studyMin;

    if (t + breakMin <= targetTotalMin) {
      breaks.push({
        time: t,
        duration: breakMin,
        type: breakTypeFor(breakCount++),
      });
      t += breakMin;
    } else {
      break;
    }
  }

  return {
    totalDuration: t,
    breaks,
    subjects: [],
    generatedAt: new Date(),
    meanFocus,
    focusBand, // stored as string in StudyPlan
  };
}