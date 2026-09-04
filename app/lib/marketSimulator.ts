import { Stock } from "./stocks";

const BASE_PRICES: Record<string, number> = {
  TCS: 3421,
  INFY: 1523,
  WIPRO: 412,
  RELIANCE: 2876,
  HDFCBANK: 1742,
  ICICIBANK: 1298,
  GOLDETF: 74,
};

export function simulateMarket(
  currentStocks: Stock[],
  tick: number
): Stock[] {
  return currentStocks.map((stock) => {
    const basePrice = BASE_PRICES[stock.symbol] ?? stock.price;

    /*
     * Small normal market movement.
     * This keeps related stocks moving somewhat together.
     */
    const marketMovement =
      (Math.random() - 0.5) * 0.4;

    let movement = marketMovement;

    /*
     * Occasionally make TCS move more strongly.
     * This creates a useful demo scenario for
     * SmartWatch's unusual-activity detection.
     */
    if (stock.symbol === "TCS") {
      const demoCycle = tick % 6;

      if (demoCycle === 3 || demoCycle === 4) {
        movement = -1.2 - Math.random() * 0.8;
      }
    }

    /*
     * Banking stocks move together.
     */
    if (
      stock.symbol === "HDFCBANK" ||
      stock.symbol === "ICICIBANK"
    ) {
      movement +=
        (Math.random() - 0.5) * 0.15;
    }

    /*
     * IT stocks generally move together.
     */
    if (
      stock.symbol === "INFY" ||
      stock.symbol === "WIPRO"
    ) {
      movement +=
        (Math.random() - 0.5) * 0.15;
    }

    const newPrice =
      stock.price * (1 + movement / 100);

    const totalChange =
      ((newPrice - basePrice) / basePrice) * 100;

    return {
      ...stock,
      price: Number(newPrice.toFixed(2)),
      change: Number(totalChange.toFixed(2)),
    };
  });
}