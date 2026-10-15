import type { Meal } from "../../lib/restaurantState";

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

export type WaiterState = "idle" | "speaking" | "listening" | "success";
/** Original SVG avatar. Only its mouth moves, and only during actual speech. */
export function RestaurantStaff({ state = "idle", className = "" }: { state?: WaiterState; className?: string }) {
  return <svg viewBox="0 0 200 260" aria-hidden="true" data-waiter-state={state} className={`restaurant-waiter ${className}`}>
    <path d="M30 260v-93q0-52 70-52t70 52v93" fill="#465878" />
    <path d="M75 122l25 20 25-20 16 138H59z" fill="#f7fafc" />
    <path d="M65 170h70v90H65z" fill="#638582" /><path d="M70 135v43m60-43v43" stroke="#638582" strokeWidth="9" />
    <path d="M80 128l20 14-13 15-14-26m47-3l-20 14 13 15 14-26" fill="#d8e7e6" />
    <rect x="87" y="100" width="26" height="30" rx="10" fill="#dbaa83" />
    <ellipse cx="100" cy="72" rx="37" ry="43" fill="#e9bd98" />
    <path d="M63 70V53q0-32 36-32 42 0 40 45-20-7-29-23-17 25-47 27" fill="#514438" />
    <circle cx="86" cy="76" r="3" fill="#343549" /><circle cx="114" cy="76" r="3" fill="#343549" />
    {state === "listening" && <path d="M80 66l11-2m18 0l11 2" fill="none" stroke="#514438" strokeWidth="2" strokeLinecap="round" />}
    {state === "speaking" ? <ellipse className="restaurant-waiter-mouth" cx="100" cy="96" rx="9" ry="7" fill="#825a4a" />
      : <path d={state === "success" ? "M86 93q14 14 28 0" : "M88 94q12 10 24 0"} fill="none" stroke="#825a4a" strokeWidth="3" strokeLinecap="round" />}
    <rect x="85" y="185" width="30" height="18" rx="4" fill="#b8d7d2" />
  </svg>;
}

export function FoodIllustration({ meal }: { meal: Meal }) {
  return <svg viewBox="0 0 180 120" aria-hidden="true" className="mx-auto h-28 w-full max-w-48">
    <ellipse cx="90" cy="101" rx="65" ry="9" fill="#e5ecec" />
    {meal === "soup" ? <>
      <ellipse cx="90" cy="65" rx="59" ry="20" fill="#e6d3b1" />
      <path d="M31 65q4 43 59 43t59-43" fill="#88bdbb" />
      <ellipse cx="90" cy="65" rx="51" ry="14" fill="#dba466" />
      <path d="M67 62l8 4m19-7l7 3m10 6l6-3" stroke="#6d905c" strokeWidth="5" strokeLinecap="round" />
    </> : <>
      <ellipse cx="90" cy="76" rx="69" ry="30" fill="#f9fbfc" stroke="#b7d3d4" strokeWidth="3" />
      <ellipse cx="90" cy="76" rx="52" ry="22" fill="#edf3ef" />
      {meal === "pasta" && <><path d="M52 71q14-20 28-3t28-3 22 9M51 81q14-20 28-3t28-3 22 9M62 62q14-20 28-3t28-3" fill="none" stroke="#e2bd6b" strokeWidth="9" strokeLinecap="round" /><ellipse cx="90" cy="70" rx="18" ry="10" fill="#bf7761" /><path d="M87 67q5-14 14-9-1 11-14 9" fill="#75926c" /></>}
      {meal === "chicken" && <><path d="M53 74q0-32 41-27 39 6 28 33-12 19-49 13-20-3-20-19" fill="#d6a075" /><path d="M73 57l-8 25m27-28l-8 30m29-22l-7 23" stroke="#986e4d" strokeWidth="4" strokeLinecap="round" /><circle cx="132" cy="77" r="10" fill="#92ae73" /><circle cx="133" cy="88" r="7" fill="#a2bc84" /></>}
      {meal === "salad" && <><path d="M49 75q-5-22 18-14 9-24 23-7 25-20 28 4 26-2 13 22-14 19-34 9-28 17-48-14" fill="#97b582" /><path d="M63 72l19 10m9-21l7 25m17-18l-9 15" stroke="#c8d8b6" strokeWidth="4" strokeLinecap="round" /><circle cx="71" cy="66" r="8" fill="#c68170" /><circle cx="114" cy="82" r="8" fill="#c68170" /><circle cx="92" cy="76" r="7" fill="#d6c27a" /></>}
    </>}
  </svg>;
}
