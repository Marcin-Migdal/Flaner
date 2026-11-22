import type { TFunction } from "i18next";
import type {
  BudgetCategory,
  BudgetCategoryIcon,
  BudgetCategoryTree,
  BudgetCategoryType,
  ChartColorIndex,
} from "../../api/budget";

type DefaultCategory = {
  /** Key under `budget.defaultCategories.<type>` in the planning namespace. */
  key: string;
  icon: BudgetCategoryIcon;
  color: ChartColorIndex;
  subcategories?: string[];
};

// The default list (#159). Seeded once in the active UI language; plain user text afterwards.
const EXPENSE: DefaultCategory[] = [
  {
    key: "shopping",
    icon: "shopping-bag",
    color: 8,
    subcategories: [
      "groceries", "newspapers", "householdChemicals", "hobbies", "clothing", "electronics", "alcohol", "other",
    ],
  },
  { key: "kidsEducation", icon: "smile", color: 3, subcategories: ["education", "childcare", "toys", "other"] },
  {
    key: "home",
    icon: "house",
    color: 2,
    subcategories: ["mortgage", "furniture", "garden", "renovation", "services", "other"],
  },
  {
    key: "personal",
    icon: "user",
    color: 6,
    subcategories: [
      "cosmetics", "ticketsTaxis", "sport", "barber", "spa", "pets", "loanRepayment", "loanGiven", "lifeInsurance",
      "other",
    ],
  },
  {
    key: "taxes",
    icon: "landmark",
    color: 1,
    subcategories: ["incomeTax", "vat", "socialSecurity", "capitalGains", "other"],
  },
  { key: "gifts", icon: "gift", color: 5, subcategories: ["charity", "gift"] },
  {
    key: "bills",
    icon: "receipt",
    color: 4,
    subcategories: [
      "streaming", "electricity", "gas", "internet", "mobile", "landline", "tv", "water", "sewage", "homeInsurance",
      "rent", "bankFees", "other",
    ],
  },
  {
    key: "entertainment",
    icon: "music",
    color: 7,
    subcategories: ["concerts", "restaurants", "filmsGames", "booksCinema", "trips", "gambling", "other"],
  },
  {
    key: "car",
    icon: "car",
    color: 2,
    subcategories: ["carWash", "fuel", "parking", "service", "fees", "insurance", "other"],
  },
  {
    key: "business",
    icon: "briefcase",
    color: 8,
    subcategories: ["marketing", "legal", "hosting", "office", "goods", "other"],
  },
  {
    key: "health",
    icon: "heart-pulse",
    color: 6,
    subcategories: ["tests", "medicines", "dentist", "eyeDoctor", "doctor", "insurance", "other"],
  },
  { key: "savings", icon: "piggy-bank", color: 3 },
];

const INCOME: DefaultCategory[] = [
  { key: "salary", icon: "wallet", color: 3 },
  { key: "bonus", icon: "award", color: 1 },
  { key: "services", icon: "handshake", color: 2 },
  { key: "sales", icon: "tag", color: 5 },
  { key: "giftReceived", icon: "gift", color: 8 },
  { key: "investments", icon: "trending-up", color: 6 },
  { key: "interest", icon: "percent", color: 7 },
  { key: "refund", icon: "undo-2", color: 4 },
  { key: "cashDeposit", icon: "banknote", color: 2 },
  { key: "other", icon: "circle-ellipsis", color: 1 },
];

const build = (
  categories: DefaultCategory[],
  type: BudgetCategoryType,
  t: TFunction,
  newId: () => string,
): BudgetCategory[] =>
  categories.map(({ key, icon, color, subcategories = [] }) => {
    // Income categories are flat: the key itself is the name
    const base = `budget.defaultCategories.${type}.${key}`;
    return {
      id: newId(),
      name: t(type === "expense" ? `${base}.name` : base),
      icon,
      color,
      subcategories: subcategories.map((sub) => ({ id: newId(), name: t(`${base}.subcategories.${sub}`) })),
    };
  });

/** The default category tree in the language of `t` (planning namespace), with fresh ids. */
export const buildDefaultCategoryTree = (
  t: TFunction,
  newId: () => string = () => crypto.randomUUID(),
): BudgetCategoryTree => ({
  expense: build(EXPENSE, "expense", t, newId),
  income: build(INCOME, "income", t, newId),
});
