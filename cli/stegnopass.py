"""
StegnoPass v2 — CLI Tool
========================
Features:
  • Multi-password vault: one image holds {site: password} JSON map
  • LSB steganography (fast, large capacity)
  • AES-256-GCM encryption with PBKDF2-SHA1 (browser-compatible)

Commands:
  encode  --image cover.png --passphrase secret --output vault.png
          [--add-password gmail.com:myGmailPass]
          [--add-password github.com:myGithubPass]

  decode  --image vault.png --passphrase secret [--site gmail.com]

  list    --image vault.png --passphrase secret
"""

import argparse
import base64
import json
import os

from PIL import Image
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
SALT_SIZE  = 16
KEY_SIZE   = 32
ITERATIONS = 100000
MAGIC      = b"SPVT"   # StegnoPass Vault Tag — 4 bytes header in payload


# ─────────────────────────────────────────────
# AES-256-GCM  (matches browser WebCrypto API)
# Layout: MAGIC(4) + salt(16) + nonce(16) + ciphertext(N) + tag(16)
# ─────────────────────────────────────────────

def _derive_key(passphrase: str, salt: bytes) -> bytes:
    return PBKDF2(passphrase, salt, dkLen=KEY_SIZE, count=ITERATIONS)


def encrypt_vault(vault: dict, passphrase: str) -> str:
    plaintext = json.dumps(vault, ensure_ascii=False).encode()
    salt      = get_random_bytes(SALT_SIZE)
    key       = _derive_key(passphrase, salt)
    cipher    = AES.new(key, AES.MODE_GCM)
    ct, tag   = cipher.encrypt_and_digest(plaintext)
    payload   = MAGIC + salt + cipher.nonce + ct + tag
    return base64.b64encode(payload).decode()


def decrypt_vault(payload_b64: str, passphrase: str) -> dict:
    raw = base64.b64decode(payload_b64)
    if raw[:4] != MAGIC:
        raise ValueError("Not a StegnoPass image (wrong magic bytes). "
                         )
    raw   = raw[4:]
    salt  = raw[:SALT_SIZE]
    nonce = raw[SALT_SIZE:SALT_SIZE + 16]
    tag   = raw[-16:]
    ct    = raw[SALT_SIZE + 16:-16]
    key   = _derive_key(passphrase, salt)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    plain  = cipher.decrypt_and_verify(ct, tag)
    return json.loads(plain.decode())


# ─────────────────────────────────────────────
# LSB steganography
# ─────────────────────────────────────────────

def _to_bits(data: str) -> str:
    return ''.join(format(ord(c), '08b') for c in data)

def _from_bits(bits: str) -> str:
    return ''.join(chr(int(bits[i:i+8], 2)) for i in range(0, len(bits), 8))


def lsb_embed(img: Image.Image, data: str) -> Image.Image:
    img     = img.convert("RGB")
    pixels  = img.load()
    bits    = _to_bits(data)
    header  = format(len(bits), '032b')
    full    = header + bits
    cap     = img.size[0] * img.size[1] * 3
    if len(full) > cap:
        raise ValueError(f"Image too small: needs {len(full)} bits, has {cap}")

    idx = 0
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            if idx >= len(full):
                break
            r, g, b = pixels[x, y]
            if idx < len(full): r = (r & ~1) | int(full[idx]); idx += 1
            if idx < len(full): g = (g & ~1) | int(full[idx]); idx += 1
            if idx < len(full): b = (b & ~1) | int(full[idx]); idx += 1
            pixels[x, y] = (r, g, b)
        if idx >= len(full):
            break
    return img


def lsb_extract(img: Image.Image) -> str:
    img    = img.convert("RGB")
    pixels = img.load()
    bits   = ""
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            r, g, b = pixels[x, y]
            bits += str(r & 1) + str(g & 1) + str(b & 1)
    n    = int(bits[:32], 2)
    data = bits[32:32 + n]
    return _from_bits(data)


# ─────────────────────────────────────────────
# Unified embed / extract
# ─────────────────────────────────────────────

def embed(image_path: str, data: str, output_path: str):
    img = Image.open(image_path)
    out = lsb_embed(img, data)
    out.save(output_path, format="PNG")
    print(f"✅ Vault image saved: {output_path}")


def extract(image_path: str) -> str:
    img = Image.open(image_path)
    return lsb_extract(img)


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(
        description="StegnoPass v2 — Multi-password steganographic vault (LSB)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    sub = p.add_subparsers(dest="cmd")

    # ── encode ──
    enc = sub.add_parser("encode", help="Create / update a vault image")
    enc.add_argument("--image",        required=True,  help="Cover PNG image")
    enc.add_argument("--passphrase",   required=True,  help="Master passphrase")
    enc.add_argument("--output",       required=True,  help="Output PNG path")
    enc.add_argument("--add-password", action="append", metavar="SITE:PASS",
                     help="Add a password entry, e.g. gmail.com:MyPass123  (repeat for multiple)")
    enc.add_argument("--from-vault",   metavar="EXISTING_IMAGE",
                     help="Load existing vault to add/update entries instead of starting fresh")

    # ── decode ──
    dec = sub.add_parser("decode", help="Retrieve a password from the vault")
    dec.add_argument("--image",      required=True)
    dec.add_argument("--passphrase", required=True)
    dec.add_argument("--site",       help="Site key to retrieve (omit to list all)")

    # ── list ──
    lst = sub.add_parser("list", help="List all sites stored in the vault")
    lst.add_argument("--image",      required=True)
    lst.add_argument("--passphrase", required=True)

    args = p.parse_args()

    try:
        # ── encode ──────────────────────────────
        if args.cmd == "encode":
            vault = {}

            if args.from_vault:
                raw   = extract(args.from_vault)
                vault = decrypt_vault(raw, args.passphrase)
                print(f"📂 Loaded existing vault with {len(vault)} entries")

            if args.add_password:
                for entry in args.add_password:
                    if ":" not in entry:
                        raise ValueError(f"Bad format '{entry}' — use SITE:PASSWORD")
                    site, pw = entry.split(":", 1)
                    site = site.strip().lower()
                    vault[site] = pw
                    print(f"  ➕ {site}")

            if not vault:
                raise ValueError("No passwords to store. Use --add-password SITE:PASS")

            payload = encrypt_vault(vault, args.passphrase)
            embed(args.image, payload, args.output)
            print(f"🔒 Vault contains {len(vault)} site(s)")

        # ── decode ──────────────────────────────
        elif args.cmd == "decode":
            raw   = extract(args.image)
            vault = decrypt_vault(raw, args.passphrase)

            if args.site:
                key = args.site.strip().lower()
                if key not in vault:
                    available = ", ".join(vault.keys())
                    raise KeyError(f"Site '{key}' not found. Available: {available}")
                print(f"🔓 Password for {key}: {vault[key]}")
            else:
                print(f"🔓 Vault decrypted — {len(vault)} entries:")
                for site, pw in vault.items():
                    print(f"   {site}: {pw}")

        # ── list ────────────────────────────────
        elif args.cmd == "list":
            raw   = extract(args.image)
            vault = decrypt_vault(raw, args.passphrase)
            print(f"📋 Sites in vault ({len(vault)}):")
            for site in vault:
                print(f"   • {site}")

        else:
            p.print_help()

    except Exception as e:
        print(f"❌ Error: {e}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()