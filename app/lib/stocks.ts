export type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  sector: string;
};

export const stocks: Stock[] = [
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    price: 3200,
    change: -5.2,
    sector: "IT",
  },
  {
    symbol: "INFY",
    name: "Infosys",
    price: 1523,
    change: 2.1,
    sector: "IT",
  },
  {
    symbol: "WIPRO",
    name: "Wipro",
    price: 412,
    change: 0.4,
    sector: "IT",
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    price: 2876,
    change: -0.3,
    sector: "Energy",
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    price: 1742,
    change: 0.8,
    sector: "Banking",
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank",
    price: 1298,
    change: 1.2,
    sector: "Banking",
  },
  {
    symbol: "GOLDETF",
    name: "ICICI Gold ETF",
    price: 74,
    change: 1.7,
    sector: "Gold",
  },
];