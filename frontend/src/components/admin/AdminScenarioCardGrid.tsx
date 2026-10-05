import { Link } from "react-router-dom";
import {
  ArrowRight, BriefcaseBusiness, Bus, Clock3, HeartHandshake, Landmark,
  MessagesSquare, ReceiptText, ShoppingBag, Ticket, UsersRound, Utensils, WalletCards,
} from "lucide-react";
import type { Scenario } from "../../types/scenario";

const scenarioIcons = {
  shopping: ShoppingBag,
  "cinema-theatre-tickets": Ticket,
  "restaurant-ordering": Utensils,
  "public-transport": Bus,
  "atm-withdrawal": Landmark,
  "time-off-overwhelmed": BriefcaseBusiness,
  "online-bill-payment": ReceiptText,
  "weekly-spending-plan": WalletCards,
  "consoling-a-friend": HeartHandshake,
  "managing-delay-calmly": Clock3,
  "conflict-perspective-taking": MessagesSquare,
  "short-team-discussion": UsersRound,
};

const cardThemes = [
  "border-cyan-200 bg-cyan-50/75", "border-indigo-100 bg-indigo-50/65",
  "border-violet-100 bg-violet-50/65", "border-sky-200 bg-sky-50/70",
  "border-cyan-200 bg-cyan-50/75", "border-indigo-100 bg-indigo-50/65",
];

export type AdminScenarioCardLabels = { comingSoon: string; action: string };

export function AdminScenarioCardGrid({ scenarios, routes, labels, translateScenario }: {
  scenarios: Scenario[];
  routes: Record<string, string>;
  labels: AdminScenarioCardLabels;
  translateScenario: (scenario: Scenario) => { title: string; description: string };
}) {
  return <div className="mt-8 grid gap-[22px] md:grid-cols-2 xl:grid-cols-3">
    {scenarios.map((scenario) => {
      const translated = translateScenario(scenario);
      const number = Number(scenario.id).toString().padStart(2, "0");
      const path = routes[scenario.slug];
      const available = Boolean(path);
      const Icon = scenarioIcons[scenario.slug as keyof typeof scenarioIcons] ?? MessagesSquare;
      const theme = cardThemes[(Number(scenario.id) - 1) % cardThemes.length];
      return <article key={scenario.id}
        className={`group relative flex min-h-[300px] flex-col overflow-hidden rounded-[22px] border p-6 transition duration-300 motion-reduce:transform-none motion-reduce:transition-none ${theme} ${available ? "border-cyan-400 bg-cyan-50/95 shadow-[0_18px_38px_-22px_rgba(45,216,216,0.55)] hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-[0_26px_52px_-22px_rgba(48,41,146,0.38)]" : "opacity-[0.88] hover:-translate-y-1 hover:border-indigo-200 hover:bg-white/95 hover:opacity-100 hover:shadow-[0_24px_48px_-22px_rgba(48,41,146,0.3)]"}`}>
        <span className={`pointer-events-none absolute right-5 top-1 font-display text-[5.6rem] font-extrabold leading-none transition-colors duration-300 ${available ? "text-cyan-200/65 group-hover:text-cyan-200" : "text-white/80 group-hover:text-cyan-100/90"}`} aria-hidden="true">{number}</span>
        <div className="relative z-10">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl border transition duration-300 motion-reduce:transform-none ${available ? "border-white/90 bg-white text-[#302992] shadow-md group-hover:-rotate-3 group-hover:border-[#302992] group-hover:bg-[#302992] group-hover:text-white group-hover:shadow-lg" : "border-white/80 bg-white/65 text-[#302992] group-hover:-rotate-3 group-hover:border-[#302992] group-hover:bg-[#302992] group-hover:text-white group-hover:shadow-md"}`}>
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className={`max-w-[85%] font-display text-lg font-bold leading-[1.35] ${available ? "text-[#1d1a5e]" : "text-[#555478]"}`}>{translated.title}</h2>
          <p className={`mt-3 text-sm leading-[1.65] ${available ? "text-[#4f4e70]" : "text-[#77758f]"}`}>{translated.description}</p>
        </div>
        {available ? <Link to={path} className="landing-primary-action group/action mt-auto inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2" aria-label={`${labels.action}: ${translated.title}`}>
          {labels.action}<ArrowRight className="h-4 w-4 transition-transform group-hover/action:translate-x-1" aria-hidden="true" />
        </Link> : <span className="mt-auto inline-flex min-h-[50px] items-center justify-center rounded-full border border-white/90 bg-white/55 px-5 py-3 text-sm font-bold text-[#85839c]">{labels.comingSoon}</span>}
      </article>;
    })}
  </div>;
}
