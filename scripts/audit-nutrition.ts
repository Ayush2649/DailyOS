import { INDIAN_FOOD_DATABASE } from "../lib/ai/nutrition/database";

console.log("=== FULL NUTRITION AUDIT TABLE ===");

for (const item of INDIAN_FOOD_DATABASE) {
  const p = item.per100g.proteinG;
  const c = item.per100g.carbsG;
  const f = item.per100g.fatG;
  const fib = item.per100g.fiberG;
  const rep = item.per100g.calories;
  const atwater = 4 * p + 4 * c + 9 * f;
  const diff = rep - atwater;
  const pct = (diff / rep) * 100;
  console.log(`${item.name} | rep: ${rep} | atw: ${atwater.toFixed(1)} | diff: ${diff.toFixed(1)} (${pct.toFixed(1)}%) | defaultUnit: ${item.defaultUnit} (${item.gramsPerDefaultUnit}g)`);
}

