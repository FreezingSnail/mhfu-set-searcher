import { useEffect, useState } from "react";
import Solver from "./components/Solver";
import Builder from "./components/Builder";
import Weapons from "./components/Weapons";
import WeaponCompare from "./components/WeaponCompare";
import Sets from "./components/Sets";
import Charms from "./components/Charms";
import { GameProvider } from "./lib/game";
import { GAMES } from "./lib/games";
import type { Charm, Game, SolverResult } from "./lib/types";
import {
  loadSavedSets,
  makeSavedSet,
  persistSavedSets,
  selectionFromResult,
  selectionFromSaved,
  type SavedSet,
  type SetSelection,
} from "./lib/build";
import { loadCharms, persistCharms } from "./lib/charms";
import { parseShareToken, resolveSharedSet } from "./lib/share";
import "./styles.css";

type Tab = "solver" | "builder" | "sets" | "weapons" | "compare" | "charms";

type IncomingSet = {
  game: Game;
  name: string;
  selection: SetSelection;
  charms: Charm[];
};

const hashGame = (): Game => {
  const hash = window.location.hash.replace("#", "");
  return hash === "mh3u" || hash === "mh4u" ? hash : "mhfu";
};

const readSharedLink = (): IncomingSet | null => {
  const payload = parseShareToken(new URLSearchParams(window.location.search).get("share"));
  if (!payload) return null;
  const data = GAMES[payload.game];
  const charms = data.charmSupport ? loadCharms(data.charmStorageKey) : [];
  const resolved = resolveSharedSet(payload, data, charms);
  return {
    game: payload.game,
    name: payload.name,
    selection: resolved.selection,
    charms: resolved.charms,
  };
};

export default function App() {
  const [incoming] = useState<IncomingSet | null>(readSharedLink);
  const [game, setGame] = useState<Game>(() => incoming?.game ?? hashGame());
  const [tab, setTab] = useState<Tab>(incoming ? "builder" : "solver");
  const [seed, setSeed] = useState<SetSelection | null>(() => incoming?.selection ?? null);
  const [seedName, setSeedName] = useState(incoming?.name ?? "");
  const [seedKey, setSeedKey] = useState(0);
  const [savedByGame, setSavedByGame] = useState<Record<Game, SavedSet[]>>(() => ({
    mhfu: loadSavedSets(GAMES.mhfu.storageKey),
    mh3u: loadSavedSets(GAMES.mh3u.storageKey),
    mh4u: loadSavedSets(GAMES.mh4u.storageKey),
  }));
  const [charmsByGame, setCharmsByGame] = useState<Record<Game, Charm[]>>(() => ({
    mhfu: incoming?.game === "mhfu" ? incoming.charms : [],
    mh3u: incoming?.game === "mh3u" ? incoming.charms : loadCharms("mh3u-charms"),
    mh4u: incoming?.game === "mh4u" ? incoming.charms : loadCharms("mh4u-charms"),
  }));

  const data = GAMES[game];
  const saved = savedByGame[game];
  const charms = charmsByGame[game];

  useEffect(() => {
    persistCharms("mh3u-charms", charmsByGame.mh3u);
    persistCharms("mh4u-charms", charmsByGame.mh4u);
  }, [charmsByGame]);

  useEffect(() => {
    history.replaceState(null, "", `#${game}`);
    document.title = data.title;
  }, [game, data.title]);

  const updateSaved = (fn: (old: SavedSet[]) => SavedSet[]) => {
    setSavedByGame((all) => {
      const next = fn(all[game]);
      persistSavedSets(data.storageKey, next);
      return { ...all, [game]: next };
    });
  };

  const switchGame = (next: Game) => {
    if (next === game) return;
    setGame(next);
    setTab("solver");
    setSeed(null);
    setSeedName("");
  };

  const openSelection = (sel: SetSelection, name = "") => {
    setSeed(sel);
    setSeedName(name);
    setSeedKey((k) => k + 1);
    setTab("builder");
  };

  const saveSet = (name: string, sel: SetSelection) => {
    updateSaved((old) => [makeSavedSet(name, sel), ...old]);
  };

  const saveResult = (r: SolverResult) => {
    const name = window.prompt(
      "Set name",
      r.active.slice(0, 2).map((a) => a.name).join(" / ") || "Solver set",
    );
    if (name) saveSet(name, selectionFromResult(r));
  };

  return (
    <GameProvider game={game} data={data}>
      <div className="app">
        <header className="top">
          <div>
            <div className="game-switch">
              <button className={game === "mhfu" ? "active" : ""} onClick={() => switchGame("mhfu")}>MHFU</button>
              <button className={game === "mh3u" ? "active" : ""} onClick={() => switchGame("mh3u")}>MH3U</button>
              <button className={game === "mh4u" ? "active" : ""} onClick={() => switchGame("mh4u")}>MH4U</button>
            </div>
            <h1>{data.title}</h1>
            <p className="dim small">
              {data.blurb} · {data.meta.armor} armor · {data.meta.decorations} jewels · {data.meta.weapons} weapons
              {data.charmSupport ? " · charms" : ""}
            </p>
          </div>
          <nav className="tabs">
            <button className={tab === "solver" ? "active" : ""} onClick={() => setTab("solver")}>Solver</button>
            <button className={tab === "builder" ? "active" : ""} onClick={() => setTab("builder")}>Builder</button>
            <button className={tab === "sets" ? "active" : ""} onClick={() => setTab("sets")}>Sets{saved.length ? ` (${saved.length})` : ""}</button>
            <button className={tab === "weapons" ? "active" : ""} onClick={() => setTab("weapons")}>Weapons</button>
            {game === "mhfu" && (
              <button className={tab === "compare" ? "active" : ""} onClick={() => setTab("compare")}>Compare</button>
            )}
            {data.charmSupport && (
              <button className={tab === "charms" ? "active" : ""} onClick={() => setTab("charms")}>Charms{charms.length ? ` (${charms.length})` : ""}</button>
            )}
          </nav>
        </header>

        <main>
          {tab === "solver" && (
            <Solver
              key={game}
              charms={charms}
              onOpen={(r) => openSelection(selectionFromResult(r))}
              onSave={saveResult}
            />
          )}
          {tab === "builder" && (
            <Builder
              key={`${game}-${seedKey}`}
              initial={seed}
              initialName={seedName}
              charms={charms}
              onSave={saveSet}
            />
          )}
          {tab === "sets" && (
            <Sets
              key={game}
              saved={saved}
              charms={charms}
              onLoad={(s) => openSelection(selectionFromSaved(s), s.name)}
              onDelete={(id) => updateSaved((old) => old.filter((s) => s.id !== id))}
              onRename={(id, name) => updateSaved((old) => old.map((s) => (s.id === id ? { ...s, name } : s)))}
            />
          )}
          {tab === "weapons" && <Weapons key={game} />}
          {tab === "compare" && game === "mhfu" && <WeaponCompare />}
          {tab === "charms" && data.charmSupport && (
            <Charms
              charms={charms}
              onChange={(next) => setCharmsByGame((all) => ({ ...all, [game]: next }))}
            />
          )}
        </main>

        <footer className="foot dim small">
          {game === "mhfu" ? (
            <>
              Data:{" "}
              <a href="https://github.com/vallode/mhfu-blacksmith" target="_blank" rel="noreferrer">mhfu-blacksmith</a> (MIT),{" "}
              <a href="https://github.com/AthenaADP/MHFU-ASS" target="_blank" rel="noreferrer">Athena's ASS</a> (MIT), and{" "}
              <a href="https://github.com/Kolyn090/mhfu-db" target="_blank" rel="noreferrer">mhfu-db</a> hitzones.
            </>
          ) : game === "mh3u" ? (
            <>
              Data:{" "}
              <a href="https://github.com/AthenaADP/MH3U-ASS" target="_blank" rel="noreferrer">Athena's ASS MH3U</a> (MIT) and{" "}
              <a href="https://github.com/ArmoredRaven17/mh3u-collection-tracker" target="_blank" rel="noreferrer">MH3U Collection Tracker</a>. Game data © Capcom.
            </>
          ) : (
            <>
              Data:{" "}
              <a href="https://github.com/AthenaADP/MH4U-ASS" target="_blank" rel="noreferrer">Athena's ASS MH4U</a> (MIT) and{" "}
              <a href="https://github.com/ArmoredRaven17/mh4u-collection-tracker" target="_blank" rel="noreferrer">MH4U Collection Tracker</a>. Game data © Capcom.
            </>
          )}{" "}
          Monster Hunter is a trademark of Capcom. Personal fan tool.
        </footer>
      </div>
    </GameProvider>
  );
}
