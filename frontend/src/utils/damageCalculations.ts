import { Part } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface DamageData {
  total_damage: number
  broken_parts_count: number
  broken_parts: string[]
  parts?: Array<{ name: string; partId: string; damage: number }>
  part_damage?: Record<string, number>
  damaged_parts_count?: number
  total_parts_count?: number
  damage_by_zone?: Record<string, number>
}

// ============================================================================
// Constants
// ============================================================================

export const TOTAL_VEHICLE_PARTS = 51
export const LABOR_RATE_BRL = 150

export const BEAMNG_ABBREV: Record<string, string> = {
  f: 'front', r: 'rear', l: 'left', fl: 'front left',
  fr: 'front right', rl: 'rear left', rr: 'rear right',
  t: 'top', b: 'bottom',
}

export const severityColors: Record<string, string> = {
  minor: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  severe: 'bg-orange-100 text-orange-800',
  total_loss: 'bg-red-100 text-red-800',
}

export const severityColorsWithBorders: Record<string, string> = {
  minor: 'bg-green-100 text-green-800 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  severe: 'bg-orange-100 text-orange-800 border-orange-200',
  total_loss: 'bg-red-100 text-red-800 border-red-200',
}

export const severityLabels: Record<string, string> = {
  minor: 'Leve',
  moderate: 'Moderado',
  severe: 'Severo',
  total_loss: 'Perda Total',
}

// ============================================================================
// Severity Functions
// ============================================================================

export const getSeverityFromDamage = (totalDamage: number): string => {
  if (totalDamage >= 0.5) return 'severe'
  if (totalDamage >= 0.2) return 'moderate'
  return 'minor'
}

export function computeTotalDamage(damage: DamageData): number {
  const partsList = damage.parts?.length
    ? damage.parts
    : (damage.broken_parts || []).map(name => ({
        name, partId: name, damage: damage.part_damage?.[name] ?? 0,
      }))
  const sumDamage = partsList.reduce((s, p) => s + (p.damage || 0), 0)
  return sumDamage / TOTAL_VEHICLE_PARTS
}

export function isUnibodyTotalled(damage: DamageData): boolean {
  if (damage.parts?.length) {
    const unibody = damage.parts.find(p => p.name.toLowerCase() === 'unibody')
    if (unibody && unibody.damage > 0.4) return true
  }
  if (damage.part_damage) {
    const dmg = damage.part_damage['Unibody'] ?? damage.part_damage['unibody'] ?? 0
    if (dmg > 0.4) return true
  }
  return false
}

export function getCrashSeverity(damage: DamageData): string {
  return isUnibodyTotalled(damage) ? 'total_loss' : getSeverityFromDamage(computeTotalDamage(damage))
}

// ============================================================================
// Repair Factor
// ============================================================================

export function getRepairFactor(damageLevel: number): number {
  return damageLevel >= 0.5 ? 1 : damageLevel >= 0.2 ? 0.5 : 0.25
}

// ============================================================================
// Part Matching
// ============================================================================

/**
 * Match a BeamNG part name (e.g. "etk800_fender_FL") to a DB part.
 * Strategy:
 * 1. Exact match (case-insensitive)
 * 2. Keyword scoring: extract words from both names, count matches
 */
export function findMatchingPart(beamngName: string, allParts: Part[]): Part | undefined {
  const nameLower = beamngName.toLowerCase().trim()

  // 1. Exact match by English name
  const exact = allParts.find(p => p.name.toLowerCase() === nameLower)
  if (exact) return exact

  // 2. Extract keywords from BeamNG name
  // Remove common model prefixes (e.g., "etk800_", "tcross_", "vivace_")
  const withoutPrefix = nameLower.replace(/^[a-z]+\d*_/, '')
  const rawTokens = withoutPrefix.split(/[_\s-]+/).filter(t => t.length > 0)

  // Expand abbreviations
  const keywords: string[] = []
  for (const token of rawTokens) {
    const expanded = BEAMNG_ABBREV[token]
    if (expanded) {
      keywords.push(...expanded.split(' '))
    } else {
      keywords.push(token)
    }
  }

  if (keywords.length === 0) return undefined

  // 3. Score each DB part
  let bestMatch: Part | undefined
  let bestScore = 0

  for (const part of allParts) {
    const partWords = part.name.toLowerCase().split(/[\s-]+/)
    let score = 0
    for (const kw of keywords) {
      for (const pw of partWords) {
        if (pw === kw) { score += 2; break }
        if (pw.includes(kw) || kw.includes(pw)) { score += 1; break }
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = part
    }
  }

  return bestScore >= 2 ? bestMatch : undefined
}

// ============================================================================
// Cost Calculation
// ============================================================================

export function calculateCrashCost(damage: DamageData, allParts: Part[]) {
  const partsList: Array<{ name: string; damage: number }> = damage.parts?.length
    ? damage.parts.map(p => ({ name: p.name, damage: p.damage }))
    : (damage.broken_parts || []).map(name => ({
        name,
        damage: damage.part_damage?.[name] ?? 1,
      }))

  let partsCost = 0
  let totalLaborHours = 0
  for (const { name, damage: dmg } of partsList) {
    const dbPart = findMatchingPart(name, allParts)
    if (dbPart) {
      const price = parseFloat(dbPart.price_brl) || 0
      const factor = getRepairFactor(dmg)
      partsCost += price * factor
      totalLaborHours += parseFloat(dbPart.labor_hours || '0') || 0
    }
  }
  const laborCost = totalLaborHours * LABOR_RATE_BRL
  return { partsCost, laborCost, totalLaborHours, total: partsCost + laborCost }
}

// ============================================================================
// Formatting
// ============================================================================

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
