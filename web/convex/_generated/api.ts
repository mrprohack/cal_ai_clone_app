/**
 * Cal AI — Convex API stubs
 *
 * This file is REPLACED by real code when you run `npx convex dev`.
 * Until then, it uses `makeFunctionReference` to create real, non-proxy
 * function references that Next.js webpack can safely analyse.
 */
import { makeFunctionReference } from "convex/server";

export const api = {
  meals: {
    getTodayMeals:         makeFunctionReference<"query">  ("meals:getTodayMeals"),
    getMealsForDateRange:  makeFunctionReference<"query">  ("meals:getMealsForDateRange"),
    logMealManual:         makeFunctionReference<"mutation">("meals:logMealManual"),
    saveMealFromAI:        makeFunctionReference<"mutation">("meals:saveMealFromAI"),
    deleteMeal:            makeFunctionReference<"mutation">("meals:deleteMeal"),
    generateUploadUrl:     makeFunctionReference<"mutation">("meals:generateUploadUrl"),
    analyzeFoodPhoto:      makeFunctionReference<"action"> ("meals:analyzeFoodPhoto"),
  },
  daily: {
    getDailySummary:   makeFunctionReference<"query">  ("daily:getDailySummary"),
    getWeekView:       makeFunctionReference<"query">  ("daily:getWeekView"),
    upsertSummary:     makeFunctionReference<"mutation">("daily:upsertSummary"),
    updateDailyExtras: makeFunctionReference<"mutation">("daily:updateDailyExtras"),
  },
  checkins: {
    getCheckInHistory:      makeFunctionReference<"query">  ("checkins:getCheckInHistory"),
    getLatestCheckIn:       makeFunctionReference<"query">  ("checkins:getLatestCheckIn"),
    saveCheckIn:            makeFunctionReference<"mutation">("checkins:saveCheckIn"),
    updateCheckInAnalysis:  makeFunctionReference<"mutation">("checkins:updateCheckInAnalysis"),
    analyzeProgressPhoto:   makeFunctionReference<"action"> ("checkins:analyzeProgressPhoto"),
  },
  chat: {
    getChatHistory: makeFunctionReference<"query">  ("chat:getChatHistory"),
    saveMessage:    makeFunctionReference<"mutation">("chat:saveMessage"),
    clearChat:      makeFunctionReference<"mutation">("chat:clearChat"),
    sendMessage:    makeFunctionReference<"action"> ("chat:sendMessage"),
  },
  users: {
    getMe:                 makeFunctionReference<"query">  ("users:getMe"),
    createOrUpdateUser:    makeFunctionReference<"mutation">("users:createOrUpdateUser"),
    updateProfile:         makeFunctionReference<"mutation">("users:updateProfile"),
    suggestCalorieTarget:  makeFunctionReference<"mutation">("users:suggestCalorieTarget"),
  },
} as const;

export const internal = {} as const;
