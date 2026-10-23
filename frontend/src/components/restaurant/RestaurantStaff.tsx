import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getClosedMouth,
  getRestaurantMouth,
  subscribeRestaurantMouth,
  type MouthState,
} from "../../services/restaurantSpeechAudio";
import closedEyesOpen from "../../assets/restaurant-staff/closed_openeyes.png";
import slightEyesOpen from "../../assets/restaurant-staff/slightopen_openeyes.png";
import openEyesOpen from "../../assets/restaurant-staff/open_openeyes.png";
import wideEyesOpen from "../../assets/restaurant-staff/wideopen_openeyes.png";
import extraEyesOpen from "../../assets/restaurant-staff/extraopen_openeyes.png";
import roundedEyesOpen from "../../assets/restaurant-staff/roundedvowel_openeyes.png";
import closedBlink from "../../assets/restaurant-staff/closed_blink.png";
import slightBlink from "../../assets/restaurant-staff/slightopen_blink.png";

export type WaiterState = "idle" | "speaking" | "listening" | "success";
type RestaurantFrameKey = `${MouthState}-${"open" | "closed"}`;
const blinkDuration = () => 140 + Math.floor(Math.random() * 41);
const firstSpeechBlinkDelay = () => 650 + Math.floor(Math.random() * 551);
const nextSpeechBlinkDelay = () => 2000;
const nextSilentBlinkDelay = () => 4000;

export const getRestaurantFrameKey = (mouth: MouthState, eyesClosed: boolean): RestaurantFrameKey => `${mouth}-${eyesClosed ? "closed" : "open"}`;

export const restaurantFrames: Record<RestaurantFrameKey, string> = {
  "closed-open": closedEyesOpen,
  "closed-closed": closedBlink,
  "slight-open": slightEyesOpen,
  "slight-closed": slightBlink,
  "open-open": openEyesOpen,
  "open-closed": openEyesOpen,
  "wide-open": wideEyesOpen,
  "wide-closed": wideEyesOpen,
  "extra-open": extraEyesOpen,
  "extra-closed": extraEyesOpen,
  "rounded-open": roundedEyesOpen,
  "rounded-closed": roundedEyesOpen,
};

/** Preloaded, consistently aligned portrait frames. Speech blinks briefly use the slight-open mouth frame. */
export function RestaurantStaff({ state = "idle", className = "" }: { state?: WaiterState; className?: string }) {
  const audioMouth = useSyncExternalStore(subscribeRestaurantMouth, getRestaurantMouth, getClosedMouth);
  // The audio signal is authoritative even if the speaking callback reaches
  // React a frame later (notably for short cached payment confirmations).
  const mouth: MouthState = audioMouth;
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    setBlink(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let nextTimer = 0;
    let blinkTimer = 0;
    const scheduleBlink = (delay: number) => {
      nextTimer = window.setTimeout(() => {
        setBlink(true);
        blinkTimer = window.setTimeout(() => setBlink(false), blinkDuration());
        scheduleBlink(state === "speaking" ? nextSpeechBlinkDelay() : nextSilentBlinkDelay());
      }, delay);
    };
    scheduleBlink(state === "speaking" ? firstSpeechBlinkDelay() : nextSilentBlinkDelay());
    return () => {
      window.clearTimeout(nextTimer);
      window.clearTimeout(blinkTimer);
    };
  }, [state]);

  const displayedMouth: MouthState = blink && state === "speaking" && mouth !== "closed" ? "slight" : mouth;
  const frameKey = getRestaurantFrameKey(displayedMouth, blink);

  return <span aria-hidden="true" data-waiter-state={state} data-mouth-state={displayedMouth} data-eyes-state={blink ? "closed" : "open"} className={`restaurant-waiter ${className}`}>
    {Object.entries(restaurantFrames).map(([key, src]) => <img
      key={key}
      src={src}
      alt=""
      draggable={false}
      width={1086}
      height={1448}
      loading="eager"
      className="restaurant-waiter-frame"
      data-frame={key}
      aria-hidden="true"
      style={{ opacity: key === frameKey ? 1 : 0 }}
    />)}
  </span>;
}
