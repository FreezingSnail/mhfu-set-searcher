import { createContext, useContext } from "react";
import { MHFU, type GameData } from "./games";
import type { Game } from "./types";

export type GameValue = { game: Game; data: GameData };

export const GameContext = createContext<GameValue>({ game: "mhfu", data: MHFU });

export function useGame() {
  return useContext(GameContext);
}
