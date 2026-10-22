import type { Drink, Meal } from "../../lib/restaurantState";

export function RestaurantSetting() {
  return <svg viewBox="0 0 600 120" aria-hidden="true" className="mb-5 h-24 w-full rounded-2xl bg-[#f3f7f6] sm:h-28">
    <rect x="40" y="16" width="110" height="70" rx="8" fill="#dcecee" stroke="#9ebcbd" strokeWidth="3" />
    <path d="M95 16v70M40 51h110" stroke="#9ebcbd" strokeWidth="3" />
    <path d="M240 82v29m120-29v29" stroke="#899798" strokeWidth="7" strokeLinecap="round" />
    <rect x="220" y="67" width="160" height="15" rx="7" fill="#c5ac91" />
    <ellipse cx="300" cy="67" rx="26" ry="6" fill="#fff" /><rect x="341" y="47" width="14" height="19" rx="3" fill="#aec7cd" />
    <path d="M486 91v-43" stroke="#8da383" strokeWidth="4" /><path d="M486 70q-38-35-12-39 25 1 12 39m0-10q35-34 36-7-4 19-36 7" fill="#9ab28b" />
    <path d="M466 89h40l-6 26h-28z" fill="#b3bfc5" />
  </svg>;
}

export { RestaurantStaff, type WaiterState } from "./RestaurantStaff";

export function FoodIllustration({ meal }: { meal: Meal }) {
  // New menu entries stay text-only until their supplied images are available.
  if (["steak", "wrap", "lasagna", "risotto", "quinoaSalad", "chickenSalad", "avocadoSalad", "pastaSalad", "chickenSoup", "pumpkinSoup", "minestrone", "broccoliSoup"].includes(meal)) return null;
  return <svg viewBox="0 0 180 120" aria-hidden="true" className="mx-auto h-28 w-full max-w-48">
    <ellipse cx="90" cy="101" rx="65" ry="9" fill="#e5ecec" />
    {["soup", "lentil", "vegetableSoup", "tomatoSoup", "mushroomSoup"].includes(meal) ? <>
      <ellipse cx="90" cy="65" rx="59" ry="20" fill="#e6d3b1" />
      <path d="M31 65q4 43 59 43t59-43" fill="#88bdbb" />
      <ellipse cx="90" cy="65" rx="51" ry="14" fill={meal === "lentil" ? "#c79252" : meal === "vegetableSoup" ? "#a6ba79" : meal === "tomatoSoup" ? "#c97562" : meal === "mushroomSoup" ? "#aa9278" : "#dba466"} />
      <path d="M67 62l8 4m19-7l7 3m10 6l6-3" stroke="#6d905c" strokeWidth="5" strokeLinecap="round" />
      {meal === "tomatoSoup" && <><circle cx="89" cy="64" r="6" fill="#dfac8e" /><path d="M81 58q8-8 16 0" fill="none" stroke="#63865f" strokeWidth="3" /></>}
      {meal === "mushroomSoup" && <><path d="M73 62q6-10 14 0m-11 0v6m23-12q7-9 14 1m-10 0v7" fill="none" stroke="#e8d9bc" strokeWidth="4" strokeLinecap="round" /></>}
    </> : <>
      <ellipse cx="90" cy="76" rx="69" ry="30" fill="#f9fbfc" stroke="#b7d3d4" strokeWidth="3" />
      <ellipse cx="90" cy="76" rx="52" ry="22" fill="#edf3ef" />
      {meal === "pasta" && <><path d="M52 71q14-20 28-3t28-3 22 9M51 81q14-20 28-3t28-3 22 9M62 62q14-20 28-3t28-3" fill="none" stroke="#e2bd6b" strokeWidth="9" strokeLinecap="round" /><ellipse cx="90" cy="70" rx="18" ry="10" fill="#bf7761" /><path d="M87 67q5-14 14-9-1 11-14 9" fill="#75926c" /></>}
      {meal === "chicken" && <><path d="M53 74q0-32 41-27 39 6 28 33-12 19-49 13-20-3-20-19" fill="#d6a075" /><path d="M73 57l-8 25m27-28l-8 30m29-22l-7 23" stroke="#986e4d" strokeWidth="4" strokeLinecap="round" /><circle cx="132" cy="77" r="10" fill="#92ae73" /><circle cx="133" cy="88" r="7" fill="#a2bc84" /></>}
      {meal === "salad" && <><path d="M49 75q-5-22 18-14 9-24 23-7 25-20 28 4 26-2 13 22-14 19-34 9-28 17-48-14" fill="#97b582" /><path d="M63 72l19 10m9-21l7 25m17-18l-9 15" stroke="#c8d8b6" strokeWidth="4" strokeLinecap="round" /><circle cx="71" cy="66" r="8" fill="#c68170" /><circle cx="114" cy="82" r="8" fill="#c68170" /><circle cx="92" cy="76" r="7" fill="#d6c27a" /></>}
      {meal === "pizza" && <><circle cx="90" cy="73" r="37" fill="#d7a66f" /><circle cx="90" cy="73" r="32" fill="#d68267" /><circle cx="90" cy="73" r="27" fill="#f0d18e" /><circle cx="72" cy="64" r="6" fill="#b86d59" /><circle cx="104" cy="61" r="6" fill="#b86d59" /><circle cx="92" cy="87" r="6" fill="#b86d59" /><path d="M78 84l6-5m22 0 6-5M86 55l5 5" stroke="#789568" strokeWidth="4" strokeLinecap="round" /></>}
      {meal === "rice" && <><ellipse cx="90" cy="75" rx="44" ry="21" fill="#e8d5a4" /><path d="M58 73q14-10 25-3t21-2 19 3" fill="none" stroke="#f6e8c4" strokeWidth="7" strokeLinecap="round" /><circle cx="73" cy="62" r="7" fill="#97b582" /><circle cx="109" cy="77" r="7" fill="#d28765" /><circle cx="95" cy="59" r="6" fill="#97b582" /></>}
      {meal === "caesar" && <><ellipse cx="90" cy="75" rx="43" ry="19" fill="#9eba82" /><path d="M55 75l17-17 8 17 11-19 9 22 14-17 10 16" fill="none" stroke="#c8d8b6" strokeWidth="9" strokeLinecap="round" /><path d="M68 82l10-4m18-10 9-4m7 19 8-4" stroke="#f1e1ac" strokeWidth="6" strokeLinecap="round" /></>}
      {meal === "tomatoCucumber" && <><ellipse cx="90" cy="75" rx="45" ry="20" fill="#a5be8d" /><circle cx="67" cy="72" r="12" fill="#c98170" /><circle cx="100" cy="81" r="12" fill="#c98170" /><circle cx="113" cy="62" r="11" fill="#c98170" /><circle cx="83" cy="61" r="10" fill="#8dac8a" /></>}
      {meal === "burger" && <><path d="M47 68q4-29 43-29t43 29z" fill="#d9a86e" /><path d="M49 70h82" stroke="#6e9a67" strokeWidth="8" strokeLinecap="round" /><path d="M51 78h78" stroke="#875942" strokeWidth="11" strokeLinecap="round" /><path d="M53 85h74" stroke="#efc77a" strokeWidth="7" strokeLinecap="round" /><path d="M49 91q41 11 82 0" fill="none" stroke="#d5a168" strokeWidth="9" strokeLinecap="round" /><circle cx="75" cy="52" r="2" fill="#f6e3b4" /><circle cx="101" cy="48" r="2" fill="#f6e3b4" /></>}
      {meal === "fish" && <><path d="M51 76q23-30 54-13l23-17-2 24 2 24-23-17Q75 95 51 76z" fill="#d4a477" stroke="#ab7f59" strokeWidth="3" /><circle cx="71" cy="72" r="3" fill="#493926" /><path d="M88 63q12 13 0 27m12-26q12 13 0 25" fill="none" stroke="#f1d4ad" strokeWidth="3" /><circle cx="125" cy="83" r="7" fill="#a0b783" /></>}
      {meal === "greekSalad" && <><ellipse cx="90" cy="75" rx="46" ry="21" fill="#a6c28c" /><circle cx="68" cy="68" r="9" fill="#c98170" /><circle cx="110" cy="79" r="10" fill="#c98170" /><rect x="79" y="58" width="14" height="11" rx="2" fill="#f3eddc" transform="rotate(-15 86 63)" /><rect x="91" y="77" width="13" height="10" rx="2" fill="#f3eddc" /><circle cx="69" cy="84" r="5" fill="#5f614a" /><circle cx="116" cy="62" r="5" fill="#5f614a" /></>}
      {meal === "tunaSalad" && <><ellipse cx="90" cy="75" rx="47" ry="20" fill="#a2bd87" /><path d="M61 73q9-18 19-8t17-6 24 10q-17 18-36 13T61 73" fill="#d7b6a0" /><path d="M68 70l15 8m14-12 13 8" stroke="#eee0cc" strokeWidth="4" strokeLinecap="round" /><circle cx="59" cy="80" r="6" fill="#c98170" /><circle cx="115" cy="82" r="6" fill="#c98170" /></>}
    </>}
  </svg>;
}

/** Original glass illustrations using the food cards' soft colors and shadow. */
export function DrinkIllustration({ drink }: { drink: Exclude<Drink, "none"> }) {
  const juice = drink === "juice";
  return <svg viewBox="0 0 180 120" aria-hidden="true" data-drink-illustration={drink} className="mx-auto h-28 w-full max-w-48">
    <ellipse cx="90" cy="105" rx="43" ry="8" fill="#e5ecec" />
    <path d="M60 24h60l-7 76q-23 10-46 0z" fill="#f9fbfc" stroke="#b7d3d4" strokeWidth="3" strokeLinejoin="round" />
    <path d="M64 51h52l-5 46q-21 8-42 0z" fill={juice ? "#e2bd6b" : "#b8d7d2"} />
    <ellipse cx="90" cy="51" rx="26" ry="5" fill={juice ? "#edcf8b" : "#dcecee"} />
    <path d="M70 32l4 53" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    {juice ? <>
      <circle cx="125" cy="83" r="18" fill="#e6d3b1" stroke="#dba466" strokeWidth="3" />
      <circle cx="125" cy="83" r="12" fill="#edcf8b" />
      <path d="M125 71v24m-12-12h24m-20-8l16 16m0-16l-16 16" stroke="#fff4d9" strokeWidth="2" />
    </> : <>
      <rect x="78" y="46" width="13" height="12" rx="3" fill="#f9fbfc" opacity=".75" />
      <rect x="94" y="55" width="12" height="12" rx="3" fill="#f9fbfc" opacity=".65" />
    </>}
  </svg>;
}
