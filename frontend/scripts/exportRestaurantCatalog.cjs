// Export the existing static Restaurant menu for backend validation and tool context.
// Run from the repository with: node frontend/scripts/exportRestaurantCatalog.cjs
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const lib = path.resolve(__dirname, "../src/lib");
const output = path.resolve(__dirname, "../../backend/app/data/restaurant_catalog.json");
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = fs.readFileSync(path.join(lib, `${name}.ts`), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  cache.set(name, module.exports);
  new Function("require", "module", "exports", code)((relative) => load(relative.replace(/^\.\//, "")), module, module.exports);
  return module.exports;
}

const { restaurantMenuItems, getRestaurantMenuItemPrice } = load("restaurantMenu");
const { restaurantTranslations } = load("restaurantTranslations");
const { restaurantMenuTranslations } = load("restaurantMenuTranslations");
const { restaurantMenuDescriptions } = load("restaurantMenuDescriptions");
const languages = ["en", "es", "de", "tr", "pt", "fr"];
const items = restaurantMenuItems.map((item) => ({
  id: item.id,
  category: item.category,
  prices: { EUR: getRestaurantMenuItemPrice(item, "en"), TRY: getRestaurantMenuItemPrice(item, "tr") },
  names: Object.fromEntries(languages.map((language) => [language, item.meal
    ? restaurantTranslations[language].foods[item.meal]
    : restaurantMenuTranslations[language].extras[item.id]])),
  descriptions: Object.fromEntries(languages.map((language) => [language, restaurantMenuDescriptions[language][item.id]])),
}));
fs.mkdirSync(path.dirname(output), { recursive: true });
const serialized = `${JSON.stringify({ items }, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== serialized) {
    throw new Error("Restaurant backend catalog is out of sync with the frontend menu.");
  }
} else {
  fs.writeFileSync(output, serialized);
}
