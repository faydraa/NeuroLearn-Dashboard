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

function bandProfile(band: FocusBand): { studyMin: number; breakFrequency: number; targetTotalMin: number } {
  switch (band) {
    case "very_low_engagement":
      return { studyMin: 8, breakFrequency: 0.4, targetTotalMin: 45 };
    case "distracted":
      return { studyMin: 12, breakFrequency: 0.5, targetTotalMin: 60 };
    case "moderate_focus":
      return { studyMin: 20, breakFrequency: 0.6, targetTotalMin: 90 };
    case "strong_focus":
      return { studyMin: 30, breakFrequency: 0.7, targetTotalMin: 120 };
  }
}

// Get random break duration based on break type and focus band
function getBreakDuration(breakType: string, focusBand: FocusBand): number {
  const type = breakType.toLowerCase();
  
  let baseDuration = 0;
  
  if (type.includes("water")) {
    baseDuration = 3;
  } else if (type.includes("stretch")) {
    baseDuration = 2;
  } else if (type.includes("breath") || type.includes("meditation")) {
    baseDuration = 3;
  } else if (type.includes("snack")) {
    baseDuration = 5;
  } else if (type.includes("eye")) {
    baseDuration = 2;
  } else {
    baseDuration = 3;
  }
  
  let extraDuration = 0;
  switch (focusBand) {
    case "very_low_engagement":
      extraDuration = Math.floor(Math.random() * 5) + 2;
      break;
    case "distracted":
      extraDuration = Math.floor(Math.random() * 4) + 1;
      break;
    case "moderate_focus":
      extraDuration = Math.floor(Math.random() * 2);
      break;
    case "strong_focus":
      extraDuration = 0;
      break;
  }
  
  return baseDuration + extraDuration;
}

// Get random break type with variety
function getRandomBreakType(previousTypes: string[], focusBand: FocusBand): string {
  let allTypes: string[];
  
  if (focusBand === "strong_focus" || focusBand === "moderate_focus") {
    allTypes = ["Water break", "Stretch break", "Breathing break"];
  } else {
    allTypes = ["Water break", "Stretch break", "Breathing break", "Snack break", "Meditation break", "Eye rest break"];
  }
  
  const lastType = previousTypes[previousTypes.length - 1];
  let availableTypes = allTypes;
  
  if (lastType) {
    availableTypes = allTypes.filter(t => t !== lastType);
  }
  
  const randomIndex = Math.floor(Math.random() * availableTypes.length);
  return availableTypes[randomIndex];
}

export function generateRuleBasedPlan(baseline_mean_focus: number): StudyPlan {
  const focusBand = classifyMeanFocus(baseline_mean_focus);
  const { studyMin, breakFrequency, targetTotalMin } = bandProfile(focusBand);

  let t = 0; // Total elapsed time (includes both study AND breaks)
  const breaks: { time: number; duration: number; type: string }[] = [];
  const breakTypesUsed: string[] = [];

  // Loop until we reach the target total duration (including breaks)
  while (t < targetTotalMin) {
    // Calculate how much study time we can actually add
    const remainingTime = targetTotalMin - t;
    const actualStudyMin = Math.min(studyMin, remainingTime);
    
    if (actualStudyMin <= 0) break;
    
    // Add study session
    t += actualStudyMin;
    
    // Check if we've reached the target after study session
    if (t >= targetTotalMin) break;
    
    // Determine if we should take a break
    const shouldTakeBreak = Math.random() < breakFrequency;
    
    const maxBreaks = focusBand === "strong_focus" ? 3 : 
                      focusBand === "moderate_focus" ? 4 :
                      focusBand === "distracted" ? 6 : 8;
    
    const minBreaks = focusBand === "strong_focus" ? 2 :
                      focusBand === "moderate_focus" ? 3 :
                      focusBand === "distracted" ? 4 : 5;
    
    const breaksSoFar = breaks.length;
    const remainingAfterStudy = targetTotalMin - t;
    
    // Force breaks based on minimum requirements
    const needsBreak = (shouldTakeBreak && breaksSoFar < maxBreaks) || 
                      (breaksSoFar < minBreaks && remainingAfterStudy > 0);
    
    if (needsBreak && remainingAfterStudy >= 2) {
      const breakType = getRandomBreakType(breakTypesUsed, focusBand);
      breakTypesUsed.push(breakType);
      
      let breakDuration = getBreakDuration(breakType, focusBand);
      
      // Don't exceed remaining time
      breakDuration = Math.min(breakDuration, remainingAfterStudy);
      
      if (breakDuration >= 2) {
        breaks.push({
          time: t,
          duration: breakDuration,
          type: breakType,
        });
        t += breakDuration;
      }
    }
  }

  // Final total duration includes both study and breaks
  const finalTotalDuration = t;

  return {
    totalDuration: finalTotalDuration, // This will now exactly equal targetTotalMin
    breaks,
    subjects: [],
    generatedAt: new Date(),
    baseline_mean_focus,
    focusBand,
  };
}