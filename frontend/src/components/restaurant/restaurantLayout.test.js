import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("./restaurant.css", import.meta.url), "utf8");
const stableLayout = styles.slice(styles.indexOf("/* The open book fixes all three columns"));
const sharedLayout = styles.slice(styles.indexOf("/* One fixed waiter column"));

describe("restaurant ordering layout", () => {
  it("keeps two food columns and scrolls only the open book item area", () => {
    expect(styles).toMatch(/\.restaurant-menu-book-stage \.restaurant-menu-items \{\s*display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(stableLayout).toMatch(/\.restaurant-menu-book-stage \.restaurant-menu-items \{[^}]*overflow-y: auto/);
    expect(stableLayout).toContain("scrollbar-width: thin");
    expect(stableLayout).toContain(".restaurant-menu-book-stage .restaurant-menu-left-page { height: 100%; overflow: hidden; }");
    expect(stableLayout).toContain("height: clamp(600px, calc(100vh - 150px), 760px)");
  });
  it("stacks on narrow screens and disables order motion when requested", () => {
    expect(styles).toContain("@media (max-width: 480px)");
    expect(stableLayout).toContain(".restaurant-menu-book-stage .restaurant-menu-items { grid-template-columns: 1fr; }");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain(".restaurant-order-slot-value, .restaurant-menu-book-stage .restaurant-menu-items { animation: none; }");
  });
  it("keeps a compact caption, reserved conversation area, and larger visual menu choices", () => {
    expect(styles).toContain(".restaurant-future-conversation-space");
    expect(styles).toContain(".restaurant-page:not(.restaurant-introduction) .restaurant-waiter-caption");
    expect(stableLayout).toContain(".restaurant-menu-book-stage .restaurant-menu-item-image-frame { height: 112px; }");
    expect(styles).toContain(".restaurant-order-area { position: relative;");
    expect(styles).toContain(".restaurant-order-area, .restaurant-order-selected-item { animation: none; }");
    expect(stableLayout).toContain("background-image: none; background-repeat: no-repeat;");
    expect(sharedLayout).toContain("grid-template-columns: minmax(0, 31%) minmax(0, 69%);");
    expect(sharedLayout).toContain(".restaurant-content-with-order { display: grid; grid-template-columns: minmax(210px, 26%) minmax(0, 74%); }");
    expect(stableLayout).toContain(".restaurant-order-remove { border-color: #dfaba9; background: #fff4f1; color: #a4312a;");
  });
  it("uses one uncropped waiter layout and menu-paper surfaces throughout", () => {
    expect(sharedLayout).toContain("left: 50%; bottom: 130px; width: 280px; height: 360px;");
    expect(sharedLayout).toContain(".restaurant-page:not(.restaurant-introduction) .restaurant-waiter-frame { object-fit: contain; object-position: bottom center; }");
    expect(sharedLayout).toContain(".restaurant-menu-book-stage .restaurant-menu-book-image { height: 360px;");
    expect(sharedLayout).toContain(".restaurant-voice-controls { display: inline-flex;");
    expect(sharedLayout).toContain(".restaurant-scene-footer { display: flex; justify-content: flex-end;");
    expect(sharedLayout).toContain(".restaurant-content-surface {");
    expect(sharedLayout).toContain(".restaurant-payment-choice-card, .restaurant-payment-choice-cash { border-color: #c9b394; background: #fff8eb;");
    expect(sharedLayout).toContain(".restaurant-receipt { max-width: 700px; margin: 0 auto; border: 1px solid #bda988; background: #fff9ec;");
    expect(sharedLayout).toContain(".restaurant-review-stage, .restaurant-receipt-stage { height: auto; align-self: start; margin: 18px auto; }");
    expect(sharedLayout).toContain(".restaurant-review-stage .restaurant-review-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }");
    expect(sharedLayout).toContain(".restaurant-receipt-stage { width: calc(100% - 36px); max-width: 650px; overflow: visible; }");
    expect(sharedLayout).toContain(".restaurant-receipt .restaurant-payment-order-line { min-height: 0;");
    expect(sharedLayout).toContain(".restaurant-receipt-actions { max-width: 580px; margin: 18px auto 0;");
  });
});
