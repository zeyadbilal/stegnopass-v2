import { useState } from "react";
import Encode from "./components/Encode";
import Decode from "./components/Decode";

const API = "/api";

export default function App() {
  const [tab, setTab] = useState("encode");

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-text">Stegno<span>Pass</span> <sup className="badge">v2</sup></div>
        </div>
        <p className="subtitle">Hide a vault of passwords inside a single image</p>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === "encode" ? "active" : ""}`} onClick={() => setTab("encode")}>
          Encode
        </button>
        <button className={`tab ${tab === "decode" ? "active" : ""}`} onClick={() => setTab("decode")}>
          Decode
        </button>
      </nav>

      <main className="main">
        {tab === "encode" ? <Encode api={API} /> : <Decode api={API} />}
      </main>
    </div>
  );
}
