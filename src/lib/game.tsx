import type { ReactNode } from "react";
import { GameContext } from "./gameContext";
import type { GameData } from "./games";
import type { Game } from "./types";

export function GameProvider({ game, data, children }: { game: Game; data: GameData; children: ReactNode }) {
  return <GameContext.Provider value={{ game, data }}>{children}</GameContext.Provider>;
}
