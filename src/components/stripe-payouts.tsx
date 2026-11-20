"use client";

import { useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { ConnectBalances, ConnectComponentsProvider, ConnectNotificationBanner, ConnectPayouts } from "@stripe/react-connect-js";
import { payoutsSessionAction } from "@/app/actions/dashboard";

/** Stripe's embedded components: the business's real balance, payout schedule and payouts. */
export function StripePayouts() {
  const [instance] = useState(() =>
    loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      fetchClientSecret: () => payoutsSessionAction(),
      appearance: {
        variables: {
          colorPrimary: "#34483b",
          colorText: "#1c2420",
          colorBackground: "#f9f9f6",
          borderRadius: "14px",
          fontFamily: "Inter, system-ui, sans-serif",
        },
      },
      fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" }],
    }),
  );
  return (
    <ConnectComponentsProvider connectInstance={instance}>
      <div className="space-y-6">
        <ConnectNotificationBanner />
        <ConnectBalances />
        <ConnectPayouts />
      </div>
    </ConnectComponentsProvider>
  );
}
