import type { Mine } from "@/types";
import { fatJackMine } from "./fat-jack";

export const mines: Mine[] = [fatJackMine];

export { fatJackMine } from "./fat-jack";

export function getMineBySlug(slug: string): Mine | undefined {
  return mines.find((m) => m.slug === slug);
}
