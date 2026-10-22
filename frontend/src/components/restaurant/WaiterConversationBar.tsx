import { Mic, Send } from "lucide-react";
import type { LanguageCode } from "../../i18n";
import { restaurantOrderTranslations } from "../../lib/restaurantOrderTranslations";

export function WaiterConversationBar({ language }: { language: LanguageCode }) {
  const text = restaurantOrderTranslations[language];
  return <div className="restaurant-conversation-bar" aria-label={text.conversationLabel}>
    <label htmlFor="restaurant-future-message">{text.conversationLabel}</label>
    <div className="restaurant-conversation-controls">
      <input id="restaurant-future-message" type="text" placeholder={text.conversationPlaceholder} disabled aria-describedby="restaurant-conversation-soon" />
      <button type="button" disabled aria-label={text.microphoneLabel} aria-describedby="restaurant-conversation-soon"><Mic aria-hidden="true" size={19} /></button>
      <button type="button" className="restaurant-conversation-send" disabled aria-label={text.sendLabel} aria-describedby="restaurant-conversation-soon"><Send aria-hidden="true" size={16} /><span>{text.sendLabel}</span></button>
    </div>
    <p id="restaurant-conversation-soon">{text.conversationSoon}</p>
  </div>;
}
