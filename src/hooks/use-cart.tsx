"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Specimen } from "@/types";
import { isPurchasable } from "@/lib/utils";

// Types
export interface CartItem {
  specimenId: string;
  specimen: Specimen;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: "ADD_ITEM"; specimen: Specimen }
  | { type: "REMOVE_ITEM"; specimenId: string }
  | { type: "CLEAR_CART" }
  | { type: "TOGGLE_CART" }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" }
  | { type: "HYDRATE"; items: CartItem[] };

interface CartContextValue extends CartState {
  addItem: (specimen: Specimen) => boolean;
  removeItem: (specimenId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  isInCart: (specimenId: string) => boolean;
}

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { specimen } = action;
      if (!isPurchasable(specimen)) {
        return state;
      }
      const existingItem = state.items.find(
        (item) => item.specimenId === specimen.id
      );
      if (existingItem) {
        return state;
      }
      return {
        ...state,
        items: [
          ...state.items,
          { specimenId: specimen.id, specimen, quantity: 1 },
        ],
      };
    }

    case "REMOVE_ITEM": {
      return {
        ...state,
        items: state.items.filter(
          (item) => item.specimenId !== action.specimenId
        ),
      };
    }

    case "CLEAR_CART": {
      return { ...state, items: [] };
    }

    case "TOGGLE_CART": {
      return { ...state, isOpen: !state.isOpen };
    }

    case "OPEN_CART": {
      return { ...state, isOpen: true };
    }

    case "CLOSE_CART": {
      return { ...state, isOpen: false };
    }

    case "HYDRATE": {
      const existingIds = new Set(state.items.map((i) => i.specimenId));
      const newItems = action.items.filter(
        (i) => !existingIds.has(i.specimenId)
      );
      return { ...state, items: [...state.items, ...newItems] };
    }

    default:
      return state;
  }
}

// Context
const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "borussia-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Support both legacy (string[] of IDs) and new (CartItem[]) formats
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === "string") {
            // Legacy format — IDs only, can't reconstruct without static data. Clear stale cart.
            localStorage.removeItem(CART_STORAGE_KEY);
            return;
          }
          // New format — full CartItem objects
          const items: CartItem[] = (parsed as CartItem[]).filter(
            (item) => item.specimen && item.specimenId && isPurchasable(item.specimen)
          );
          dispatch({ type: "HYDRATE", items });
        }
      }
    } catch {
      // Invalid storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Quota exceeded
    }
  }, [state.items]);

  const addItem = useCallback((specimen: Specimen): boolean => {
    if (!isPurchasable(specimen)) {
      return false;
    }
    dispatch({ type: "ADD_ITEM", specimen });
    dispatch({ type: "OPEN_CART" });
    return true;
  }, []);

  const removeItem = useCallback((specimenId: string) => {
    dispatch({ type: "REMOVE_ITEM", specimenId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const toggleCart = useCallback(() => {
    dispatch({ type: "TOGGLE_CART" });
  }, []);

  const openCart = useCallback(() => {
    dispatch({ type: "OPEN_CART" });
  }, []);

  const closeCart = useCallback(() => {
    dispatch({ type: "CLOSE_CART" });
  }, []);

  const getItemCount = useCallback(() => {
    return state.items.length;
  }, [state.items]);

  const getSubtotal = useCallback(() => {
    return state.items.reduce((total, item) => {
      return total + (item.specimen.price || 0) * item.quantity;
    }, 0);
  }, [state.items]);

  const isInCart = useCallback(
    (specimenId: string) => {
      return state.items.some((item) => item.specimenId === specimenId);
    },
    [state.items]
  );

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        clearCart,
        toggleCart,
        openCart,
        closeCart,
        getItemCount,
        getSubtotal,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
