// StegnoPass v2 — content.js
// Features:
//   • LSB steganography extraction
//   • Multi-password vault (JSON map)
//   • Auto site-detection → picks password automatically

(function () {
  "use strict";

  // ── Constants ──────────────────────────────────────────────────────────────
  const ID        = [0x53, 0x50, 0x56, 0x54]; 
  const SALT_SIZE    = 16;
  const ITERATIONS   = 100000;

  // ── Drag-highlight ─────────────────────────────────────────────────────────
  function isPasswordField(el) {
    if (!el) return false;
    if (el.tagName?.toLowerCase() === "input" && el.type === "password") return true;
    if (el.tagName?.toLowerCase() === "input" &&
        el.getAttribute("autocomplete")?.includes("password")) return true;
    return false;
  }

  document.addEventListener("dragover", e => {
    if (isPasswordField(e.target)) e.target.classList.add("sp-drop-target");
  }, true);

  document.addEventListener("dragleave", e => {
    e.target.classList.remove("sp-drop-target");
  }, true);

  document.addEventListener("drop", e => {
    const target = e.target;
    if (!isPasswordField(target)) return;
    target.classList.remove("sp-drop-target");
    const file = e.dataTransfer?.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    e.preventDefault();
    e.stopPropagation();
    showModal(file, target);
  }, true);

  // ── LSB extraction ─────────────────────────────────────────────────────────
  function lsbExtract(canvas) {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const px = ctx.getImageData(0, 0, width, height).data;
    let bits = "";
    for (let i = 0; i < px.length; i += 4) {
      bits += (px[i]   & 1).toString();
      bits += (px[i+1] & 1).toString();
      bits += (px[i+2] & 1).toString();
    }
    const len = parseInt(bits.slice(0, 32), 2);
    if (!len || len > bits.length - 32) throw new Error("No LSB data found");
    return bitsToStr(bits.slice(32, 32 + len));
  }

  // ── Bit/string helpers ─────────────────────────────────────────────────────
  function bitsToStr(bits) {
    let s = "";
    for (let i = 0; i < bits.length; i += 8) {
      const b = bits.slice(i, i + 8);
      if (b.length === 8) s += String.fromCharCode(parseInt(b, 2));
    }
    return s;
  }

  async function loadCanvas(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width  = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        res(c);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Image load failed")); };
      img.src = url;
    });
  }

  // ── AES-256-GCM decryption ─────────────────────────────────────────────────
  // Layout: ID(4) + salt(16) + nonce(16) + ciphertext + tag(16)
  async function decryptVault(payloadStr, passphrase) {
    const bin  = atob(payloadStr);
    const data = Uint8Array.from(bin, c => c.charCodeAt(0));

    if (!ID.every((b, i) => data[i] === b)) {
      throw new Error("Not a StegnoPass v2 image (wrong ID bytes).");
    }

    const body  = data.slice(4);
    const salt  = body.slice(0, SALT_SIZE);
    const nonce = body.slice(SALT_SIZE, SALT_SIZE + 16);
    const ct    = body.slice(SALT_SIZE + 16);
    const key   = await deriveKey(passphrase, salt);
    const dec   = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 }, key, ct
    );
    return JSON.parse(new TextDecoder().decode(dec));
  }

  async function deriveKey(passphrase, salt) {
    const raw = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(passphrase),
      { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-1" },
      raw, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );
  }

  // ── Site detection ─────────────────────────────────────────────────────────
  function currentSite() {
    try {
      return window.location.hostname.replace(/^www\./, "").toLowerCase();
    } catch (_) { return null; }
  }

  function pickPassword(vault, site) {
    if (!site) return null;
    if (vault[site]) return { key: site, pw: vault[site] };
    for (const key of Object.keys(vault)) {
      if (site === key || site.endsWith("." + key)) return { key, pw: vault[key] };
    }
    return null;
  }

  // ── Fill field (works with React/Vue synthetic events) ────────────────────
  function fillField(field, value) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, "value"
    )?.set;
    if (setter) setter.call(field, value);
    else field.value = value;
    field.dispatchEvent(new Event("input",  { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // ── Format bytes ───────────────────────────────────────────────────────────
  function fmtBytes(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b/1024).toFixed(1) + " KB";
    return (b/1048576).toFixed(1) + " MB";
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function showModal(file, targetField) {
    const thumbUrl = URL.createObjectURL(file);
    const site     = currentSite();
    let canvas     = null;

    const overlay = document.createElement("div");
    overlay.id = "stegnopass-overlay";
    overlay.innerHTML = `
      <div id="stegnopass-modal" role="dialog" aria-modal="true">

        <div class="sp-logo">
          <div class="sp-logo-icon">🔐</div>
          <div class="sp-logo-text">Stegno<span>Pass</span> <sup class="sp-v2">v2</sup></div>
        </div>

        <div class="sp-preview">
          <img src="${thumbUrl}" alt="stego preview"/>
          <div class="sp-preview-info">
            <div class="sp-preview-name"></div>
            <div class="sp-preview-size">${fmtBytes(file.size)}</div>
          </div>
        </div>

        ${site ? `<div class="sp-site-badge">🌐 Detected site: <strong>${site}</strong></div>` : ""}

        <label for="sp-passphrase">Master Passphrase</label>
        <div class="sp-input-wrap">
          <input id="sp-passphrase" type="password" placeholder="Enter passphrase…" autocomplete="off"/>
          <button class="sp-toggle-vis" tabindex="-1" title="Show/hide">👁</button>
        </div>

        <div class="sp-error"  id="sp-error"></div>
        <div class="sp-success" id="sp-success"></div>

        <div id="sp-site-picker" style="display:none">
          <label for="sp-site-select">Choose site</label>
          <select id="sp-site-select" class="sp-select"></select>
        </div>

        <div class="sp-actions">
          <button class="sp-btn sp-btn-cancel"  id="sp-cancel">Cancel</button>
          <button class="sp-btn sp-btn-decrypt" id="sp-decrypt">Decrypt &amp; Fill</button>
        </div>

      </div>`;
    overlay.querySelector(".sp-preview-name").textContent = file.name;

    document.body.appendChild(overlay);

    const input      = overlay.querySelector("#sp-passphrase");
    const decryptBtn = overlay.querySelector("#sp-decrypt");
    const cancelBtn  = overlay.querySelector("#sp-cancel");
    const toggleBtn  = overlay.querySelector(".sp-toggle-vis");
    const errorBox   = overlay.querySelector("#sp-error");
    const successBox = overlay.querySelector("#sp-success");
    const picker     = overlay.querySelector("#sp-site-picker");
    const siteSelect = overlay.querySelector("#sp-site-select");

    input.focus();

    const close = () => { URL.revokeObjectURL(thumbUrl); overlay.remove(); };
    const showErr = msg => {
      errorBox.textContent = "⚠️ " + msg;
      errorBox.classList.add("visible");
      successBox.classList.remove("visible");
    };
    const clearErr = () => { errorBox.classList.remove("visible"); };

    toggleBtn.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
    });
    cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", e => {
      if (e.key === "Escape") close();
      if (e.key === "Enter") decryptBtn.click();
    });
    input.addEventListener("input", clearErr);

    decryptBtn.addEventListener("click", async () => {
      const passphrase = input.value.trim();
      if (!passphrase) { showErr("Enter your passphrase."); return; }

      decryptBtn.disabled = true;
      decryptBtn.innerHTML = `<span class="sp-spinner"></span>Decrypting…`;
      clearErr();

      try {
        if (!canvas) canvas = await loadCanvas(file);

        const raw   = lsbExtract(canvas);
        const vault = await decryptVault(raw, passphrase);
        const keys  = Object.keys(vault);

        const auto = pickPassword(vault, site);
        if (auto) {
          fillField(targetField, auto.pw);
          successBox.textContent = `✅ Filled password for ${auto.key}`;
          successBox.classList.add("visible");
          decryptBtn.textContent = "✅ Done";
          setTimeout(() => { close(); targetField.focus(); }, 1200);
          return;
        }

        if (site) {
          showErr(`No password found for "${site}" in this vault`);
          decryptBtn.disabled = false;
          decryptBtn.textContent = "Decrypt & Fill";
          return;
        }

        if (keys.length > 1) {
          siteSelect.innerHTML = keys
            .map(k => `<option value="${k}">${k}</option>`)
            .join("");
          picker.style.display = "block";
          decryptBtn.disabled  = false;
          decryptBtn.textContent = "Fill Selected";
          successBox.textContent = `🔓 ${keys.length} passwords found — choose one:`;
          successBox.classList.add("visible");

          decryptBtn.onclick = () => {
            const key = siteSelect.value;
            fillField(targetField, vault[key]);
            successBox.textContent = `✅ Filled password for ${key}`;
            setTimeout(() => { close(); targetField.focus(); }, 1000);
          };
          return;
        }

        fillField(targetField, vault[keys[0]]);
        successBox.textContent = `✅ Filled password for ${keys[0]}`;
        successBox.classList.add("visible");
        decryptBtn.textContent = "✅ Done";
        setTimeout(() => { close(); targetField.focus(); }, 1200);

      } catch (err) {
        const isWrongKey = err.name === "OperationError";
        showErr(isWrongKey ? "Wrong passphrase" : err.message);
        decryptBtn.disabled = false;
        decryptBtn.textContent = "Decrypt & Fill";
        input.value = "";
        input.focus();
      }
    });
  }

})();