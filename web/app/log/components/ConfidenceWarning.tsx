"use client"

import type { AiMealResult } from "../types"

interface Props {
  aiResult: AiMealResult
  onConfirm: () => void
  onCancel: () => void
}

/**
 * ConfidenceWarning - NEW AI feature for low-confidence AI results
 * Shows when AI confidence < 85% and requires user confirmation
 * Displays ingredient breakdown and allows review/retake
 */
export function ConfidenceWarning({ aiResult, onConfirm, onCancel }: Props) {
  return (
    <div className="styles_confidenceWarning__bZxWq">
      <div className="styles_warningHeader__lKxYp">
        <span className="material-symbols-outlined">warning</span>
        <h3>Low Confidence Detection</h3>
      </div>

      <div className="styles_warningContent__nJmZq">
        <p>
          <strong>AI confidence: {aiResult.confidence}%</strong>
        </p>
        <p>Please review the nutrition data carefully before logging.</p>

        {aiResult.ingredients && aiResult.ingredients.length > 0 && (
          <div className="styles_ingredientList__kMnLp">
            <h4>Detected Ingredients:</h4>
            {aiResult.ingredients.map((ing, idx) => (
              <div key={idx} className="styles_ingredient__gTqNv">
                <div className="styles_ingredientName__dRwXz">{ing.name}</div>
                <div className="styles_ingredientQuantity__vLkZn">{ing.quantity}</div>
                <div className="styles_ingredientCalories__xJmYq">
                  {Math.round(ing.calories)} kcal
                  {ing.confidence && (
                    <span className="styles_ingredientConfidence__bNmKl">
                      ({ing.confidence}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {aiResult.notes && (
          <div className="styles_aiNotes__mXqYp">
            <h4>AI Notes:</h4>
            <p>{aiResult.notes}</p>
          </div>
        )}
      </div>

      <div className="styles_warningActions__xJkLm">
        <button className="styles_cancelBtn__tRkXn" onClick={onCancel}>
          <span className="material-symbols-outlined">photo_camera</span>
          Retake Photo
        </button>
        <button className="styles_confirmBtn__gZvYp" onClick={onConfirm}>
          <span className="material-symbols-outlined">check_circle</span>
          Looks Correct
        </button>
      </div>
    </div>
  )
}