export function percentageToLetter(percentage: number): string {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

export function calculatePercentage(
  rawScore: number,
  maxScore: number,
): number {
  if (maxScore <= 0) return 0;
  return Math.round((rawScore / maxScore) * 100);
}

export interface GradeForCalculation {
  percentage: number | null;
  gradeCategoryId: number | null;
}

export interface CategoryForCalculation {
  id: number;
  name: string;
  weight: number;
}

export interface CategoryBreakdown {
  categoryId: number | null;
  name: string;
  weight: number;
  average: number;
}

export interface CourseGradeResult {
  finalPercentage: number | null;
  letterGrade: string | null;
  breakdown: CategoryBreakdown[];
}

export function computeFinalGrade(
  grades: GradeForCalculation[],
  categories: CategoryForCalculation[],
): CourseGradeResult {
  const validGrades = grades.filter(
    (g): g is { percentage: number; gradeCategoryId: number | null } =>
      typeof g.percentage === "number",
  );
  if (validGrades.length === 0) {
    return { finalPercentage: null, letterGrade: null, breakdown: [] };
  }

  if (categories.length === 0) {
    const avg =
      validGrades.reduce((sum, g) => sum + g.percentage, 0) /
      validGrades.length;
    const final = Math.round(avg);
    return {
      finalPercentage: final,
      letterGrade: percentageToLetter(final),
      breakdown: [],
    };
  }

  const categoryMap = new Map<number, CategoryForCalculation>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  const categoryGrades = new Map<number, number[]>();
  const uncategorized: number[] = [];
  for (const g of validGrades) {
    if (g.gradeCategoryId !== null && categoryMap.has(g.gradeCategoryId)) {
      const arr = categoryGrades.get(g.gradeCategoryId);
      if (arr) {
        arr.push(g.percentage);
      } else {
        categoryGrades.set(g.gradeCategoryId, [g.percentage]);
      }
    } else {
      uncategorized.push(g.percentage);
    }
  }

  let totalWeight = 0;
  let weightedSum = 0;
  const breakdown: CategoryBreakdown[] = [];

  for (const cat of categories) {
    const vals = categoryGrades.get(cat.id);
    if (vals && vals.length > 0) {
      const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
      weightedSum += avg * cat.weight;
      totalWeight += cat.weight;
      breakdown.push({
        categoryId: cat.id,
        name: cat.name,
        weight: cat.weight,
        average: Math.round(avg),
      });
    }
  }

  if (uncategorized.length > 0) {
    const avg =
      uncategorized.reduce((sum, v) => sum + v, 0) / uncategorized.length;
    breakdown.push({
      categoryId: null,
      name: "Uncategorized",
      weight: 0,
      average: Math.round(avg),
    });
  }

  if (totalWeight === 0) {
    // No categorized grades; fall back to a simple average so the student still sees a total.
    const avg =
      validGrades.reduce((sum, g) => sum + g.percentage, 0) /
      validGrades.length;
    const final = Math.round(avg);
    return {
      finalPercentage: final,
      letterGrade: percentageToLetter(final),
      breakdown,
    };
  }

  const final = Math.round(weightedSum / totalWeight);
  return {
    finalPercentage: final,
    letterGrade: percentageToLetter(final),
    breakdown,
  };
}
