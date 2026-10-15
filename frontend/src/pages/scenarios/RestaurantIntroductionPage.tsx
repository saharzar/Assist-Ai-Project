import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import restaurantCounter from "../../assets/restaurant-counter.png";
import { RestaurantStaff } from "../../components/restaurant/RestaurantArt";
import { AtmSetupVoiceAssistant } from "../../components/atm/AtmSetupVoiceAssistant";
import { ScenarioStartButton } from "../../components/ScenarioStartButton";
import { useTranslation } from "../../i18n";
import { restaurantTranslations } from "../../lib/restaurantTranslations";
import "../../components/restaurant/restaurant.css";
import "../../components/restaurant/restaurant-introduction.css";

/** Preparation only. The menu and activity remain on the existing /run route. */
export function RestaurantIntroductionPage() {
  const { language } = useTranslation();
  const text = restaurantTranslations[language];
  const [speaking, setSpeaking] = useState(false);
  return <section className="restaurant-intro-page" aria-labelledby="restaurant-intro-title">
    <div className="restaurant-intro-layout">
      <div className="restaurant-intro-card">
        <div className="restaurant-intro-visual" aria-hidden="true">
          <img src={restaurantCounter} alt="" className="restaurant-intro-background" />
          <RestaurantStaff state={speaking ? "speaking" : "idle"} className="restaurant-intro-waiter" />
          <img src={restaurantCounter} alt="" className="restaurant-intro-counter" />
        </div>
        <div className="restaurant-intro-content">
          <p className="restaurant-intro-label">{text.introWelcome}</p>
          <h1 id="restaurant-intro-title" className="font-display text-3xl font-extrabold leading-tight text-[#1d1a5e]">{text.title}</h1>
          <div className="restaurant-intro-explanation">{text.intro.split("\n").map((line) => <p key={line}>{line}</p>)}</div>
          <ol className="restaurant-intro-steps" aria-label={text.introSteps}>
            {[text.steps.menu, text.introAlternative, text.introDrink, text.introPayment].map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span>{step}</li>)}
          </ol>
          <p className="restaurant-intro-ready">{text.introReady}</p>
          <ScenarioStartButton to="/scenario/restaurant-ordering/run" className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-[#079c6b] px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-emerald-950/15 hover:bg-[#057a55] focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-offset-2">
            {text.start}<ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </ScenarioStartButton>
          <Link to="/scenarios" className="restaurant-intro-back"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{text.back}</Link>
        </div>
      </div>
      <div className="restaurant-intro-assistant"><AtmSetupVoiceAssistant language={language} message={text.introSpoken} modeLabel={text.title} speechRequestId={0} onSpeakingChange={setSpeaking} /></div>
    </div>
  </section>;
}
