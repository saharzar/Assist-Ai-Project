import type { Dispatch, RefObject } from "react";
import menuCoverImage from "../../assets/restaurant-menu-cover.png";
import type { LanguageCode } from "../../i18n";
import { getRestaurantMenuItemPrice, restaurantMenuItems } from "../../lib/restaurantMenu";
import { getShortRestaurantMenuDescription } from "../../lib/restaurantMenuDescriptions";
import { getRestaurantMenuImage } from "../../lib/restaurantMenuImages";
import { restaurantMenuTranslations } from "../../lib/restaurantMenuTranslations";
import { formatRestaurantPrice } from "../../lib/restaurantPayment";
import { menuCategories, type MenuCategory, type RestaurantAction, type RestaurantState } from "../../lib/restaurantState";
import { restaurantTranslations } from "../../lib/restaurantTranslations";

export function RestaurantMenu({ state, language, dispatch, onSelect, headingRef }: {
  state: RestaurantState; language: LanguageCode; dispatch: Dispatch<RestaurantAction>;
  onSelect: (category: MenuCategory, id: string) => void; headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const text = restaurantTranslations[language];
  const menu = restaurantMenuTranslations[language];
  if (state.step === "menuCover" || state.step === "alternativeCover") return <div className="restaurant-menu-cover-wrap">
    <h2 ref={headingRef} tabIndex={-1} className="sr-only">{text.steps.menuCover}</h2>
    <button type="button" className="restaurant-menu-book" aria-label={menu.open} onClick={() => dispatch({ type: "openMenu" })}>
      <img className="restaurant-menu-book-image" src={menuCoverImage} alt="" aria-hidden="true" draggable={false} />
      <span className="restaurant-menu-book-action">{menu.open}</span>
    </button>
  </div>;

  const category = state.category;
  const items = restaurantMenuItems.filter((item) => item.category === category);
  return <div className="restaurant-menu-pages" data-menu-open="true">
    <div className="restaurant-menu-left-page">
      <p className="restaurant-menu-page-label">{menu.coverTitle}</p>
      <nav className="restaurant-menu-categories" aria-label={text.menu}>
        {menuCategories.map((option) => <button key={option} type="button" aria-current={category === option ? "page" : undefined}
          className="restaurant-menu-category" onClick={() => dispatch({ type: "category", category: option })}>{menu.categories[option]}</button>)}
      </nav>
    </div>
    <div className="restaurant-menu-right-page">
      <div className="restaurant-menu-header">
        <h2 ref={headingRef} tabIndex={-1} className="focus:outline-none">{text.menu}</h2>
        <button type="button" className="restaurant-menu-close" onClick={() => dispatch({ type: "closeMenu" })}>{menu.close}</button>
      </div>
      <p className="restaurant-menu-section-title">{menu.categories[category]}</p>
      <div key={category} className="restaurant-menu-items" role="region" tabIndex={0} aria-label={menu.categories[category]}>
        {items.map((item) => {
          const name = item.meal ? text.foods[item.meal] : menu.extras[item.id as keyof typeof menu.extras];
          const price = formatRestaurantPrice(getRestaurantMenuItemPrice(item, language), language);
          const unavailable = item.id === state.unavailable;
          const selected = state.order[category] === item.id;
          return <button key={item.id} type="button" disabled={unavailable} aria-pressed={selected}
            className={`restaurant-menu-item restaurant-menu-selectable ${selected ? "restaurant-menu-item-selected" : ""}`}
            onClick={() => onSelect(category, item.id)}>
            <span className="restaurant-menu-item-image-frame" data-category={category}><img className="restaurant-menu-item-image" src={getRestaurantMenuImage(item.id)} alt="" loading="lazy" decoding="async" draggable={false} /></span>
            <span className="restaurant-menu-item-main"><span className="restaurant-menu-item-name">{name}</span><span className="restaurant-menu-item-price">{price}</span></span>
            <span className="restaurant-menu-item-description">{getShortRestaurantMenuDescription(language, item.id)}</span>
            {unavailable && <span className="restaurant-menu-unavailable">{text.unavailableLabel}</span>}
            {selected && <span className="restaurant-menu-selected-mark" aria-hidden="true">✓</span>}
          </button>;
        })}
      </div>
    </div>
  </div>;
}
