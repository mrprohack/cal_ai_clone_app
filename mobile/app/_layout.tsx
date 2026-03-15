import { ConvexProvider } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { Slot } from "expo-router";
import { convex } from "../lib/convex";
import Constants from "expo-constants";

const clerkKey = Constants.expoConfig?.extra?.clerkPublishableKey ?? "";

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProvider client={convex}>
        <Slot />
      </ConvexProvider>
    </ClerkProvider>
  );
}
