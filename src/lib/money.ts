export function moneyToCents(value: string | number) {
  const valueAsString = String(value).trim();

  const isNegative = valueAsString.startsWith("-");

  const unsignedValue = isNegative
    ? valueAsString.slice(1)
    : valueAsString;

  const [wholePart = "0", decimalPart = ""] =
    unsignedValue.split(".");

  const cents =
    BigInt(wholePart || "0") * BigInt(100) +
    BigInt(decimalPart.padEnd(2, "0").slice(0, 2) || "0");

  return isNegative ? -cents : cents;
}

export function formatMoneyFromCents(cents: bigint) {
  const isNegative = cents < BigInt(0);

  const absoluteCents = isNegative ? -cents : cents;

  const wholePart = absoluteCents / BigInt(100);
  const decimalPart = absoluteCents % BigInt(100);

  const formattedWholePart = wholePart
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const formattedDecimalPart = decimalPart
    .toString()
    .padStart(2, "0");

  return `${isNegative ? "-" : ""}${formattedWholePart}.${formattedDecimalPart}`;
}