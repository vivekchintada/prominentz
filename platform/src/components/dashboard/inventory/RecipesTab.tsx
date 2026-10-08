'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface RecipeIngredientLine {
  id: string
  inventoryItemId: string
  ingredientName: string
  unit: string
  quantityRequired: number
  unitCost: number
  lineCost: number
  currentStock: number
}

interface MenuItemRecipe {
  menuItemId: string
  menuItemName: string
  categoryName: string
  retailPrice: number
  totalFoodCost: number
  foodCostPercentage: number
  grossProfit: number
  is86d: boolean
  recipes: RecipeIngredientLine[]
}

interface InventoryItemOption {
  id: string
  name: string
  unit: string
  unitCost: number
  currentStock: number
}

interface RecipesTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
  onRecipeChanged: () => void
}

export default function RecipesTab({ showToast, onRecipeChanged }: RecipesTabProps) {
  const [recipes, setRecipes] = useState<MenuItemRecipe[]>([])
  const [inventoryOptions, setInventoryOptions] = useState<InventoryItemOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Edit Recipe Modal
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemRecipe | null>(null)
  const [newIngredientId, setNewIngredientId] = useState('')
  const [newPortion, setNewPortion] = useState<number | ''>(1)
  const [submittingRecipe, setSubmittingRecipe] = useState(false)

  const fetchRecipesData = useCallback(async () => {
    try {
      setLoading(true)
      const [recRes, invRes] = await Promise.all([
        fetch('/api/inventory/recipes'),
        fetch('/api/inventory'),
      ])

      if (recRes.ok) {
        const data = await recRes.json()
        setRecipes(data.items || [])
      }
      if (invRes.ok) {
        const invData = await invRes.json()
        setInventoryOptions(Array.isArray(invData) ? invData : (invData.items || []))
      }
    } catch (err: unknown) {
      showToast(err.message || 'Error loading recipes', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchRecipesData()
  }, [fetchRecipesData])

  const handleOpenEdit = (item: MenuItemRecipe) => {
    setSelectedMenuItem(item)
    setNewIngredientId(inventoryOptions[0]?.id || '')
    setNewPortion(1)
  }

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMenuItem || !newIngredientId) return

    try {
      setSubmittingRecipe(true)
      const res = await fetch('/api/inventory/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId:       selectedMenuItem.menuItemId,
          inventoryItemId:  newIngredientId,
          quantityRequired: Number(newPortion) || 1,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to link ingredient to recipe')
      }

      showToast(`Ingredient portion linked to ${selectedMenuItem.menuItemName}`, 'success')
      await fetchRecipesData()
      // Refresh selected menu item
      const recRes = await fetch(`/api/inventory/recipes?menuItemId=${selectedMenuItem.menuItemId}`)
      if (recRes.ok) {
        const updated = await recRes.json()
        if (updated.items?.[0]) setSelectedMenuItem(updated.items[0])
      }
      onRecipeChanged()
    } catch (err: unknown) {
      showToast(err.message || 'Error saving recipe', 'error')
    } finally {
      setSubmittingRecipe(false)
    }
  }

  const handleRemoveIngredient = async (recipeId: string) => {
    try {
      const res = await fetch(`/api/inventory/recipes?recipeId=${recipeId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to unlink ingredient')
      showToast('Ingredient removed from recipe', 'success')
      await fetchRecipesData()
      if (selectedMenuItem) {
        const recRes = await fetch(`/api/inventory/recipes?menuItemId=${selectedMenuItem.menuItemId}`)
        if (recRes.ok) {
          const updated = await recRes.json()
          if (updated.items?.[0]) setSelectedMenuItem(updated.items[0])
        }
      }
      onRecipeChanged()
    } catch (err: unknown) {
      showToast(err.message || 'Error removing ingredient', 'error')
    }
  }

  const filteredRecipes = recipes.filter(
    (r) =>
      r.menuItemName.toLowerCase().includes(search.toLowerCase()) ||
      r.categoryName.toLowerCase().includes(search.toLowerCase())
  )

  const averageFoodCostPct =
    recipes.length > 0
      ? (recipes.reduce((sum, r) => sum + r.foodCostPercentage, 0) / recipes.length).toFixed(1)
      : '0.0'

  const itemsWithRecipesCount = recipes.filter((r) => r.recipes.length > 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Menu Items With Recipes
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
            {itemsWithRecipesCount} / {recipes.length}
          </div>
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
            {((itemsWithRecipesCount / (recipes.length || 1)) * 100).toFixed(0)}% mapped to stock depletion
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Average Food Cost
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: Number(averageFoodCostPct) > 35 ? '#ea580c' : '#16a34a',
              marginTop: 4,
            }}
          >
            {averageFoodCostPct}%
          </div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
            Industry target: 28% – 32%
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Live Cost Recalculation
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand)', marginTop: 4 }}>
            Real-Time
          </div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
            Updates automatically when PO purchase costs change
          </div>
        </div>
      </div>

      {/* Recipes Table */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-bg-card-hover)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Menu Recipes & Food Cost Matrix
          </div>
          <input
            type="text"
            placeholder="Search dish or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: 240,
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
            }}
          />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)', color: '#64748b' }}>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Menu Dish</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Category</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Retail Price</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Recipe Portions</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Total Food Cost</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Food Cost %</th>
              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Gross Profit</th>
              <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  Loading recipe food costs...
                </td>
              </tr>
            ) : filteredRecipes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  No menu items found.
                </td>
              </tr>
            ) : (
              filteredRecipes.map((item) => {
                const costPct = item.foodCostPercentage
                const badgeBg =
                  costPct === 0
                    ? '#f1f5f9'
                    : costPct <= 30
                    ? '#dcfce7'
                    : costPct <= 38
                    ? '#fef3c7'
                    : '#fee2e2'
                const badgeColor =
                  costPct === 0
                    ? '#64748b'
                    : costPct <= 30
                    ? '#16a34a'
                    : costPct <= 38
                    ? '#b45309'
                    : '#b91c1c'

                return (
                  <tr key={item.menuItemId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {item.menuItemName}
                      {item.is86d && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 800,
                            background: '#fee2e2',
                            color: '#b91c1c',
                          }}
                        >
                          86&apos;d
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--color-text-secondary)' }}>{item.categoryName}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      ${item.retailPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--color-text-secondary)' }}>
                      {item.recipes.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.recipes.map((r) => (
                            <span
                              key={r.id}
                              style={{
                                background: 'var(--color-bg-input)',
                                color: 'var(--color-text-secondary)',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {r.ingredientName} ({r.quantityRequired} {r.unit})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: 12 }}>
                          No recipe linked
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      ${item.totalFoodCost.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: badgeBg,
                          color: badgeColor,
                        }}
                      >
                        {costPct > 0 ? `${costPct.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#16a34a' }}>
                      ${item.grossProfit.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: 'var(--color-bg-card)',
                          color: 'var(--brand)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Configure Recipe
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── RECIPE EDITOR MODAL ── */}
      {selectedMenuItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-bg-card-hover)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Recipe Configuration: {selectedMenuItem.menuItemName}
                </h3>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Retail Price: ${selectedMenuItem.retailPrice.toFixed(2)} • Total Food Cost: $
                  {selectedMenuItem.totalFoodCost.toFixed(2)} ({selectedMenuItem.foodCostPercentage.toFixed(1)}%)
                </div>
              </div>
              <button
                onClick={() => setSelectedMenuItem(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Existing Ingredients */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  Current Recipe Ingredients
                </h4>
                {selectedMenuItem.recipes.length === 0 ? (
                  <div style={{ padding: '16px', background: 'var(--color-bg-card-hover)', borderRadius: 8, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                    No ingredients mapped. Adding ingredients enables automatic stock depletion upon order firing.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--color-bg-card-hover)', borderBottom: '1px solid var(--color-border)', color: '#64748b' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 700 }}>Ingredient</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>Portion Qty</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Unit Cost</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Line Cost</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMenuItem.recipes.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {r.ingredientName}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                              {r.quantityRequired} {r.unit}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                              ${r.unitCost.toFixed(2)}/{r.unit}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              ${r.lineCost.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleRemoveIngredient(r.id)}
                                title="Remove Ingredient"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  padding: 4,
                                }}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add New Ingredient Line */}
              <form
                onSubmit={handleAddIngredient}
                style={{
                  background: 'var(--color-bg-card-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  + Add Ingredient Requirement
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                      Ingredient:
                    </label>
                    <select
                      value={newIngredientId}
                      onChange={(e) => setNewIngredientId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        background: 'var(--color-bg-card)',
                      }}
                    >
                      {inventoryOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({opt.unit}) — ${Number(opt.unitCost).toFixed(2)}/unit
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                      Portion Required:
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      value={newPortion}
                      onChange={(e) => setNewPortion(parseFloat(e.target.value) || '')}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={submittingRecipe}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--brand)',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {submittingRecipe ? 'Saving...' : 'Add to Recipe'}
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '16px 24px',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-bg-card-hover)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedMenuItem(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: 'var(--color-bg-card)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
