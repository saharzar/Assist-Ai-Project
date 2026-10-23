import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CircleHelp, ClipboardCheck, CreditCard, Keyboard, MessageCircle, Mic } from "lucide-react";
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
  const flow = [
    { label: text.introFlow[0], detail: text.introFlowDetails[0], Icon: BookOpen },
    { label: text.introFlow[1], detail: text.introFlowDetails[1], Icon: MessageCircle },
    { label: text.introFlow[2], detail: text.introFlowDetails[2], Icon: ClipboardCheck },
    { label: text.introFlow[3], detail: text.introFlowDetails[3], Icon: CreditCard },
  ];
  return <section className="catalogue-page restaurant-intro-page" aria-labelledby="restaurant-intro-title">
    <div className="restaurant-intro-container">
      <header className="restaurant-intro-header">
        <span className="restaurant-intro-accent" aria-hidden="true"><i /><i /></span>
        <p className="restaurant-intro-eyebrow">ASSIST-AI</p>
        <h1 id="restaurant-intro-title" className="landing-title-accent font-display">{text.title}</h1>
        <p>{text.intro}</p>
      </header>

      <div className="restaurant-intro-hero">
        <div className="restaurant-intro-preview">
          <div className="restaurant-intro-visual" aria-hidden="true">
            <img src={restaurantCounter} alt="" className="restaurant-intro-background" />
            <RestaurantStaff state={speaking ? "speaking" : "idle"} className="restaurant-intro-waiter" />
            <img src={restaurantCounter} alt="" className="restaurant-intro-counter" />
          </div>
          <div className="restaurant-intro-preview-footer">
            <ScenarioStartButton to="/scenario/restaurant-ordering/run" className="restaurant-intro-start">
              {text.start}<ArrowRight className="h-6 w-6" aria-hidden="true" />
            </ScenarioStartButton>
          </div>
        </div>
        <div className="restaurant-intro-assistant"><AtmSetupVoiceAssistant scenario="restaurant" language={language} message={text.introSpoken} modeLabel={text.title} speechRequestId={0} onSpeakingChange={setSpeaking} /></div>
      </div>

      <section className="restaurant-intro-section" aria-labelledby="restaurant-intro-steps-heading">
        <h2 id="restaurant-intro-steps-heading" className="font-display">{text.introSteps}</h2>
        <ol className="restaurant-intro-steps">
          {flow.map(({ label, detail, Icon }, index) => <li key={label}>
            <span className="restaurant-intro-step-icon" aria-hidden="true"><Icon size={25} strokeWidth={1.9} /></span>
            <span className="restaurant-intro-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <span className="restaurant-intro-step-detail">{detail}</span>
          </li>)}
        </ol>
        <p className="restaurant-intro-note"><CircleHelp size={20} aria-hidden="true" />{text.introNote}</p>
      </section>

      <section className="restaurant-intro-section restaurant-intro-response" aria-labelledby="restaurant-intro-response-heading">
        <h2 id="restaurant-intro-response-heading" className="font-display">{text.introWaysToOrder}</h2>
        <div className="restaurant-intro-response-options">
          <div><span className="restaurant-intro-response-icon" aria-hidden="true"><Keyboard size={26} /></span><div><h3>{text.introTypeTitle}</h3><p>{text.introTypeBody}</p></div></div>
          <div><span className="restaurant-intro-response-icon" aria-hidden="true"><Mic size={26} /></span><div><h3>{text.introVoiceTitle}</h3><p>{text.introVoiceBody}</p></div></div>
        </div>
      </section>

      <div className="restaurant-intro-bottom"><Link to="/scenarios" className="restaurant-intro-back"><ArrowLeft size={20} aria-hidden="true" />{text.back}</Link></div>
    </div>
  </section>;
}
