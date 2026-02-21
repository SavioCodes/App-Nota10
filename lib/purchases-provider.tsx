import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Purchases, { type PurchasesOfferings, type PurchasesPackage } from "react-native-purchases";

import { useAuth } from "@/hooks/use-auth";
import { getRevenueCatApiKey, isRevenueCatSupportedPlatform } from "@/constants/revenuecat";

type PurchasesContextValue = {
  isSupported: boolean;
  isReady: boolean;
  purchaseByProductId: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const isSupported = isRevenueCatSupportedPlatform();

  const refreshOfferings = useCallback(async () => {
    if (!isSupported || !isConfigured) return null;
    const nextOfferings = await Purchases.getOfferings();
    setOfferings(nextOfferings);
    return nextOfferings;
  }, [isConfigured, isSupported]);

  useEffect(() => {
    let cancelled = false;

    async function configureRevenueCat() {
      if (!isSupported) {
        setIsReady(true);
        return;
      }

      const apiKey = getRevenueCatApiKey();
      if (!apiKey) {
        console.warn("[RevenueCat] Missing API key. Purchases disabled.");
        setIsReady(true);
        return;
      }

      try {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
        Purchases.configure({ apiKey });
        if (!cancelled) {
          setIsConfigured(true);
        }
      } catch (error) {
        console.error("[RevenueCat] Failed to configure SDK:", error);
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    configureRevenueCat();

    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported || !isConfigured) return;

    let cancelled = false;

    async function syncIdentity() {
      try {
        if (isAuthenticated && user?.openId) {
          await Purchases.logIn(user.openId);
        } else {
          await Purchases.logOut();
        }
        if (!cancelled) {
          await refreshOfferings();
        }
      } catch (error) {
        console.error("[RevenueCat] Failed to sync identity:", error);
      }
    }

    syncIdentity();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isConfigured, isSupported, refreshOfferings, user?.openId]);

  const findPackageByProductId = useCallback((
    productId: string,
    sourceOfferings: PurchasesOfferings | null,
  ): PurchasesPackage | null => {
    if (!sourceOfferings) return null;

    const allOfferings = Object.values(sourceOfferings.all ?? {});
    for (const offering of allOfferings) {
      const match = (offering.availablePackages ?? []).find((pkg) => pkg?.product?.identifier === productId);
      if (match) return match;
    }

    return null;
  }, []);

  const purchaseByProductId = useCallback(
    async (productId: string) => {
      if (!isSupported) {
        throw new Error("RevenueCat is not supported on this platform");
      }
      if (!isConfigured) {
        throw new Error("RevenueCat is not configured");
      }

      const latestOfferings = offerings ?? (await refreshOfferings());
      const targetPackage = findPackageByProductId(productId, latestOfferings);
      if (!targetPackage) {
        throw new Error("Package not found for selected product");
      }

      await Purchases.purchasePackage(targetPackage);
      await refreshOfferings();
    },
    [findPackageByProductId, isConfigured, isSupported, offerings, refreshOfferings],
  );

  const restorePurchases = useCallback(async () => {
    if (!isSupported || !isConfigured) {
      throw new Error("RevenueCat is unavailable");
    }
    await Purchases.restorePurchases();
    await refreshOfferings();
  }, [isConfigured, isSupported, refreshOfferings]);

  const value = useMemo<PurchasesContextValue>(
    () => ({
      isSupported,
      isReady,
      purchaseByProductId,
      restorePurchases,
    }),
    [isReady, isSupported, purchaseByProductId, restorePurchases],
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
