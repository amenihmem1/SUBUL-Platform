export function formatMoney(amount: number, opts: { currency: string; locale?: string }): string {
  const locale =
    (opts.locale && typeof opts.locale === 'string' ? opts.locale : undefined) ??
    (typeof navigator !== 'undefined' ? navigator.language : 'en');

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: opts.currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback: currency code + amount
    return `${opts.currency} ${amount.toFixed(2)}`;
  }
}

/** Minor units from DB: TND = millimes, other supported currencies = cents. */
export function formatFromMinorUnits(
  amountMinor: number,
  currency: string,
  opts?: { locale?: string },
): string {
  const c = currency.toUpperCase();
  const divider = c === 'TND' ? 1000 : 100;
  return formatMoney(amountMinor / divider, { currency: c, locale: opts?.locale });
}

