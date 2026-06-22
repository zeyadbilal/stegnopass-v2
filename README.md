# StegnoPass v2

Hide a vault of passwords inside a single image using steganography + AES-256-GCM.

## What's new in v2

| Feature | Description |
|---|---|
| **Multi-password vault** | One image holds `{site: password}` JSON, encrypted as a unit |
| **Auto site-detection** | Extension reads `window.location.hostname` and fills the right password automatically |
| **Zero network** | All extraction and decryption runs locally in your browser |
| **v1 compatibility** | Old single-password images still work |

---

## CLI Setup

```bash
cd cli/
pip install -r requirements.txt
```

---

## CLI Usage

### Encode — create a vault image

```bash
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

# Update an existing vault (add more passwords)
python stegnopass.py encode \
  --image cover.png \
  --passphrase "my master secret" \
  --from-vault vault.png \
  --add-password "twitter.com:NewTwitterPass" \
  --output vault_updated.png
```

### Decode — retrieve a password

```bash
# Get password for a specific site
python stegnopass.py decode \
  --image vault.png \
  --passphrase "my master secret" \
  --site gmail.com

# Show all passwords
python stegnopass.py decode \
  --image vault.png \
  --passphrase "my master secret"

```

### List — see which sites are stored

```bash
python stegnopass.py list \
  --image vault.png \
  --passphrase "my master secret"
```

---

## Browser Extension Setup

1. Unzip / open the `extension/` folder
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `extension/` folder

---

## How the extension works

1. Drag your `vault.png` onto **any password field** on any website
2. A modal appears asking for your master passphrase
3. The extension:
   - Extracts the hidden payload via LSB steganography
   - Decrypts the AES-256-GCM vault
   - Reads `window.location.hostname` and matches it to the vault keys
   - If matched → fills the field instantly
   - If multiple entries, none matched → shows a dropdown to pick
---



## Security model

- **AES-256-GCM** with authenticated encryption (tamper-proof)
- **PBKDF2-SHA1, 100k iterations** for key derivation (same in Python and browser)
- **Zero network traffic** — everything runs locally
- **Magic bytes** `SPVT` distinguish v2 vault images from v1 single-password images
- The image itself reveals nothing — without the passphrase it's an ordinary PNG


