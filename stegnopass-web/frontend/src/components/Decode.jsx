import { useState } from "react";

export default function Decode({ api }) {
  const [image, setImage] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [site, setSite] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [vault, setVault] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setVault(null);

    if (!image) { setMsg({ type: "error", text: "Vault image required" }); return; }
    if (!passphrase) { setMsg({ type: "error", text: "Master passphrase required" }); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append("image", image);
    fd.append("passphrase", passphrase);
    if (site.trim()) fd.append("site", site.trim());

    try {
      const res = await fetch(`${api}/decode`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Decoding failed");
      }

      const data = await res.json();
      if (data.site) {
        setMsg({ type: "success", text: `🔓 Password for ${data.site}: ${data.password}` });
      } else {
        setVault(data.entries);
        setMsg({ type: "success", text: `🔓 Vault decrypted — ${data.count} entries` });
      }
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>🔓 Decrypt a vault image</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Vault image</label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </div>

        <div className="form-group">
          <label>Master passphrase</label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter master passphrase…"
          />
        </div>

        <div className="form-group">
          <label>Site (optional — leave blank to show all)</label>
          <input
            type="text"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="e.g. gmail.com"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <><span className="spinner"></span>Decrypting…</> : "Decrypt Vault"}
        </button>
      </form>

      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

      {vault && (
        <div className="results">
          <h3>All entries</h3>
          {Object.entries(vault).map(([site, pw]) => (
            <div className="result-item" key={site}>
              <span className="result-site">{site}</span>
              <span className="result-pw">{pw}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
