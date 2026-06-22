Markdown
# StegnoPass v2 🛡️📷

Hide a vault of passwords inside a single image using steganography + AES-256-GCM.

StegnoPass v2 is a secure, cross-platform, multi-client steganographic password manager that conceals an encrypted JSON vault of credentials inside completely ordinary-looking PNG images. By combining **AES-256-GCM authenticated encryption** with **Spatial Domain Least Significant Bit (LSB) steganography**, it guarantees local-first, zero-network-traffic credential retrieval without relying on a centralized cloud infrastructure.

## What's new in v2

| Feature | Description |
|---|---|
| **Multi-password vault** | One image holds `{site: password}` JSON, encrypted as a unit |
| **Auto site-detection** | Extension reads `window.location.hostname` and fills the right password automatically |
| **Zero network** | All extraction and decryption runs locally in your browser |
| **v1 compatibility** | Old single-password images still work |

---

## 🚀 Key Features

- **Cross-Platform Interoperability:** A uniform binary payload structure ensures seamless vault generation and decoding across a Python CLI, Node.js/Express backend, and a vanilla JavaScript browser extension.
- **Zero-Network-Traffic Extension:** A Manifest V3 Chrome extension that intercepts drag-and-drop actions on password fields, parsing pixel data and decrypting vaults 100% locally using the browser's Web Crypto API.
- **Framework-Compatible Autofill:** Employs native prototype setters and synthetic JavaScript input/change events to successfully bypass state-binding restrictions in React and Vue target fields.
- **Authenticated Local Vaults:** Uses AES-256-GCM to prevent silent payload tampering, backed by PBKDF2-SHA1 key derivation stretching a user master passphrase over 100,000 iterations.
- **Intuitive Web Workspace:** Includes a modern React/Vite single-page dashboard featuring an interactive dynamic password matrix for fast encryption/decryption handling.

---

## 🏗️ Architecture & Component Stack

StegnoPass v2 relies on three interoperable components speaking to a uniform binary layer:

| Component | Runtime / Stack | Cryptographic Engine | Steganography Layer |
| :--- | :--- | :--- | :--- |
| **Python CLI** | Python 3.x / PyCryptodome | PyCryptodome | Manual LSB Bit-shifting |
| **Chrome Extension** | Vanilla JS / MV3 | Web Crypto API | HTML5 Canvas API (Manual LSB) |
| **Web Backend** | Node.js / Express.js | `crypto` (Built-in) | Jimp Engine |
| **Web Frontend** | React 18 / Vite | *Delegates to Backend* | *Delegates to Backend* |

---

## 🔒 Specification & Cryptographic Design

### 1. Binary Payload Wire Format
Every encoded asset contains a rigid layout compressed inside a Base64 configuration before direct bit-level spatial embedding:

[ SPVT (4B Magic) ] [ Salt (16B) ] [ Nonce (16B) ] [ Ciphertext (N Bytes) ] [ GCM Tag (16B) ]


### 2. Encryption Pipeline
1. A **16-byte cryptographically secure random salt** is provisioned per generation instance.
2. Key stretching executes via **PBKDF2-SHA1 with 100,000 iterations**, deriving an authoritative **32-byte AES key** from the master passphrase.
3. The underlying raw JSON map (`{ "site": "password" }`) is processed using **AES-256-GCM** with a distinct **16-byte initialization vector (nonce)**, compiling the ciphertext block alongside a **16-byte authentication tag**.

### 3. Steganography Bit Allocation Engine
- The payload string translates directly into an **8-bit per character** continuous stream.
- A **32-bit big-endian unsigned integer** acts as an explicit header declaring total payload bit capacity.
- The layout steps over cover image pixels in strict raster grid order (**left-to-right, top-to-bottom**), replacing the exact Least Significant Bit of **Red, Green, and Blue** channels uniformly (yielding an allocation density of exactly 3 bits/pixel).

---

## 🛠️ Installation & Setup

### CLI Setup
```bash
cd cli/
pip install -r requirements.txt
Web Application Configuration
Spin up the decoupled client and server environments independently:

Bash
# Setup Backend Server (Port 3001)
cd stegnopass-web/backend
npm install
npm start

# Setup Frontend Application (Port 5173 via separate terminal)
cd stegnopass-web/frontend
npm install
npm run dev
Browser Extension Setup
Unzip / open the extension/ folder.

Go to chrome://extensions in Google Chrome.

Enable Developer mode (top right toggle).

Click Load unpacked and select the project's extension/ folder.

🎯 Usage
CLI Operations
Encode — Create or update a vault image
Bash
# Single password
python stegnopass.py encode \
  --image cover.png \
  --passphrase "my master secret" \
  --add-password "gmail.com:MyGmailPass123" \
  --output vault.png

# Multiple passwords in one image
python stegnopass.py encode \
  --image cover.png \
  --passphrase "my master secret" \
  --add-password "gmail.com:MyGmailPass123" \
  --add-password "github.com:MyGithubToken!" \
  --add-password "bank.com:Str0ngBankPass" \
  --output vault.png

# Update an existing vault (add more passwords iteratively)
python stegnopass.py encode \
  --image cover.png \
  --passphrase "my master secret" \
  --from-vault vault.png \
  --add-password "twitter.com:NewTwitterPass" \
  --output vault_updated.png
Decode — Retrieve a password
Bash
# Get password for a specific site
python stegnopass.py decode \
  --image vault.png \
  --passphrase "my master secret" \
  --site gmail.com

# Show all passwords
python stegnopass.py decode \
  --image vault.png \
  --passphrase "my master secret"
List — See which sites are stored
Bash
python stegnopass.py list \
  --image vault.png \
  --passphrase "my master secret"
Browser Extension Workflow
Drag your vault.png onto any password field on any website.

A modal UI layer appears asking for your master passphrase.

The extension performs the following local workflow:

Extracts the hidden payload via local LSB steganography bit parsing using HTML5 Canvas.

Decrypts the AES-256-GCM vault entirely inside the browser's sandbox environment.

Reads window.location.hostname, matches it against vault keys, and injects the credential.

If multiple entries exist or no explicit domain matches, a localized UI dropdown allows manual selection.

🔒 Security Model Summary
AES-256-GCM with authenticated encryption guarantees absolute data integrity; any unauthorized structural tampering with the underlying payload causes immediate verification rejection.

PBKDF2-SHA1 with 100,000 iterations enforces cryptographic defense against offline brute-force attempts across all native environments (Python, Node.js, and Web Crypto API).

Zero Network Traffic Deployment: Security is localized entirely within the application clients; no passwords, encryption keys, or unmanaged imagery leave the client runtime.

Magic Bytes Validation: Pre-verification using a distinct SPVT magic byte header guarantees structural version checking (discriminating v2 multi-vault structures from v1 single-password configurations) before attempting expensive key extraction cycles.
