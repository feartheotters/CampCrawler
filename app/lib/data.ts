import { DATASET_URL } from "./constants";
import type { CampsiteDataset } from "./types";

export async function loadDataset(): Promise<CampsiteDataset> {
  const res = await fetch(DATASET_URL);
  if (!res.ok) {
    throw new Error(`Failed to load campsite dataset (HTTP ${res.status})`);
  }
  return (await res.json()) as CampsiteDataset;
}
