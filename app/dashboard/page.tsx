"use client";

import { useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { stocks } from "../lib/stocks";
import { simulateMarket } from "../lib/marketSimulator";
import { supabase } from "../lib/supabase";
import AddStockModal from "../components/AddStockModal";

type SnapshotChange = {
  symbol: string;
  previousPrice: number;
  currentPrice: number;
  change: number;
  priceDifference: number;
  estimatedProfitLoss: number;
  quantity: number;
  label: string;
};

type UnusualActivityData = {
  symbol: string;
  change: number;
  relatedAssets: {
    symbol: string;
    change: number;
    strength: number;
  }[];
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);

  const [sinceLastVisit, setSinceLastVisit] = useState<SnapshotChange[]>([]);
  const [holdings, setHoldings] = useState<
  Record<string, { buyPrice: number; quantity: number }>
>({});
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
const [awayDuration, setAwayDuration] = useState<string>("");
const visitTrackingStarted = useRef(false);
  const [simulatedStocks, setSimulatedStocks] = useState(stocks);
const [marketTick, setMarketTick] = useState(0);

  const [unusualActivity, setUnusualActivity] =
    useState<UnusualActivityData | null>(null);
    const [news, setNews] = useState<
  { title: string; source: string; url: string }[]
>([]);
const [showAllNews, setShowAllNews] = useState(false);

  const snapshotProcessed = useRef(false);
  const lastVisitPrices = useRef<Record<string, number>>({});
  useEffect(() => {
  const interval = setInterval(() => {
    setMarketTick((previousTick) => {
      const nextTick = previousTick + 1;

      setSimulatedStocks((currentStocks) =>
        simulateMarket(currentStocks, nextTick)
      );

      return nextTick;
    });
  }, 15000);

  return () => clearInterval(interval);
}, []);

  // --------------------------------------------------
  // LOAD USER
  // --------------------------------------------------

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);
    }

    loadUser();
  }, []);

  // --------------------------------------------------
  // LOAD USER WATCHLIST
  // --------------------------------------------------

  useEffect(() => {
    async function loadWatchlist() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          window.location.href = "/login";
          return;
        }

        const {
          data: watchlistData,
          error: watchlistError,
        } = await supabase
          .from("watchlists")
          .select("id")
          .eq("user_id", currentUser.id)
          .limit(1)
          .maybeSingle();

        if (watchlistError) {
          throw watchlistError;
        }

        if (!watchlistData) {
          setWatchlist([
            "TCS",
            "INFY",
            "WIPRO",
            "RELIANCE",
          ]);

          setLoaded(true);
          return;
        }

        const {
          data: savedStocks,
          error: stocksError,
        } = await supabase
          .from("watchlist_assets")
          .select(`
            asset_id,
            assets (
              symbol
            )
          `)
          .eq("watchlist_id", watchlistData.id);

        if (stocksError) {
          throw stocksError;
        }

        const symbols =
          savedStocks
            ?.map((item: any) => item.assets?.symbol)
            .filter(Boolean) || [];

        setWatchlist(symbols);
        setLoaded(true);
      } catch (error) {
        console.error(
          "Error loading watchlist:",
          error
        );

        setWatchlist([
          "TCS",
          "INFY",
          "WIPRO",
          "RELIANCE",
        ]);

        setLoaded(true);
      }
    }

    loadWatchlist();
  }, []);

// --------------------------------------------------
// LOAD USER HOLDINGS
// --------------------------------------------------

useEffect(() => {
  if (!user || !loaded) return;

  const currentUser = user;

  async function loadHoldings() {
    try {
      const { data, error } = await supabase
        .from("holdings")
        .select(`
          buy_price,
          quantity,
          assets (
            symbol
          )
        `)
        .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      const holdingsMap: Record<
        string,
        { buyPrice: number; quantity: number }
      > = {};

      data?.forEach((holding: any) => {
        const symbol = holding.assets?.symbol;

        if (!symbol) {
          return;
        }

        holdingsMap[symbol] = {
          buyPrice: Number(holding.buy_price),
          quantity: Number(holding.quantity),
        };
      });

      setHoldings(holdingsMap);
    } catch (error) {
      console.error(
        "Error loading holdings:",
        error
      );
    }
  }

  loadHoldings();
}, [user, loaded]);
// LOAD MARKET NEWS
useEffect(() => {
  async function loadNews() {
    try {
      const response = await fetch("/api/news");

      if (!response.ok) {
        throw new Error("Failed to load news");
      }

      const data = await response.json();

      const articles =
        data.articles?.filter(
          (article: any) =>
            article.title && article.title !== "[Removed]"
        ) || [];

      setNews(
        articles.map((article: any) => ({
          title: article.title,
          source: article.source?.name || "News",
          url: article.url,
        }))
      );
    } catch (error) {
      console.error("Error loading news:", error);
    }
  }

  loadNews();
}, []);

// --------------------------------------------------
// VISIT HISTORY
// --------------------------------------------------

useEffect(() => {
  if (!user || !loaded || visitTrackingStarted.current) {
    return;
  }

  const currentUser = user;

  visitTrackingStarted.current = true;

  async function startVisit() {
    try {
      const now = new Date();

      // Find the most recent completed visit.
      const { data: previousVisit, error: previousError } =
        await supabase
          .from("user_visit_history")
          .select("*")
          .eq("user_id", currentUser.id)
          .not("logout_at", "is", null)
          .order("logout_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (previousError) {
        throw previousError;
      }

      // Calculate exactly how long the user was away.
      if (previousVisit?.logout_at) {
        const logoutTime = new Date(previousVisit.logout_at);

        const differenceMs =
          now.getTime() - logoutTime.getTime();

        const totalMinutes = Math.max(
          0,
          Math.floor(differenceMs / (1000 * 60))
        );

        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor(
          (totalMinutes % 1440) / 60
        );
        const minutes = totalMinutes % 60;

        let duration = "";

        if (days > 0) {
          duration = `${days}d ${hours}h`;
        } else if (hours > 0) {
          duration = `${hours}h ${minutes}m`;
        } else {
          duration = `${minutes}m`;
        }

        setAwayDuration(duration);

        setLastCheckedAt(logoutTime);

        // Load the prices saved at the previous logout.
        if (previousVisit.stock_prices) {
          lastVisitPrices.current =
            previousVisit.stock_prices;
        }
      } else {
        setAwayDuration("");
        setLastCheckedAt(null);
      }

      // Create a NEW visit record for this login.
      const { data: newVisit, error: insertError } =
        await supabase
          .from("user_visit_history")
          .insert({
            user_id: user.id,
            user_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "User",
            user_email: currentUser.email,
            login_at: now.toISOString(),
            stock_prices: {},
          })
          .select("id")
          .single();

      if (insertError) {
        throw insertError;
      }

      // Remember which visit is currently active.
      if (newVisit?.id) {
        localStorage.setItem(
          `smartwatch_active_visit_${user.id}`,
          newVisit.id
        );
      }
    } catch (error) {
      console.error(
        "Error starting visit:",
        error
      );
    }
  }

  startVisit();
}, [user, loaded]);
  // --------------------------------------------------
  // WATCHLIST STOCK DATA
  // --------------------------------------------------

  const watchlistStocks = loaded
  ? simulatedStocks.filter((stock) =>
      watchlist.includes(stock.symbol)
    )
  : [];


  // --------------------------------------------------
  // UNUSUAL ACTIVITY ENGINE
  // --------------------------------------------------

 useEffect(() => {
  async function calculateUnusualActivity() {
    if (!loaded || watchlistStocks.length === 0) {
      return;
    }

    try {
      let bestActivity: {
        symbol: string;
        change: number;
        relatedAssets: {
          symbol: string;
          change: number;
          strength: number;
        }[];
      } | null = null;

      let highestDivergence = 0;

      // Check every stock in the user's watchlist
      for (const targetStock of watchlistStocks) {
        // Find this stock's asset
        const { data: targetAsset, error: assetError } =
          await supabase
            .from("assets")
            .select("id")
            .eq("symbol", targetStock.symbol)
            .maybeSingle();

        if (assetError || !targetAsset) {
          continue;
        }

        // Find assets historically related to this stock
        const {
          data: relationshipsData,
          error: relationshipError,
        } = await supabase
          .from("relationships")
          .select(`
            target_asset_id,
            relationship_type,
            strength
          `)
          .eq("source_asset_id", targetAsset.id)
          .eq("relationship_type", "historical_correlation");

        if (relationshipError || !relationshipsData) {
          continue;
        }

        const relatedAssets: {
          symbol: string;
          change: number;
          strength: number;
        }[] = [];

        for (const relationship of relationshipsData) {
          const { data: relatedAsset } = await supabase
            .from("assets")
            .select("symbol")
            .eq("id", relationship.target_asset_id)
            .maybeSingle();

          if (!relatedAsset) {
            continue;
          }

          // Only use assets that have current market data
          const relatedStock = stocks.find(
            (stock) => stock.symbol === relatedAsset.symbol
          );

          if (!relatedStock) {
            continue;
          }

          relatedAssets.push({
            symbol: relatedStock.symbol,
            change: relatedStock.change,
            strength: Number(relationship.strength || 0),
          });
        }

        if (relatedAssets.length === 0) {
          continue;
        }

        // Calculate weighted average movement
        const totalStrength = relatedAssets.reduce(
          (sum, asset) => sum + asset.strength,
          0
        );

        if (totalStrength === 0) {
          continue;
        }

        const relatedAverage =
          relatedAssets.reduce(
            (sum, asset) =>
              sum + asset.change * asset.strength,
            0
          ) / totalStrength;

        // Measure how far this stock moved from its related assets
        const divergence = Math.abs(
          targetStock.change - relatedAverage
        );

        // Keep the most unusual stock in the watchlist
        if (
          divergence >= 3 &&
          divergence > highestDivergence
        ) {
          highestDivergence = divergence;

          bestActivity = {
            symbol: targetStock.symbol,
            change: targetStock.change,
            relatedAssets,
          };
        }
      }

      setUnusualActivity(bestActivity);
    } catch (error) {
      console.error(
        "Error calculating unusual activity:",
        error
      );
    }
  }

  calculateUnusualActivity();
}, [loaded, watchlist, simulatedStocks]);
// --------------------------------------------------
// SINCE LAST VISIT COMPARISON
// --------------------------------------------------

useEffect(() => {
  if (
    !loaded ||
    watchlistStocks.length === 0 ||
    Object.keys(lastVisitPrices.current).length === 0
  ) {
    return;
  }

  const results: SnapshotChange[] = [];

  for (const stock of watchlistStocks) {
    const previousPrice =
      lastVisitPrices.current[stock.symbol];

    if (!previousPrice || previousPrice <= 0) {
      continue;
    }

    const currentPrice = stock.price;

    const priceDifference =
      currentPrice - previousPrice;

    const percentChange =
      (priceDifference / previousPrice) * 100;

    const roundedChange = Number(
      percentChange.toFixed(2)
    );

    const roundedPriceDifference = Number(
      priceDifference.toFixed(2)
    );

    const holding = holdings[stock.symbol];

    const buyPrice = holding?.buyPrice ?? 0;
    const quantity = holding?.quantity ?? 0;

    const profitLoss =
      buyPrice > 0 && quantity > 0
        ? (currentPrice - buyPrice) * quantity
        : 0;

    let label = "Little change";

    if (Math.abs(roundedChange) >= 3) {
      label = "Meaningful change";
    } else if (Math.abs(roundedChange) >= 1) {
      label = "Movement";
    }

    if (Math.abs(roundedChange) > 0.01) {
      results.push({
        symbol: stock.symbol,
        previousPrice,
        currentPrice,
        change: roundedChange,
        priceDifference: roundedPriceDifference,
        estimatedProfitLoss: Number(
          profitLoss.toFixed(2)
        ),
        quantity,
        label,
      });
    }
  }

  setSinceLastVisit(results);
}, [loaded, watchlist, simulatedStocks, holdings]);

  
  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Good morning 👋
            </h1>

            <p className="text-slate-500 mt-1">
              Here's what changed since you
              last checked.
            </p>
          </div>

          <div className="flex items-center gap-3">

            {user && (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">

                  {user.user_metadata
                    ?.avatar_url ? (
                    <img
                      src={
                        user.user_metadata
                          .avatar_url
                      }
                      alt="Profile"
                      className="h-9 w-9 rounded-full"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-600">
                      {(
                        user.user_metadata
                          ?.full_name ||
                        user.email ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">
                      {user.user_metadata
                        ?.full_name ||
                        user.user_metadata
                          ?.name ||
                        "User"}
                    </p>

                    <p className="text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                </div>

                <button
onClick={async () => {
  const currentUser = user;

  if (!currentUser) {
    return;
  }

  try {
      const activeVisitId = localStorage.getItem(
        `smartwatch_active_visit_${currentUser.id}`
      );

      if (activeVisitId && user) {
        const stockPrices: Record<string, number> = {};

        watchlistStocks.forEach((stock) => {
          stockPrices[stock.symbol] = stock.price;
        });

        const logoutTime = new Date().toISOString();

        const { error } = await supabase
          .from("user_visit_history")
          .update({
            logout_at: logoutTime,
            stock_prices: stockPrices,
          })
          .eq("id", activeVisitId)
          .eq("user_id", currentUser.id);

        if (error) {
          console.error(
            "Could not save logout visit:",
            error
          );
        } else {
          localStorage.removeItem(
            `smartwatch_active_visit_${currentUser.id}`
          );
        }
      }

      await supabase.auth.signOut();

      window.location.href = "/login";
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      await supabase.auth.signOut();
      window.location.href = "/login";
    }
  }}
  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
>
  Log Out
</button>
              </>
            )}

            <button
              className="rounded-xl bg-slate-900 text-white px-5 py-3 font-medium hover:bg-slate-800 transition"
              onClick={() =>
                setShowAddStock(true)
              }
            >
              + Add Stock
            </button>

          </div>
        </div>

{/* SINCE LAST VISIT */}

<section className="bg-white rounded-2xl p-6 shadow-sm mb-6">

  <div className="mb-5">
    <h2 className="text-xl font-semibold">
      What Changed While You Were Away
    </h2>

    {awayDuration && (
      <p className="mt-1 text-sm font-medium text-slate-500">
        You were away for {awayDuration}
      </p>
    )}

    {lastCheckedAt && (
      <p className="mt-1 text-xs text-slate-400">
        Last logout:{" "}
        {lastCheckedAt.toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    )}

    <p className="text-sm text-slate-500 mt-2">
      {sinceLastVisit.length > 0
        ? `${sinceLastVisit.length} changes detected`
        : "No previous visit data yet"}
    </p>
  </div>

  {sinceLastVisit.length === 0 ? (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
      <p className="font-medium text-slate-700">
        Your first visit is being recorded.
      </p>

      <p className="text-sm text-slate-500 mt-1">
        Come back later and SmartWatch will compare
        your previous logout prices with current prices.
      </p>
    </div>
  ) : (
    <div className="space-y-4">

      {sinceLastVisit
        .sort(
          (a, b) =>
            Math.abs(b.change) -
            Math.abs(a.change)
        )
        .slice(0, 3)
        .map((item) => {

          const holding = holdings[item.symbol];

          const buyPrice =
            holding?.buyPrice ?? 0;

          const quantity =
            holding?.quantity ?? 0;

          const profitLoss =
            buyPrice > 0 && quantity > 0
              ? (item.currentPrice - buyPrice) *
                quantity
              : 0;

          const portfolioValue =
            quantity > 0
              ? item.currentPrice * quantity
              : 0;

          const isNegative =
            item.change < 0;

          const isMeaningful =
            Math.abs(item.change) >= 3;

          return (
            <div
              key={item.symbol}
              className="rounded-xl border border-slate-200 p-5"
            >

              {/* STOCK HEADER */}

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-lg font-semibold">
                    {item.symbol}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    {watchlistStocks.find(
                      (stock) =>
                        stock.symbol === item.symbol
                    )?.name}
                  </p>
                </div>

                <span
                  className={
                    isMeaningful
                      ? "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                      : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                  }
                >
                  {item.label}
                </span>

              </div>

              {/* PRICE CHANGE */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">

                <div>
                  <p className="text-xs text-slate-400">
                    Previous logout
                  </p>

                  <p className="font-semibold mt-1">
                    ₹
                    {item.previousPrice.toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Current price
                  </p>

                  <p className="font-semibold mt-1">
                    ₹
                    {item.currentPrice.toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Change
                  </p>

                  <p
                    className={
                      isNegative
                        ? "font-semibold mt-1 text-red-600"
                        : "font-semibold mt-1 text-green-600"
                    }
                  >
                    {item.priceDifference > 0
                      ? "+"
                      : ""}
                    ₹
                    {item.priceDifference.toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Since last visit
                  </p>

                  <p
                    className={
                      isNegative
                        ? "font-semibold mt-1 text-red-600"
                        : "font-semibold mt-1 text-green-600"
                    }
                  >
                    {item.change > 0
                      ? "+"
                      : ""}
                    {item.change}%
                  </p>
                </div>

              </div>

              {/* HOLDING INFORMATION */}

              <div className="mt-5 pt-5 border-t border-slate-100">

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                  <div>
                    <p className="text-xs text-slate-400">
                      Buy price
                    </p>

                    <p className="font-semibold mt-1">
                      {buyPrice > 0
                        ? `₹${buyPrice.toLocaleString(
                            "en-IN"
                          )}`
                        : "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Quantity owned
                    </p>

                    <p className="font-semibold mt-1">
                      {quantity > 0
                        ? quantity
                        : "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Profit / Loss
                    </p>

                    <p
                      className={
                        profitLoss < 0
                          ? "font-semibold mt-1 text-red-600"
                          : "font-semibold mt-1 text-green-600"
                      }
                    >
                      {buyPrice > 0 &&
                      quantity > 0
                        ? `${
                            profitLoss > 0
                              ? "+"
                              : ""
                          }₹${profitLoss.toLocaleString(
                            "en-IN",
                            {
                              maximumFractionDigits: 2,
                            }
                          )}`
                        : "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Portfolio value
                    </p>

                    <p className="font-semibold mt-1">
                      {quantity > 0
                        ? `₹${portfolioValue.toLocaleString(
                            "en-IN",
                            {
                              maximumFractionDigits: 2,
                            }
                          )}`
                        : "Not available"}
                    </p>
                  </div>

                </div>

              </div>

            </div>
          );
        })}

    </div>
  )}

</section>

        {/* MY WATCHLIST */}

        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">

          <div className="flex items-center justify-between mb-5">

            <h2 className="text-xl font-semibold">
              My Watchlist
            </h2>

            <span className="text-sm text-slate-500">
              {watchlistStocks.length} stocks
            </span>

          </div>

          <div className="space-y-0">

            {watchlistStocks.map(
              (stock) => (
                <StockRow
                  key={stock.symbol}
                  name={stock.symbol}
                  fullName={stock.name}
                  price={`₹${stock.price.toLocaleString(
                    "en-IN"
                  )}`}
                  change={`${
                    stock.change > 0
                      ? "+"
                      : ""
                  }${stock.change}%`}
                  status={
                    stock.change <= -3
                      ? "Unusual activity"
                      : "Normal"
                  }
                  negative={
                    stock.change < 0
                  }
                />
              )
            )}

          </div>

        </section>

        {/* BOTTOM SECTIONS */}

        <div className="grid md:grid-cols-2 gap-6">

          {/* UNUSUAL ACTIVITY */}

          <section className="bg-white rounded-2xl p-6 shadow-sm">

            <h2 className="text-xl font-semibold">
              Unusual Activity
            </h2>

            <p className="text-sm text-slate-500 mt-1 mb-5">
              Movement relative to
              historically related assets.
            </p>

            {unusualActivity ? (

              <div className="rounded-xl bg-red-50 border border-red-100 p-5">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="font-semibold text-lg">
                      {unusualActivity.symbol}
                    </p>

                    <p className="text-red-600 font-medium mt-1">
                      {unusualActivity.change >
                      0
                        ? "+"
                        : ""}
                      {
                        unusualActivity.change
                      }%
                    </p>

                  </div>

                  <span className="text-red-600 font-semibold flex items-center gap-2">

                    <span className="h-3 w-3 rounded-full bg-red-500"></span>

                    Unusual

                  </span>

                </div>

                {/* RELATED ASSETS */}

                <div className="mt-6 space-y-3">

                  {unusualActivity.relatedAssets.map(
                    (asset) => (
                      <div
                        key={asset.symbol}
                        className="flex justify-between text-sm"
                      >

                        <span className="text-slate-600">
                          {asset.symbol}
                        </span>

                        <span className="font-medium">
                          {asset.change >
                          0
                            ? "+"
                            : ""}
                          {
                            asset.change
                          }%
                        </span>

                      </div>
                    )
                  )}

                </div>

                {/* EXPLANATION */}

                <div className="mt-6 pt-5 border-t border-red-100">

                  <p className="text-sm leading-6 text-slate-600">
                    {
                      unusualActivity.symbol
                    }{" "}
                    moved significantly
                    while historically
                    related assets remained
                    relatively stable.
                  </p>

                  <p className="text-xs text-slate-400 mt-3">
                    Based on historical price
                    relationships. Correlation
                    does not imply causation.
                  </p>

                </div>

              </div>

            ) : (

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">

                <p className="font-medium text-slate-700">
                  No unusual activity
                  detected.
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  SmartWatch will flag
                  significant divergence from
                  historically related assets.
                </p>

              </div>

            )}

          </section>

        {/* LATEST NEWS */}

        <section className="bg-white rounded-2xl p-6 shadow-sm">

          <h2 className="text-xl font-semibold">
            Latest News
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            News related to your watchlist.
          </p>

          <div className="mt-5 space-y-0">

            {news.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                Loading latest news...
              </p>
            ) : (
              (showAllNews ? news : news.slice(0, 3)).map((article) => (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border-b last:border-b-0 py-4 hover:bg-slate-50 transition"
                >

                  <p className="font-medium">
                    {article.title}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {article.source}
                  </p>

                </a>
              ))
            )}

          </div>

<button
  onClick={() => setShowAllNews((current) => !current)}
  className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700"
>
  {showAllNews ? "Show less ↑" : "View all news →"}
</button>

        </section>

      </div>

    </div>

  

  {/* ADD STOCK MODAL */}

  {showAddStock && (
    <AddStockModal
      watchlist={watchlist}
      setWatchlist={setWatchlist}
      onClose={() =>
        setShowAddStock(false)
      }
    />
  )}

</main>
  );
}


/* -------------------------------- */
/* STOCK ROW COMPONENT              */
/* -------------------------------- */

function StockRow({
  name,
  fullName,
  price,
  change,
  status,
  negative,
}: {
  name: string;
  fullName: string;
  price: string;
  change: string;
  status: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b last:border-b-0 py-4">

      <div>

        <p className="font-semibold text-base">
          {name}
        </p>

        <p className="text-sm text-slate-500 mt-1">
          {status}
        </p>

        <p className="text-xs text-slate-400 mt-1">
          {fullName}
        </p>

      </div>

      <div className="text-right">

        <p className="font-semibold text-base">
          {price}
        </p>

        <p
          className={
            negative
              ? "text-red-600 font-medium mt-1"
              : "text-green-600 font-medium mt-1"
          }
        >
          {change}
        </p>

      </div>

    </div>
  );
}


/* -------------------------------- */
/* NEWS ITEM COMPONENT              */
/* -------------------------------- */

function NewsItem({
  title,
  time,
}: {
  title: string;
  time: string;
}) {
  return (
    <div className="border-b last:border-b-0 py-4">

      <p className="font-medium">
        {title}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        {time}
      </p>

    </div>
  );
}