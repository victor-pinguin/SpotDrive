import { getBrand, getModel } from '../data/cars';
import type { CarModel, ID, Spot } from '../types/models';
import { rarityRank } from './rarity';

/**
 * Sammlung = Menge der DISTINKTEN Modelle, die ein Nutzer gespottet hat.
 * Ein Modell zählt nur einmal, egal wie oft es gespottet wird.
 */
export function collectedModelIds(spots: Spot[], userId: ID): Set<ID> {
  return new Set(spots.filter((s) => s.userId === userId).map((s) => s.modelId));
}

export function collectedBrandIds(spots: Spot[], userId: ID): Set<ID> {
  return new Set(spots.filter((s) => s.userId === userId).map((s) => getModel(s.modelId).brandId));
}

export interface BrandCollection {
  brandId: ID;
  /** Anzahl verschiedener Modelle dieser Marke in der Sammlung */
  collected: number;
  models: { model: CarModel; count: number }[];
}

/**
 * Sammlung nach Marke – nur Marken/Modelle, die der Nutzer wirklich gespottet hat.
 * Es gibt keine feste Obergrenze: jedes Auto der Welt kann dazukommen,
 * aber jedes Modell zählt nur einmal (count = wie oft gespottet).
 */
export function brandCollections(spots: Spot[], userId: ID): BrandCollection[] {
  const counts = new Map<ID, number>();
  spots.filter((s) => s.userId === userId).forEach((s) => counts.set(s.modelId, (counts.get(s.modelId) ?? 0) + 1));
  const byBrand = new Map<ID, { model: CarModel; count: number }[]>();
  counts.forEach((count, modelId) => {
    const model = getModel(modelId);
    byBrand.set(model.brandId, [...(byBrand.get(model.brandId) ?? []), { model, count }]);
  });
  return [...byBrand.entries()]
    .map(([brandId, models]) => ({ brandId, collected: models.length, models: models.sort((a, b) => a.model.name.localeCompare(b.model.name)) }))
    .sort((a, b) => b.collected - a.collected || getBrand(a.brandId).name.localeCompare(getBrand(b.brandId).name));
}

export function rarestModel(spots: Spot[], userId: ID): CarModel | null {
  const ids = [...collectedModelIds(spots, userId)];
  if (!ids.length) return null;
  return ids.map(getModel).sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity))[0];
}
