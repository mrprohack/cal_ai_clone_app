// Convex client setup — shared across the mobile app
import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

const convexUrl = Constants.expoConfig?.extra?.convexUrl ?? process.env.EXPO_PUBLIC_CONVEX_URL!;

export const convex = new ConvexReactClient(convexUrl);
