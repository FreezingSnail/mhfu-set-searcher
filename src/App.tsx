import { useEffect, useState } from "react";
import Solver from "./components/Solver";
import Builder from "./components/Builder";
import Weapons from "./components/Weapons";
import Sets from "./components/Sets";
import { META } from "./lib/data";
import type { SolverResult } from "./lib/types";
import {
  loadSavedSets,
  makeSavedSet,
  persistSavedSets,
  selectionFromResult,
  selectionFromSaved,
  type SavedSet,
  type SetSelection,
} from "./lib/build";
import "./styles.css";

type Tab = "solver" | "builder" | "sets" | "weapons";

export default function App() {
  const [tab, setTab] = useState<Tab>("solver");
  const [seed, setSeed] = useState<SetSelection | null>(null);
  const [seedKey, setSeedKey] = useState(0);
  const [saved, setSaved] = useState<SavedSet[]>(loadSavedSets);

  useEffect(() => persistSavedSets(saved), [saved]);

  const openSelection = (sel: SetSelection) => {
    setSeed(sel);
    setSeedKey((k) => k + 1);
    setTab("builder");
  };

  const saveSet = (name: string, sel: SetSelection) => {
    setSaved((old) => [makeSavedSet(name, sel), ...old]);
  };

  const saveResult = (r: SolverResult) => {
    const name = window.prompt(
      "Set name",
      r.active.slice(0, 2).map((a) => a.name).join(" / ") || "Solver set",
    );
    if (name) saveSet(name, selectionFromResult(r));
  };

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>MHFU Set Searcher</h1>
          <p className="dim small">
            Freedom Unite armor solver, builder, and weapon trees · {META.armor} armor · {META.decorations} jewels · {META.weapons} weapons
          </p>
        </div>
        <nav className="tabs">
          <button className={tab === "solver" ? "active" : ""} onClick={() => setTab("solver")}>Solver</button>
          <button className={tab === "builder" ? "active" : ""} onClick={() => setTab("builder")}>Builder</button>
          <button className={tab === "sets" ? "active" : ""} onClick={() => setTab("sets")}>Sets{saved.length ? ` (${saved.length})` : ""}</button>
          <button className={tab === "weapons" ? "active" : ""} onClick={() => setTab("weapons")}>Weapons</button>
        </nav>
      </header>

      <main>
        {tab === "solver" && (
          <Solver
            onOpen={(r) => openSelection(selectionFromResult(r))}
            onSave={saveResult}
          />
        )}
        {tab === "builder" && <Builder key={seedKey} initial={seed} onSave={saveSet} />}
        {tab === "sets" && (
          <Sets
            saved={saved}
            onLoad={(s) => openSelection(selectionFromSaved(s))}
            onDelete={(id) => setSaved((old) => old.filter((s) => s.id !== id))}
            onRename={(id, name) => setSaved((old) => old.map((s) => (s.id === id ? { ...s, name } : s)))}
          />
        )}
        {tab === "weapons" && <Weapons />}
      </main>

      <footer className="foot dim small">
        Data: <a href="https://github.com/vallode/mhfu-blacksmith" target="_blank" rel="noreferrer">mhfu-blacksmith</a> (MIT) and{" "}
        <a href="https://github.com/AthenaADP/MHFU-ASS" target="_blank" rel="noreferrer">Athena's ASS</a> (MIT).
        Monster Hunter is a trademark of Capcom. Personal fan tool.
      </footer>
    </div>
  );
}
