export function PaymentMethodIllustration({ method, currencySymbol }: { method: "card" | "cash"; currencySymbol: string }) {
  return <svg viewBox="0 0 240 160" aria-hidden="true" className="restaurant-method-art">
    <ellipse cx="120" cy="144" rx="88" ry="9" fill="#e5ecec" />
    {method === "card" ? <>
      <g transform="rotate(-8 99 82)">
        <rect x="63" y="19" width="76" height="118" rx="12" fill="#638582" />
        <rect x="72" y="29" width="58" height="38" rx="5" fill="#dcecee" />
        <path d="M97 38q14 10 0 20m6-24q21 14 0 28" fill="none" stroke="#638582" strokeWidth="3" strokeLinecap="round" />
        {[0, 1, 2].map((row) => [0, 1, 2].map((column) => <rect key={`${row}-${column}`} x={74 + column * 18} y={79 + row * 15} width="12" height="9" rx="3" fill="#d8e7e6" />))}
        <rect x="110" y="124" width="14" height="6" rx="3" fill="#97b582" />
      </g>
      <rect x="143" y="65" width="75" height="48" rx="8" fill="#b8d7d2" stroke="#88bdbb" strokeWidth="2" />
      <rect x="153" y="78" width="16" height="12" rx="3" fill="#e2bd6b" />
      <path d="M153 101h40" stroke="#f9fbfc" strokeWidth="4" strokeLinecap="round" />
    </> : <>
      <rect x="49" y="39" width="143" height="72" rx="9" fill="#c8d8b6" transform="rotate(-8 120 75)" />
      <rect x="43" y="57" width="151" height="73" rx="9" fill="#97b582" />
      <rect x="54" y="67" width="129" height="53" rx="6" fill="none" stroke="#dce8cf" strokeWidth="3" />
      <ellipse cx="119" cy="94" rx="23" ry="21" fill="#dce8cf" />
      <text x="119" y="104" textAnchor="middle" fontSize="29" fontFamily="sans-serif" fill="#75926c">{currencySymbol}</text>
      <circle cx="70" cy="94" r="5" fill="#dce8cf" /><circle cx="168" cy="94" r="5" fill="#dce8cf" />
    </>}
  </svg>;
}

export function PaymentTerminalIllustration({ label, approved = false }: { label: string; approved?: boolean }) {
  return <svg viewBox="0 0 240 260" aria-hidden="true" className="restaurant-pos-art">
    <ellipse cx="120" cy="245" rx="88" ry="11" fill="#51443820" />
    <path d="M98 181h44l21 49H77z" fill="#465878" /><rect x="67" y="225" width="106" height="15" rx="7" fill="#638582" />
    <rect x="35" y="12" width="170" height="190" rx="21" fill="#638582" stroke="#465878" strokeWidth="3" />
    <rect x="48" y="27" width="144" height="65" rx="9" fill={approved ? "#dce8cf" : "#edf3ef"} />
    <text x="120" y="58" textAnchor="middle" fontSize="12" fontFamily="sans-serif" fontWeight="700" fill="#285c51">{label}</text>
    {approved ? <path className="restaurant-terminal-check" d="M106 73l9 8 18-17" fill="none" stroke="#28785c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      : <path d="M114 69q10 5 0 10m6-13q16 8 0 16" fill="none" stroke="#638582" strokeWidth="2" strokeLinecap="round" />}
    {[0, 1, 2].map((row) => [0, 1, 2].map((column) => <rect key={`${row}-${column}`} x={58 + column * 45} y={108 + row * 24} width="34" height="15" rx="5" fill="#d8e7e6" />))}
    <rect x="58" y="180" width="34" height="9" rx="4" fill="#c68170" /><rect x="103" y="180" width="34" height="9" rx="4" fill="#e2bd6b" /><rect x="148" y="180" width="34" height="9" rx="4" fill="#97b582" />
  </svg>;
}

export function PaymentCardIllustration() {
  return <svg viewBox="0 0 180 115" aria-hidden="true" className="restaurant-card-art">
    <rect x="8" y="12" width="164" height="94" rx="13" fill="#b8d7d2" stroke="#638582" strokeWidth="3" />
    <path d="M10 39h160" stroke="#88bdbb" strokeWidth="16" />
    <rect x="26" y="60" width="27" height="21" rx="4" fill="#e2bd6b" /><path d="M39 60v21m-13-10h27" stroke="#b59a58" strokeWidth="2" />
    <path d="M120 61q15 10 0 20m6-24q23 14 0 28" fill="none" stroke="#465878" strokeWidth="3" strokeLinecap="round" />
    <path d="M26 94h66" stroke="#f9fbfc" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}

export function CashPaymentIllustration({ amount }: { amount: string }) {
  return <svg viewBox="0 0 240 160" aria-hidden="true" className="restaurant-payment-art">
    <ellipse cx="120" cy="137" rx="82" ry="9" fill="#e5ecec" />
    <g>
      <rect x="49" y="39" width="143" height="72" rx="9" fill="#c8d8b6" transform="rotate(-8 120 75)" />
      <rect x="43" y="57" width="151" height="73" rx="9" fill="#97b582" />
      <rect x="54" y="67" width="129" height="53" rx="6" fill="none" stroke="#dce8cf" strokeWidth="3" />
      <rect x="76" y="65" width="87" height="57" rx="4" fill="#edf3ef" />
      <text x="120" y="99" textAnchor="middle" fontSize="17" fontFamily="sans-serif" fontWeight="700" fill="#285c51">{amount}</text>
      <circle cx="64" cy="94" r="5" fill="#dce8cf" /><circle cx="173" cy="94" r="5" fill="#dce8cf" />
    </g>
  </svg>;
}
