/**
 * lib/ai/nutrition/database.ts
 * 
 * Deterministic Indian Food Composition Database.
 * Nutrition estimates are based on standard Indian food composition references
 * and serving-size assumptions.
 * 
 * Macro values are defined per 100g of prepared/cooked food:
 * - calories (kcal)
 * - proteinG (g)
 * - carbsG (g)
 * - fatG (g)
 * - fiberG (g)
 */

export interface FoodCompositionItem {
  id: string;
  name: string;
  aliases: string[];
  category:
    | "flatbread"
    | "rice_grain"
    | "dal_legume"
    | "curry_sabzi"
    | "dairy_accompaniment"
    | "south_indian"
    | "snack_street"
    | "sweet_dessert"
    | "meat_egg";
  defaultUnit: string;
  gramsPerDefaultUnit: number;
  per100g: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  verified: boolean;
}

export const INDIAN_FOOD_DATABASE: FoodCompositionItem[] = [
  // ── FLATBREADS ─────────────────────────────────────────────────────────────
  {
    id: "roti_plain",
    name: "Plain Roti",
    aliases: ["roti", "plain roti", "chapati", "phulka", "fulka", "atta roti", "whole wheat roti"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 30, // 1 medium standard roti = 30g
    per100g: { calories: 267, proteinG: 10.0, carbsG: 50.0, fatG: 3.3, fiberG: 6.7 }, // ~80 kcal / 3g P / 15g C / 1g F / 2g Fib per 30g
    verified: true,
  },
  {
    id: "roti_ghee",
    name: "Roti with Ghee",
    aliases: ["ghee roti", "roti with ghee", "ghee chapati", "butter roti"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 35,
    per100g: { calories: 314, proteinG: 8.6, carbsG: 42.9, fatG: 10.0, fiberG: 5.7 }, // ~110 kcal per pc
    verified: true,
  },
  {
    id: "paratha_plain",
    name: "Plain Paratha",
    aliases: ["plain paratha", "tawa paratha", "layered paratha", "parantha", "triangle paratha"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 60, // 1 medium plain paratha = ~60g
    per100g: { calories: 250, proteinG: 5.0, carbsG: 36.7, fatG: 10.0, fiberG: 4.2 }, // ~150 kcal per pc
    verified: true,
  },
  {
    id: "paratha_aloo",
    name: "Aloo Paratha",
    aliases: ["aloo paratha", "alu paratha", "potato paratha", "stuffed aloo paratha"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 100, // 1 stuffed aloo paratha = ~100g
    per100g: { calories: 200, proteinG: 5.0, carbsG: 28.0, fatG: 8.0, fiberG: 3.5 }, // ~200 kcal per pc
    verified: true,
  },
  {
    id: "paratha_paneer",
    name: "Paneer Paratha",
    aliases: ["paneer paratha", "cottage cheese paratha", "stuffed paneer paratha"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 110,
    per100g: { calories: 236, proteinG: 9.1, carbsG: 25.5, fatG: 10.0, fiberG: 2.7 }, // ~260 kcal per pc
    verified: true,
  },
  {
    id: "paratha_gobi",
    name: "Gobi Paratha",
    aliases: ["gobi paratha", "gobhi paratha", "cauliflower paratha"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 100,
    per100g: { calories: 185, proteinG: 4.5, carbsG: 26.0, fatG: 7.0, fiberG: 4.0 }, // ~185 kcal per pc
    verified: true,
  },
  {
    id: "puri",
    name: "Puri",
    aliases: ["puri", "poori", "fried bread"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 35,
    per100g: { calories: 357, proteinG: 6.5, carbsG: 45.0, fatG: 17.0, fiberG: 3.5 }, // ~125 kcal per pc
    verified: true,
  },
  {
    id: "bhatura",
    name: "Bhatura",
    aliases: ["bhatura", "bhatoora"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 90,
    per100g: { calories: 320, proteinG: 7.0, carbsG: 45.0, fatG: 13.0, fiberG: 2.0 }, // ~290 kcal per pc
    verified: true,
  },
  {
    id: "naan_plain",
    name: "Plain Naan",
    aliases: ["naan", "plain naan", "tandoori naan"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 90,
    per100g: { calories: 290, proteinG: 8.5, carbsG: 50.0, fatG: 6.0, fiberG: 3.0 }, // ~260 kcal per pc
    verified: true,
  },
  {
    id: "naan_butter",
    name: "Butter Naan",
    aliases: ["butter naan", "naan with butter"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 100,
    per100g: { calories: 330, proteinG: 8.0, carbsG: 48.0, fatG: 12.0, fiberG: 2.8 }, // ~330 kcal per pc
    verified: true,
  },
  {
    id: "thepla",
    name: "Thepla",
    aliases: ["thepla", "methi thepla"],
    category: "flatbread",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 40,
    per100g: { calories: 280, proteinG: 8.0, carbsG: 44.0, fatG: 8.5, fiberG: 5.0 }, // ~112 kcal per pc
    verified: true,
  },

  // ── RICE & GRAIN DISHES ────────────────────────────────────────────────────
  {
    id: "rice_steamed",
    name: "Steamed Rice",
    aliases: ["steamed rice", "plain rice", "white rice", "chawal", "boiled rice"],
    category: "rice_grain",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 150, // 1 standard katori = 150g
    per100g: { calories: 130, proteinG: 2.7, carbsG: 28.7, fatG: 0.3, fiberG: 0.7 }, // ~195 kcal per 150g
    verified: true,
  },
  {
    id: "rice_jeera",
    name: "Jeera Rice",
    aliases: ["jeera rice", "cumin rice", "zeera rice"],
    category: "rice_grain",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 150,
    per100g: { calories: 147, proteinG: 2.7, carbsG: 28.7, fatG: 2.0, fiberG: 0.7 }, // ~220 kcal per 150g
    verified: true,
  },
  {
    id: "biryani_veg",
    name: "Vegetable Biryani",
    aliases: ["vegetable biryani", "veg biryani", "dum veg biryani", "veg pulao", "vegetable pulao", "pulao"],
    category: "rice_grain",
    defaultUnit: "plate",
    gramsPerDefaultUnit: 200,
    per100g: { calories: 140, proteinG: 3.0, carbsG: 22.5, fatG: 4.0, fiberG: 2.0 }, // ~280 kcal per 200g
    verified: true,
  },
  {
    id: "biryani_chicken",
    name: "Chicken Biryani",
    aliases: ["chicken biryani", "dum chicken biryani", "hyderabadi chicken biryani"],
    category: "rice_grain",
    defaultUnit: "plate",
    gramsPerDefaultUnit: 250,
    per100g: { calories: 152, proteinG: 8.8, carbsG: 18.0, fatG: 4.8, fiberG: 1.2 }, // ~380 kcal per 250g
    verified: true,
  },
  {
    id: "khichdi_dal",
    name: "Dal Khichdi",
    aliases: ["dal khichdi", "khichdi", "khichrri", "moong dal khichdi"],
    category: "rice_grain",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 200,
    per100g: { calories: 105, proteinG: 3.5, carbsG: 18.0, fatG: 2.0, fiberG: 1.5 }, // ~210 kcal per 200g
    verified: true,
  },
  {
    id: "poha_indori",
    name: "Indori Poha",
    aliases: ["indori poha", "poha", "kanda poha", "flattened rice"],
    category: "rice_grain",
    defaultUnit: "plate",
    gramsPerDefaultUnit: 150,
    per100g: { calories: 120, proteinG: 2.0, carbsG: 24.0, fatG: 2.0, fiberG: 2.0 }, // ~180 kcal per 150g
    verified: true,
  },

  // ── DALS & LEGUMES ────────────────────────────────────────────────────────
  {
    id: "dal_toor",
    name: "Toor Dal (Yellow Dal)",
    aliases: ["dal", "yellow dal", "toor dal", "arhar dal", "tadka dal", "dal tadka", "dal fry"],
    category: "dal_legume",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 180,
    per100g: { calories: 83, proteinG: 5.5, carbsG: 13.8, fatG: 1.1, fiberG: 2.8 }, // ~150 kcal per 180g
    verified: true,
  },
  {
    id: "dal_makhani",
    name: "Dal Makhani",
    aliases: ["dal makhani", "dal makhni", "black dal", "maa ki dal"],
    category: "dal_legume",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 180,
    per100g: { calories: 133, proteinG: 6.1, carbsG: 13.9, fatG: 6.7, fiberG: 3.3 }, // ~240 kcal per 180g
    verified: true,
  },
  {
    id: "rajma",
    name: "Rajma Masala",
    aliases: ["rajma", "rajma masala", "red kidney beans curry"],
    category: "dal_legume",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 200,
    per100g: { calories: 105, proteinG: 6.0, carbsG: 16.0, fatG: 2.0, fiberG: 4.0 }, // ~210 kcal per 200g
    verified: true,
  },
  {
    id: "chole",
    name: "Chole (Chana Masala)",
    aliases: ["chole", "chana masala", "chhole", "punjabi chole", "chickpea curry"],
    category: "dal_legume",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 200,
    per100g: { calories: 115, proteinG: 6.5, carbsG: 17.5, fatG: 2.5, fiberG: 4.5 }, // ~230 kcal per 200g
    verified: true,
  },
  {
    id: "sambar",
    name: "Sambar",
    aliases: ["sambar", "sambhar"],
    category: "dal_legume",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 150,
    per100g: { calories: 57, proteinG: 2.7, carbsG: 9.3, fatG: 1.0, fiberG: 2.0 }, // ~85 kcal per 150g
    verified: true,
  },

  // ── VEGETABLES & CURRIES ──────────────────────────────────────────────────
  {
    id: "sabzi_mixed",
    name: "Mixed Vegetable Sabzi",
    aliases: ["sabzi", "subzi", "mixed vegetable sabzi", "mix veg", "dry sabzi", "tarkari"],
    category: "curry_sabzi",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 150,
    per100g: { calories: 80, proteinG: 2.0, carbsG: 10.0, fatG: 3.5, fiberG: 2.7 }, // ~120 kcal per 150g
    verified: true,
  },
  {
    id: "aloo_gobi",
    name: "Aloo Gobi",
    aliases: ["aloo gobi", "aloo gobhi", "potato cauliflower curry"],
    category: "curry_sabzi",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 150,
    per100g: { calories: 85, proteinG: 2.0, carbsG: 12.0, fatG: 3.5, fiberG: 2.5 }, // ~128 kcal per 150g
    verified: true,
  },
  {
    id: "bhindi_masala",
    name: "Bhindi Masala",
    aliases: ["bhindi", "bhindi masala", "okra sabzi"],
    category: "curry_sabzi",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 130,
    per100g: { calories: 88, proteinG: 2.2, carbsG: 9.5, fatG: 4.5, fiberG: 3.5 }, // ~114 kcal per 130g
    verified: true,
  },
  {
    id: "paneer_palak",
    name: "Palak Paneer",
    aliases: ["palak paneer", "saag paneer", "spinach cottage cheese"],
    category: "curry_sabzi",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 180,
    per100g: { calories: 155, proteinG: 8.9, carbsG: 5.6, fatG: 11.1, fiberG: 2.2 }, // ~280 kcal per 180g
    verified: true,
  },
  {
    id: "paneer_bhurji",
    name: "Paneer Bhurji",
    aliases: ["paneer bhurji", "scrambled paneer"],
    category: "curry_sabzi",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 150,
    per100g: { calories: 193, proteinG: 13.3, carbsG: 3.3, fatG: 14.7, fiberG: 0.7 }, // ~290 kcal per 150g
    verified: true,
  },
  {
    id: "paneer_butter_masala",
    name: "Paneer Butter Masala",
    aliases: ["paneer butter masala", "paneer makhani", "shahi paneer"],
    category: "curry_sabzi",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 180,
    per100g: { calories: 194, proteinG: 7.8, carbsG: 6.7, fatG: 15.6, fiberG: 1.1 }, // ~350 kcal per 180g
    verified: true,
  },
  {
    id: "chicken_curry",
    name: "Chicken Curry",
    aliases: ["chicken curry", "tari chicken", "homestyle chicken curry"],
    category: "meat_egg",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 200,
    per100g: { calories: 140, proteinG: 14.0, carbsG: 3.0, fatG: 8.0, fiberG: 0.8 }, // ~280 kcal per 200g
    verified: true,
  },

  // ── SOUTH INDIAN SPECIALTIES ──────────────────────────────────────────────
  {
    id: "cheela_besan",
    name: "Besan Cheela",
    aliases: ["besan cheela", "besan chilla", "gram flour pancake", "besan puda"],
    category: "south_indian",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 70, // 1 medium cheela = ~70g
    per100g: { calories: 200, proteinG: 8.5, carbsG: 25.7, fatG: 7.1, fiberG: 4.3 }, // ~140 kcal per pc
    verified: true,
  },
  {
    id: "cheela_moong",
    name: "Moong Dal Cheela",
    aliases: ["moong dal cheela", "moong dal chilla", "moong cheela"],
    category: "south_indian",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 70,
    per100g: { calories: 185, proteinG: 10.0, carbsG: 24.0, fatG: 5.7, fiberG: 5.7 }, // ~130 kcal per pc
    verified: true,
  },
  {
    id: "idli_plain",
    name: "Plain Idli",
    aliases: ["idli", "plain idli", "steamed idli"],
    category: "south_indian",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 50, // 1 standard idli = 50g
    per100g: { calories: 130, proteinG: 4.0, carbsG: 28.0, fatG: 0.4, fiberG: 2.0 }, // ~65 kcal per pc
    verified: true,
  },
  {
    id: "medu_vada",
    name: "Medu Vada",
    aliases: ["medu vada", "vada", "urad dal vada"],
    category: "south_indian",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 50,
    per100g: { calories: 300, proteinG: 8.0, carbsG: 32.0, fatG: 16.0, fiberG: 4.0 }, // ~150 kcal per pc
    verified: true,
  },
  {
    id: "dosa_plain",
    name: "Plain Dosa",
    aliases: ["plain dosa", "sada dosa", "dosa"],
    category: "south_indian",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 100,
    per100g: { calories: 170, proteinG: 4.0, carbsG: 29.0, fatG: 4.0, fiberG: 2.0 }, // ~170 kcal per pc
    verified: true,
  },
  {
    id: "dosa_masala",
    name: "Masala Dosa",
    aliases: ["masala dosa", "potato masala dosa"],
    category: "south_indian",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 180, // with aloo filling
    per100g: { calories: 172, proteinG: 3.3, carbsG: 25.0, fatG: 6.7, fiberG: 2.2 }, // ~310 kcal per pc
    verified: true,
  },
  {
    id: "uttapam_onion",
    name: "Onion Uttapam",
    aliases: ["onion uttapam", "uttapam", "plain uttapam"],
    category: "south_indian",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 150,
    per100g: { calories: 150, proteinG: 3.5, carbsG: 26.0, fatG: 3.5, fiberG: 2.5 }, // ~225 kcal per pc
    verified: true,
  },

  // ── DAIRY & ACCOMPANIMENTS ────────────────────────────────────────────────
  {
    id: "curd_plain",
    name: "Plain Curd (Dahi)",
    aliases: ["curd", "dahi", "plain curd", "plain yogurt", "yogurt"],
    category: "dairy_accompaniment",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 100,
    per100g: { calories: 60, proteinG: 3.1, carbsG: 4.5, fatG: 3.1, fiberG: 0.0 }, // ~60 kcal per 100g
    verified: true,
  },
  {
    id: "raita_boondi",
    name: "Boondi Raita",
    aliases: ["boondi raita", "dahi boondi"],
    category: "dairy_accompaniment",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 120,
    per100g: { calories: 75, proteinG: 2.8, carbsG: 6.5, fatG: 4.0, fiberG: 0.5 }, // ~90 kcal per 120g
    verified: true,
  },
  {
    id: "chutney_coconut",
    name: "Coconut Chutney",
    aliases: ["coconut chutney", "nariyal chutney", "white chutney"],
    category: "dairy_accompaniment",
    defaultUnit: "tablespoon / small dip",
    gramsPerDefaultUnit: 30,
    per100g: { calories: 180, proteinG: 2.5, carbsG: 8.0, fatG: 16.0, fiberG: 3.5 }, // ~54 kcal per 30g
    verified: true,
  },
  {
    id: "salad_kachumber",
    name: "Kachumber Salad",
    aliases: ["kachumber", "kachumber salad", "salad", "green salad", "cucumber salad"],
    category: "dairy_accompaniment",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 80,
    per100g: { calories: 25, proteinG: 1.0, carbsG: 4.5, fatG: 0.2, fiberG: 1.5 }, // ~20 kcal per 80g
    verified: true,
  },

  // ── SWEETS & DESSERTS ─────────────────────────────────────────────────────
  {
    id: "halwa_sooji",
    name: "Sooji Halwa (Rava Sheera)",
    aliases: ["sooji halwa", "suji halwa", "rava sheera", "sheera", "kesari bath"],
    category: "sweet_dessert",
    defaultUnit: "bowl / katori",
    gramsPerDefaultUnit: 100,
    per100g: { calories: 280, proteinG: 4.0, carbsG: 42.0, fatG: 11.0, fiberG: 1.0 }, // ~280 kcal per 100g
    verified: true,
  },
  {
    id: "gulab_jamun",
    name: "Gulab Jamun",
    aliases: ["gulab jamun"],
    category: "sweet_dessert",
    defaultUnit: "piece",
    gramsPerDefaultUnit: 50,
    per100g: { calories: 300, proteinG: 4.5, carbsG: 50.0, fatG: 10.0, fiberG: 0.5 }, // ~150 kcal per pc
    verified: true,
  },

  // ── COMBINATION THALIS ───────────────────────────────────────────────────
  {
    id: "dal_chawal",
    name: "Dal Chawal",
    aliases: ["dal chawal", "dal and rice", "dal rice"],
    category: "rice_grain",
    defaultUnit: "plate",
    gramsPerDefaultUnit: 330, // 180g dal + 150g rice
    per100g: { calories: 105, proteinG: 4.2, carbsG: 20.6, fatG: 0.8, fiberG: 1.6 }, // ~345 kcal per 330g
    verified: true,
  },
  {
    id: "rajma_chawal",
    name: "Rajma Chawal",
    aliases: ["rajma chawal", "rajma with rice"],
    category: "rice_grain",
    defaultUnit: "plate",
    gramsPerDefaultUnit: 350, // 200g rajma + 150g rice
    per100g: { calories: 115, proteinG: 4.6, carbsG: 22.5, fatG: 1.0, fiberG: 2.1 }, // ~405 kcal per 350g
    verified: true,
  },
  {
    id: "roti_sabzi_raita",
    name: "Roti Sabzi Raita",
    aliases: ["roti sabzi raita", "roti with sabzi and raita"],
    category: "flatbread",
    defaultUnit: "plate",
    gramsPerDefaultUnit: 330, // 2 rotis (60g) + 150g sabzi + 120g raita
    per100g: { calories: 112, proteinG: 3.4, carbsG: 16.3, fatG: 3.7, fiberG: 2.1 }, // ~370 kcal per plate
    verified: true,
  },
  {
    id: "dal_bhat_tarkari",
    name: "Dal Bhat Tarkari",
    aliases: ["dal bhat tarkari", "dal bhat", "dal bhat with sabzi"],
    category: "rice_grain",
    defaultUnit: "plate",
    gramsPerDefaultUnit: 450, // 150g rice + 180g dal + 120g tarkari
    per100g: { calories: 98, proteinG: 3.8, carbsG: 18.0, fatG: 1.4, fiberG: 1.8 }, // ~440 kcal per plate
    verified: true,
  },
];

