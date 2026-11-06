export type ModelQuality = "2k" | "4k";
export const MODEL_PATHS: Record<ModelQuality, string> = {
  "2k": "/models/cd-2k.glb",
  "4k": "/models/cd-4k.glb",
};
export const DEFAULT_MODEL_QUALITY: ModelQuality = "2k";
