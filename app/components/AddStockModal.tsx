"use client";

import { useState } from "react";
import { stocks } from "../lib/stocks";
import { supabase } from "../lib/supabase";

type AddStockModalProps = {
  watchlist: string[];
  setWatchlist: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
};

export default function AddStockModal({
  watchlist,
  setWatchlist,
  onClose,
}: AddStockModalProps) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const [buyPrice, setBuyPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
      stock.name.toLowerCase().includes(search.toLowerCase())
  );

  async function addStock(symbol: string) {
    if (watchlist.includes(symbol)) {
      return;
    }

    if (!buyPrice || Number(buyPrice) <= 0) {
      alert("Please enter your buy price.");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      alert("Please enter the quantity you own.");
      return;
    }

    try {
      setSaving(symbol);

      // Get the currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        alert("Please log in before adding stocks.");
        window.location.href = "/login";
        return;
      }

      const stock = stocks.find((item) => item.symbol === symbol);

      if (!stock) {
        throw new Error("Stock not found");
      }

      // Find the stock in Supabase
      let { data: asset, error: assetError } = await supabase
        .from("assets")
        .select("id")
        .eq("symbol", stock.symbol)
        .maybeSingle();

      if (assetError) {
        throw assetError;
      }

      // If the stock doesn't exist, create it
      if (!asset) {
        const { data: newAsset, error: newAssetError } =
          await supabase
            .from("assets")
            .insert({
              symbol: stock.symbol,
              name: stock.name,
              sector: stock.sector,
            })
            .select("id")
            .single();

        if (newAssetError) {
          throw newAssetError;
        }

        asset = newAsset;
      }

      // Find THIS USER'S watchlist
      let { data: watchlistData, error: watchlistError } =
        await supabase
          .from("watchlists")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

      if (watchlistError) {
        throw watchlistError;
      }

      // Create a watchlist for this user if none exists
      if (!watchlistData) {
        const { data: newWatchlist, error: newWatchlistError } =
          await supabase
            .from("watchlists")
            .insert({
              name: "My Watchlist",
              user_id: user.id,
            })
            .select("id")
            .single();

        if (newWatchlistError) {
          throw newWatchlistError;
        }

        watchlistData = newWatchlist;
      }

      // Add stock to THIS USER'S watchlist
      const { error: linkError } = await supabase
        .from("watchlist_assets")
        .insert({
          watchlist_id: watchlistData.id,
          asset_id: asset.id,
        });

      // Ignore duplicate relationship
      if (linkError && linkError.code !== "23505") {
        throw linkError;
      }

      // Save the user's actual holding information
      const { error: holdingError } = await supabase
        .from("holdings")
        .upsert(
          {
            user_id: user.id,
            asset_id: asset.id,
            buy_price: Number(buyPrice),
            quantity: Number(quantity),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,asset_id",
          }
        );

      if (holdingError) {
        throw holdingError;
      }

      // Update dashboard immediately
      setWatchlist((current) => [...current, symbol]);

      // Clear holding inputs
      setBuyPrice("");
      setQuantity("");
    } catch (error: any) {
      console.error("ERROR ADDING STOCK");
      console.error("Message:", error?.message);
      console.error("Code:", error?.code);
      console.error("Details:", error?.details);
      console.error("Hint:", error?.hint);
      console.error("Full error:", error);

      alert(
        `Supabase error: ${
          error?.message || "Unknown error. Check the browser console."
        }`
      );
    } finally {
      setSaving(null);
    }
  }

  async function removeStock(symbol: string) {
    try {
      // Get the logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Find this user's watchlist
      const { data: watchlistData, error: watchlistError } =
        await supabase
          .from("watchlists")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

      if (watchlistError) {
        throw watchlistError;
      }

      if (!watchlistData) {
        return;
      }

      // Find the asset
      const stock = stocks.find((item) => item.symbol === symbol);

      if (!stock) {
        return;
      }

      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .select("id")
        .eq("symbol", stock.symbol)
        .maybeSingle();

      if (assetError) {
        throw assetError;
      }

      if (!asset) {
        return;
      }

      // Remove it from this user's watchlist
      const { error: deleteError } = await supabase
        .from("watchlist_assets")
        .delete()
        .eq("watchlist_id", watchlistData.id)
        .eq("asset_id", asset.id);

      if (deleteError) {
        throw deleteError;
      }

      // Remove the holding as well
      const { error: holdingDeleteError } = await supabase
        .from("holdings")
        .delete()
        .eq("user_id", user.id)
        .eq("asset_id", asset.id);

      if (holdingDeleteError) {
        throw holdingDeleteError;
      }

      // Update dashboard immediately
      setWatchlist((current) =>
        current.filter((item) => item !== symbol)
      );
    } catch (error: any) {
      console.error("ERROR REMOVING STOCK:", error);

      alert(
        `Could not remove stock: ${
          error?.message || "Unknown error"
        }`
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">
              Add to Watchlist
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Search and add stocks you want to follow.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-3">
          <input
            type="text"
            placeholder="Search stocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Buy price ₹"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <input
              type="number"
              min="1"
              step="1"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <p className="text-xs text-slate-400">
            Enter the actual price you bought at and the number of shares you own.
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto px-5 pb-5">
          {filteredStocks.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No stocks found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredStocks.map((stock) => {
                const isAdded = watchlist.includes(stock.symbol);
                const isSaving = saving === stock.symbol;

                return (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold">
                        {stock.symbol}
                      </p>

                      <p className="text-sm text-slate-500">
                        {stock.name}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        {stock.sector}
                      </p>
                    </div>

                    {isAdded ? (
                      <button
                        onClick={() => removeStock(stock.symbol)}
                        className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                      >
                        Added ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => addStock(stock.symbol)}
                        disabled={isSaving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "+ Add"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t p-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}