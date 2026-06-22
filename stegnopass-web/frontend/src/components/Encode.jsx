import { useState, useRef } from "react";

export default function Encode({ api }) {
  const [passwords, setPasswords] = useState([{ site: "", password: "" }]);
  const [passphrase, setPassphrase] = useState("");
  const [image, setImage] = useState(null);
  const [fromVault, setFromVault] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [dlUrl, setDlUrl] = useState(null);
  const [dlFilename, setDlFilename] = useState(null);
  const formRef = useRef(null);

  const addRow = () => setPasswords([...passwords, { site: "", password: "" }]);

  const removeRow = (i) => {
    if (passwords.length === 1) return;
    setPasswords(passwords.filter((_, idx) => idx !== i));
  };

  const updateRow = (i, field, value) => {
    const copy = [...passwords];
    copy[i][field] = value;
    setPasswords(copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setDlUrl(null);

    const valid = passwords.filter((p) => p.site.trim() && p.password.trim());
    if (valid.length === 0) {
      setMsg({ type: "error", text: "At least one site:password entry required" });
      return;
    }
    if (!passphrase) {
      setMsg({ type: "error", text: "Master passphrase required" });
      return;
    }
    if (!image) {
      setMsg({ type: "error", text: "Cover image required" });
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.append("image", image);
    if (fromVault) fd.append("fromVault", fromVault);
    fd.append("passphrase", passphrase);
    fd.append("passwords", JSON.stringify(valid));

    try {
      const res = await fetch(`${api}/encode`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Encoding failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const name = `vault_${Date.now()}.png`;
      setDlUrl(url);
      setDlFilename(name);
      setMsg({ type: "success", text: `Vault created with ${valid.length} site(s)!` });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>🔒 Create a vault image</h2>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Cover image</label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setImage(e.target.files[0])}
          />
          <div className="field-hint">The image that will hide your vault</div>
        </div>

        <div className="form-group">
          <label>Existing vault (optional)</label>
          <input
            type="file"
            accept="image/png"
            onChange={(e) => setFromVault(e.target.files[0] || null)}
          />
          <div className="field-hint">Load an existing vault to add/update entries</div>
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
          <label>Site:Password entries</label>
          <div className="pw-entries">
            {passwords.map((entry, i) => (
              <div className="pw-row" key={i}>
                <input
                  type="text"
                  placeholder="site.com"
                  value={entry.site}
                  onChange={(e) => updateRow(i, "site", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="password"
                  value={entry.password}
                  onChange={(e) => updateRow(i, "password", e.target.value)}
                />
                <button type="button" onClick={() => removeRow(i)} title="Remove">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add" onClick={addRow}>
            + Add another site
          </button>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <><span className="spinner"></span>Encoding…</> : "Encode & Download Vault"}
        </button>
      </form>

      {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

      {dlUrl && (
        <div className="download-section">
          <a href={dlUrl} download={dlFilename} className="download-link">
            ⬇ Download {dlFilename}
          </a>
        </div>
      )}
    </div>
  );
}
