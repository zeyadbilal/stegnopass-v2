


## Page 1


## Course:
Information Security  |  Course Code: CS-SEC
## Submitted To:
## Eng. Mohammed Nawar
## Submitted By:

B.N. Name
## 6 Ashraf Mohamed Abobaker
## 16 Amr Khaled Kamel
## 18 Mohamed Ashraf Abdelmaqsoud
## 4 Ahmad Mohamed Elmitwalli
## Computer












## 17
## Ziad Bilal Gamal
## 11
## Joseph Lotfy
## Communication


## Page 2
## 1. Abstract / Executive Summary
StegnoPass v2 is a multi-platform steganographic password manager that conceals an encrypted
vault of credentials inside an ordinary PNG image. The system combines AES-256-GCM
authenticated encryption with LSB (Least Significant Bit) steganography to store a JSON map of
site-to-password pairs in the pixel data of a cover image. A shared binary payload format — magic
bytes, salt, nonce, ciphertext, and GCM authentication tag — ensures complete interoperability
between the Python command-line tool, the Express.js/React web application, and the Chrome
browser extension.
The project successfully demonstrates zero-network-traffic credential retrieval: the extension
decrypts credentials locally using the Web Crypto API, auto-detects the active site by hostname,
and fills the target password field using React- and Vue-compatible synthetic events. A three-
attempt self-destruct mechanism locks the UI on repeated wrong-passphrase failures.
Key gaps identified include orphaned DCT-related CSS classes in the frontend that should be
removed as dead code, missing test suites across all components, no input rate-limiting on the
backend API, plaintext password display in the web decode view, and no containerisation or CI/CD
pipeline. This report provides a detailed analysis of the architecture, cryptographic design,
steganography engine, cross-platform compatibility, and a prioritised set of improvement
recommendations.


## 2. Introduction
Password managers are an essential tool in modern cybersecurity, yet most rely on cloud
synchronisation that creates a centralised attack surface. StegnoPass v2 proposes an alternative
approach: embedding an encrypted password vault inside an image file using steganography, so
the vault can be stored anywhere a photo can be stored — a local folder, a USB drive, a chat
message, or a social media profile — without revealing that it contains sensitive data.
The core insight is that LSB steganography introduces imperceptible changes to pixel values
(flipping the least-significant bit of each RGB channel), while AES-256-GCM ensures the embedded
payload is cryptographically secure even if the image is obtained by an adversary. The combination
makes StegnoPass v2 both covert and confidential.
This project was developed as three integrated components: an Express.js/React web interface for
browser-based access, a Chrome browser extension for seamless autofill, and a shared backend
API. The cross-component design enforces a single, identical binary payload format and key-
derivation scheme, ensuring vaults created via the web interface can be decoded by the Chrome
extension and vice versa.








## Page 3
## 3. Objectives
## Primary Objectives
- Design and implement a multi-password vault encrypted with AES-256-GCM and embedded
in a PNG image via LSB steganography.
- Ensure complete binary payload compatibility across Node.js (crypto module) and browser
(Web Crypto API).
- Build a Chrome extension (Manifest v3) that extracts and decrypts vault images locally with
zero network traffic.
- Implement auto site-detection and React/Vue-compatible password field injection in the
browser extension.
- Provide a usable web interface (React/Vite frontend + Express backend) for encoding and
decoding vault images without requiring local software installation.
## Secondary Objectives
- Support iterative vault updates (loading an existing vault image and adding new entries).


## 4. Literature Review / Background
## 4.1 Steganography
Steganography is the practice of hiding a message within a non-secret carrier so that the very
existence of the message is concealed. Digital image steganography commonly operates in one of
two domains: the spatial domain (modifying pixel values directly, e.g., LSB substitution) or the
frequency domain (modifying transform coefficients, e.g., DCT-based embedding as used in JPEG
compression). LSB substitution replaces the least-significant bit of each colour channel with a
payload bit, inducing a maximum colour change of 1 (out of 255) per channel — imperceptible to
the human visual system but detectable by statistical steganalysis tools such as StegExpose or Chi-
square tests.
DCT-based embedding (popularised by the F5 and OutGuess algorithms) modifies quantised DCT
coefficients in the frequency domain, making statistical detection considerably harder at the cost of
lower capacity and higher computational overhead. StegnoPass v2 acknowledges both modes but
currently implements only LSB.
## 4.2 Authenticated Encryption
AES-256-GCM (Advanced Encryption Standard in Galois/Counter Mode with a 256-bit key)
provides both confidentiality and integrity. The GCM authentication tag — 16 bytes appended to the
ciphertext — allows the decrypting party to detect any tampering with the ciphertext before it is
decrypted. This is the correct mode for a password vault because a corrupted or attacker-modified
vault will be rejected by the tag verification step rather than producing garbage plaintext silently.
## 4.3 Key Derivation
PBKDF2 (Password-Based Key Derivation Function 2) with HMAC-SHA1 and 100,000 iterations is
used to derive a 32-byte AES key from the user's master passphrase and a random 16-byte salt.


## Page 4
Although SHA-256 is the recommended hash for new systems (per NIST SP 800-132), PBKDF2-
SHA1 was chosen here to ensure identical derivation across Python's pycryptodome, Node.js's
built-in crypto module, and the browser's Web Crypto API — all three of which expose PBKDF2-
SHA1 natively. The 100,000-iteration count meets OWASP's 2023 minimum recommendation for
## PBKDF2-SHA1.
## 4.4 Manifest V3 Chrome Extensions
Chrome's Manifest V3 extension platform (mandatory from June 2023) replaces background pages
with service workers and restricts dynamic code execution. StegnoPass v2 operates entirely as a
content script injected at document_idle, using the Web Crypto API for all cryptographic operations.
This design is forward-compatible with MV3 constraints and requires only the activeTab and
scripting permissions.


## 5. Methodology / System Design
5.1 High-Level Architecture
StegnoPass v2 is composed of three independent but interoperable components that share a single
binary payload format:
## Component Language /
## Runtime
## Crypto Library Stego Library
Chrome Extension Browser JS Web Crypto API Canvas API (manual LSB)
Express Backend Node.js crypto (built-in) Jimp
React Frontend React 18 + Vite Delegates to backend Delegates to backend

## 5.2 Binary Payload Format
Every StegnoPass v2 image encodes an identical payload regardless of which component created
it:
[SPVT — 4 bytes magic] [Salt — 16 bytes] [Nonce — 16 bytes] [Ciphertext — N bytes]
[GCM Tag — 16 bytes]
The full payload is base64-encoded before LSB embedding (so every character is a printable ASCII
byte). The 32-bit big-endian length header prepended by the steganography layer indicates the
number of payload bits embedded. The SPVT magic bytes serve as a fast sanity check and version
discriminator before the more expensive PBKDF2 derivation is attempted.
## 5.3 Key Derivation & Encryption Flow
- User provides a master passphrase.
- A random 16-byte salt is generated (per encode operation).
- PBKDF2-SHA1 with 100,000 iterations derives a 32-byte AES-256 key.
- A random 16-byte nonce is generated for AES-GCM.
- The JSON vault ({site: password, ...}) is serialised and encrypted, producing ciphertext + 16-
byte GCM tag.


## Page 5
- Payload = MAGIC || salt || nonce || ciphertext || tag, base64-encoded.
- The payload string is embedded into the cover image via LSB steganography.
5.4 LSB Steganography Engine
The LSB engine operates identically in both implementations (Node.js/Jimp, browser/Canvas):
- Convert the payload string to a binary bit string (8 bits per character code).
- Prepend a 32-bit unsigned integer header encoding the total number of payload bits.
- Iterate over pixels in raster order (left-to-right, top-to-bottom). For each pixel, overwrite the
LSB of the R, G, and B channels with successive payload bits (3 bits per pixel).
- On extraction, read all LSBs, parse the 32-bit header to obtain the payload length, then
reconstruct the payload string.
Capacity is: width × height × 3 bits. A 1920×1080 image can hold up to 777,600 bits (approximately
97 KB), more than sufficient for any realistic password vault.


## 6. Implementation

6.2 Chrome Extension (extension/content.js + manifest.json)
The extension is a Manifest V3 content script injected into every page at document_idle. Its
complete workflow is:
- Listen for drop events on elements matching the isPasswordField() predicate
(type=password or autocomplete contains 'password').
- On a valid image drop, render the vault modal with a passphrase field and a preview of the
dropped image.
- Load the image into an off-screen HTML5 Canvas element and perform LSB extraction
directly in the browser using canvas.getContext('2d').getImageData().
- Derive the AES-256-GCM key using the Web Crypto API (PBKDF2-SHA1, 100,000
iterations).
- Decrypt the vault payload. On OperationError (GCM tag mismatch), the modal displays an
error message and allows the user to retry.
- Run site auto-detection: strip 'www.' from window.location.hostname; attempt exact match
then subdomain suffix match against vault keys.
- Fill the target input field using the HTMLInputElement.prototype.value native setter plus
synthetic input and change events — required to trigger React/Vue reactive frameworks.
The manifest requests only activeTab and scripting permissions, and no background service
worker is declared, keeping the extension's attack surface minimal.
6.3 Express.js Backend (backend/server.js + utils/)
The backend exposes two REST endpoints:
- POST /api/encode — Accepts a multipart form upload containing: cover image, optional
existing vault image, master passphrase, and a JSON array of {site, password} objects.
Returns the vault PNG as a binary download.


## Page 6
- POST /api/decode — Accepts vault image and passphrase. Returns the full vault JSON or a
single site entry.
File handling uses multer with a disk storage destination (uploads/). After responding, both the input
upload and output vault file are deleted from disk using fs.unlink(). The crypto.js utility uses
Node.js's built-in crypto module with pbkdf2Sync and aes-256-gcm. The stego.js utility uses Jimp
for image I/O and implements the same 3-bits-per-pixel LSB scheme.
Identified issue: Orphaned DCT-related CSS classes remain in the frontend codebase and
should be removed as dead code.
6.4 React/Vite Frontend (frontend/src/)
The frontend is a single-page React 18 application with two views:
- Encode view (Encode.jsx) — Dynamic password entry table (add/remove rows), cover
image upload, optional existing vault upload, passphrase field, and a download link for the
resulting vault PNG.
- Decode view (Decode.jsx) — Image upload, passphrase, optional site filter. On success,
displays single password or renders a table of all vault entries in plaintext.
The app proxies all /api calls to the Express backend at port 3001 via Vite's proxy configuration.
The React components handle loading states, error display, and blob URL management for file
downloads cleanly.


- Results and Discussion
7.1 Cross-Platform Compatibility
Cross-platform vault interoperability is the central engineering achievement of StegnoPass v2. The
following comparison confirms that both runtime environments implement identical parameters:
Parameter Node.js (Backend) Browser (Extension)
Encryption aes-256-gcm AES-GCM (256-bit)
KDF pbkdf2Sync SHA1 PBKDF2 SHA-1
## Iterations 100,000 100,000
Salt size 16 bytes 16 bytes
Nonce size 16 bytes 16 bytes (iv)
GCM tag size 16 bytes tagLength: 128
Magic bytes SPVT (Buffer) [0x53,0x50,0x56,0x54]
Stego — LSB
## ✅ Implemented ✅ Implemented
Stego — DCT
❌ Not implemented ❌ Not implemented



## Page 7
All vaults created by any one component can be decoded by any other. This has been confirmed by
code-level analysis of the payload assembly and disassembly logic across all three
implementations.
## 7.2 Security Analysis
## Strengths
- AES-256-GCM provides authenticated encryption — any tampering with the embedded
ciphertext is detected before decryption.
- Per-vault random salt prevents rainbow-table attacks and ensures two vaults with the same
passphrase produce entirely different payloads.
- PBKDF2-SHA1 at 100,000 iterations imposes significant computational cost on brute-force
attacks, exceeding OWASP's minimum recommendations for this algorithm.
- The extension performs all operations locally — no credentials, images, or passphrases are
ever sent to a remote server.
- React/Vue-compatible field filling via the native prototype setter prevents frameworks from
ignoring programmatic value changes.
## Weaknesses
- PBKDF2-SHA1 vs. SHA-256: NIST SP 800-132 and OWASP recommend PBKDF2-
SHA256 for new systems. SHA-1 is deprecated for signing but remains collision-resistant for
HMAC; however, migrating to SHA-256 would be trivial (all three platforms support it) and is
best practice.
- Nonce size — 16 bytes vs. 12 bytes: GCM's canonical nonce size is 96 bits (12 bytes).
Using 16 bytes causes all three platforms to internally hash the nonce to 12 bytes via
GHASH, incurring a small overhead. Since a new nonce is generated per encode operation
the security impact is negligible, but conforming to 12 bytes would be more idiomatic.
- No server-side rate-limiting: The Express backend accepts an unlimited number of
/api/decode requests. An adversary who can reach the API can brute-force passphrases
against a known vault image at network speed.
- Plaintext password display in Decode.jsx: All decrypted passwords are rendered as
visible text in the React view with no masking or clipboard-only option.
- LSB detectability: Standard steganalysis tools can detect LSB-modified images with
high accuracy.
- No CSRF protection on the backend: The API's CORS policy allows only a single
configured origin, but there is no CSRF token mechanism. This is acceptable for a localhost-
only deployment but would need to be addressed for any public deployment.
- Passphrase transmitted in form body (HTTPS required): The passphrase is sent as a
plaintext form field over HTTP between the React frontend and Express backend. The
deployment must enforce HTTPS to prevent interception.


- Challenges and Limitations
8.1 Orphaned DCT CSS Classes


## Page 8
After removing an abandoned DCT steganography feature branch, several orphaned CSS classes
and unused component props remain in the frontend codebase (e.g., mode-toggle styling in
Encode.jsx, DCT-related CSS variables). These artifacts serve no functional purpose, increase
bundle size slightly, and may confuse future maintainers. They should be removed as part of a
dead-code cleanup pass.
8.2 Bit-String LSB Encoding
The Node.js backend and browser extension both convert the base64 payload to a string and then
convert each character code to an 8-bit binary string before embedding. This means the effective
payload is the ASCII representation of the base64 string — not the raw bytes. The browser
extension follows the same approach. While internally consistent (all three do it the same way),
working at the raw byte level would roughly reduce the embedded bit count by approximately 25%
(base64 expands data by ~33%, and removing it would reduce the number of bits to embed), or
equivalently allow a smaller cover image for the same vault. This is a minor efficiency concern, not
a correctness issue.
8.3 Absence of a Test Suite
None of the three components includes unit or integration tests. The correct behaviour of the LSB
round-trip (embed then extract), encryption round-trip (encrypt then decrypt), and cross-platform
interoperability (Python-encoded vault decoded by extension) is verified only by manual testing. Any
refactoring risks introducing silent regressions.
8.4 No Docker / CI/CD
There is no Dockerfile, docker-compose.yml, or CI/CD pipeline configuration. The backend and
frontend must be started manually with separate npm install and npm start commands. The
absence of containerisation makes reproducible deployment more difficult, and the absence of CI
prevents automated regression detection.


- Conclusion and Future Work
## Conclusion
StegnoPass v2 successfully demonstrates the core concept of a steganographic password
manager. The binary payload format is well-designed and genuinely interoperable: a vault encoded
by the Python CLI can be decoded by the Chrome extension, and vice versa. The AES-256-GCM
encryption scheme is appropriately chosen, the key derivation parameters meet current minimum
standards, and the Chrome extension's zero-network-traffic design is a meaningful security
property.
The project contains orphaned DCT-related CSS classes in the frontend that were left behind after
removing an abandoned feature branch. These should be cleaned up to reduce technical debt.
Secondary priorities include adding a test suite and implementing server-side rate-limiting.
## Future Work — Prioritised


## Page 9
## # Improvement Impact
## 1
Mask passwords in Decode.jsx by default; add clipboard-
copy button and reveal toggle.
Medium — reduces shoulder-surfing
risk
## 2
Migrate PBKDF2 hash to SHA-256 across all platforms.
Update magic bytes to SPVX to distinguish new-format
vaults.
Medium — aligns with NIST best
practice
## 3
Add Dockerfile and docker-compose.yml for backend +
frontend. Add GitHub Actions CI to run tests on push.
Medium — reproducible builds and CI
regression detection
## 4
Work at the raw-byte level in the LSB engine (embed the
base64-decoded bytes) to reduce embedded bit count by
## ~25%.
Low — efficiency improvement
## 5
Normalise GCM nonce to 12 bytes across all platforms for
GCM compliance.
Low — correctness / best practice


## 10. References / Bibliography
- NIST SP 800-132 — Recommendation for Password-Based Key Derivation. National
Institute of Standards and Technology, 2010.
- OWASP Password Storage Cheat Sheet.
https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
## (2023).
- Dworkin, M. NIST SP 800-38D — Recommendation for Block Cipher Modes of Operation:
Galois/Counter Mode (GCM). 2007.
- Fridrich, J., Goljan, M., & Du, R. Detecting LSB Steganography in Color and Grayscale
Images. IEEE MultiMedia, 2001.
- Westfeld, A. F5 — A Steganographic Algorithm. Springer LNCS 2137, 2001.
## • Google Chrome Developers — Manifest V3 Overview.
https://developer.chrome.com/docs/extensions/mv3/intro/ (2023).
- Anthropic / Node.js crypto module — https://nodejs.org/api/crypto.html
- pycryptodome Documentation — https://pycryptodome.readthedocs.io/
- Web Crypto API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- Jimp Image Processing Library — https://github.com/jimp-dev/jimp


## 11. Appendices
## Appendix A — File Structure
## File / Path Purpose
extension/content.js Chrome extension content script — all vault logic


## Page 10
## File / Path Purpose
extension/manifest.json MV3 manifest — permissions, content script config
stegnopass-web/backend/server.js
Express.js API — /api/encode and /api/decode
routes
stegnopass-web/backend/utils/crypto.js
Node.js AES-256-GCM encrypt/decrypt helpers
stegnopass-web/backend/utils/stego.js
Node.js LSB embed/extract helpers using Jimp
stegnopass-web/frontend/src/App.jsx
React root — tab navigation (Encode / Decode)
stegnopass-
web/frontend/src/components/Encode.jsx
Encode form — dynamic password table, file
uploads
stegnopass-
web/frontend/src/components/Decode.jsx
Decode form — vault image upload, result display

Appendix B — How to Run
--add-password "gmail.com:MyPass" --output vault.png
## Web Application
## # Backend
cd stegnopass-web/backend && npm install && npm start        # port 3001
# Frontend (separate terminal)
cd stegnopass-web/frontend && npm install && npm run dev     # port 5173
## Chrome Extension
- Open chrome://extensions in Chrome.
## • Enable Developer Mode.
- Click Load unpacked and select the extension/ folder.
- Navigate to any login page, drag a vault PNG onto the password field.

## Appendix C — Identified Gaps Summary
## # Gap Severity Location
## 1
No unit or integration tests High All components
## 2
No rate-limiting on /api/decode — brute-force
possible
High backend/server.js
## 3
Plaintext passwords displayed in Decode
view
## Medium Decode.jsx
## 4
PBKDF2 using SHA-1 instead of
recommended SHA-256
Medium All components
## 5
GCM nonce 16 bytes instead of canonical 12
bytes
Low All components
## 6
No Docker, no CI/CD pipeline Low Project root


## Page 11
## # Gap Severity Location
## 7
No TypeScript, no linting (.eslintrc), no
## .gitignore
## Low Frontend / Backend
## 8
LSB engine embeds base64 characters not
raw bytes (25% inefficiency)
Low All stego modules



## Page 12
— End of Report —