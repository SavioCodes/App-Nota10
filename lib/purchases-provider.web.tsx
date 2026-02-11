import { createContext, useContext, useMemo } from "react";

type PurchasesContextValue = {
  isSupported: boolean;
  isReady: boolean;
  purchaseByProductId: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<PurchasesContextValue>(
    () => ({
      isSupported: false,
      isReady: true,
      purchaseByProductId: async () => {
        throw new Error("RevenueCat is unavailable on web");
      },
      restorePurchases: async () => {
        throw new Error("RevenueCat is unavailable on web");
      },
    }),
    [],
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases() {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error("usePurchases must be used within PurchasesProvider");
  }
  return ctx;
}
