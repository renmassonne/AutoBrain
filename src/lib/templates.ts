/**
 * Offline fallback list for the /api/suggestions endpoint. This is only used
 * when OPENAI_API_KEY is unset or the API call fails, so the UI never renders
 * an empty "Quick start" area. For the normal happy path, suggestions are
 * AI-curated by the API.
 */
export interface Suggestion {
  title: string;
  description: string;
  prompt: string;
  category: string;
  icon: string;
}

export const FALLBACK_SUGGESTIONS: Suggestion[] = [
  {
    title: "Monthly Budget",
    description: "Track income vs expenses and see your savings",
    prompt:
      "I want to calculate my monthly expenses (rent, groceries, transport, utilities, entertainment) and see how much I can save from my income. Show a bar chart comparing all categories.",
    category: "Finance",
    icon: "Wallet",
  },
  {
    title: "BMI Calculator",
    description: "Calculate body mass index from height and weight",
    prompt:
      "Build a BMI calculator where I enter my weight in kg and height in cm, and it calculates my BMI. Include a slider for weight (40-200kg) and height (120-220cm).",
    category: "Health",
    icon: "Heart",
  },
  {
    title: "Loan Payment",
    description: "Estimate monthly payments for a loan",
    prompt:
      "I need a loan payment estimator. Inputs: loan amount, annual interest rate (slider 0-30%), and loan term in years (slider 1-30). Calculate the monthly payment and total amount paid. Show a pie chart.",
    category: "Finance",
    icon: "Landmark",
  },
  {
    title: "Unit Converter",
    description: "Convert between metric and imperial units",
    prompt:
      "Build a unit converter with an input for kilometers that shows the equivalent in miles, meters, feet, and inches. Use number inputs with sensible defaults.",
    category: "Daily life",
    icon: "ArrowLeftRight",
  },
  {
    title: "Tip Calculator",
    description: "Split a restaurant bill with tip",
    prompt:
      "Create a tip calculator: enter the bill amount, tip percentage (slider 0-30%), and number of people. Calculate tip amount, total with tip, and amount per person.",
    category: "Daily life",
    icon: "Receipt",
  },
  {
    title: "Savings Goal",
    description: "How long until you reach your savings target",
    prompt:
      "I want a savings goal tracker. Enter target amount, current savings, and monthly contribution. Calculate months remaining, years remaining, and total interest if I assume 5% annual returns.",
    category: "Finance",
    icon: "PiggyBank",
  },
];
