import { useState, useEffect, useMemo } from "react"
import { search as searchFoods } from "@/lib/actions/foods"
import type { DBFood } from "../types"

/**
 * useFoodSearch - Hook for food search with AI-powered suggestions
 * Wraps search action and integrates AI suggestions
 */
export function useFoodSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery)
  const [aiSuggestions, setAiSuggestions] = useState<DBFood[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [dbResult, setDbResult] = useState<DBFood[]>([])

  useEffect(() => {
    const fetchDbFoods = async () => {
      try {
        const res = await searchFoods(query, "All")
        setDbResult(res as DBFood[] || [])
      } catch (err) {
        console.error("searchFoods error:", err)
      }
    }
    fetchDbFoods()
  }, [query])

  // Fetch AI suggestions when query is short or empty
  useEffect(() => {
    if (query.length > 0 && query.length < 3) {
      // Only fetch suggestions for very short queries
      fetchAISuggestions()
    } else {
      setAiSuggestions([]) // Clear when user types enough
    }
  }, [query])

  const fetchAISuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const res = await fetch("/api/food-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          userContext: "Based on recent meals and dietary preferences",
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const suggestions: DBFood[] = await res.json()
      setAiSuggestions(suggestions)
    } catch (error) {
      console.error("Failed to fetch AI suggestions:", error)
      setAiSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // Combine and deduplicate results
  const filteredFoods = useMemo(() => {
    const dbFoods: DBFood[] = dbResult ?? []

    // If AI suggestions available, prioritize them (only for very short queries)
    if (aiSuggestions.length > 0 && query.length < 3) {
      // Merge AI suggestions at top, then DB results (remove duplicates)
      const aiNames = new Set(aiSuggestions.map((f) => f.name))
      const uniqueDbFoods = dbFoods.filter((f) => !aiNames.has(f.name))

      return [...aiSuggestions, ...uniqueDbFoods]
    }

    // Otherwise return just DB results
    return dbFoods
  }, [dbResult, aiSuggestions, query])

  const clearSuggestions = () => {
    setAiSuggestions([])
  }

  return {
    query,
    setQuery,
    filteredFoods,
    aiSuggestions,
    loading: loadingSuggestions,
    clearSuggestions,
  }
}
