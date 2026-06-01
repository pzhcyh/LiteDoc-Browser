#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$HOME/.local/litedoc-dev"
NODE_DIR="$TOOLS_DIR/node"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  mkdir -p "$TOOLS_DIR"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  curl -fsSL https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$tmpdir/SHASUMS256.txt"
  case "$(uname -m)" in
    arm64) node_arch="arm64" ;;
    x86_64) node_arch="x64" ;;
    *) echo "Unsupported macOS architecture: $(uname -m)" >&2; exit 1 ;;
  esac
  node_tarball="$(awk "/darwin-$node_arch.tar.gz\$/ {print \\$2; exit}" "$tmpdir/SHASUMS256.txt")"

  curl -fL "https://nodejs.org/dist/latest-v24.x/$node_tarball" -o "$tmpdir/$node_tarball"
  rm -rf "$NODE_DIR"
  mkdir -p "$NODE_DIR"
  tar -xzf "$tmpdir/$node_tarball" -C "$NODE_DIR" --strip-components=1
fi

if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/litedoc-rustup-init.sh
  sh /tmp/litedoc-rustup-init.sh -y --profile minimal --default-toolchain stable
fi

if ! grep -q 'litedoc-dev/node/bin' "$HOME/.zshrc" 2>/dev/null; then
  {
    echo ''
    echo '# LiteDoc Browser local development tools'
    echo 'export PATH="$HOME/.local/litedoc-dev/node/bin:$HOME/.cargo/bin:$PATH"'
  } >> "$HOME/.zshrc"
fi

export PATH="$NODE_DIR/bin:$HOME/.cargo/bin:$PATH"
cd "$ROOT_DIR"
npm install

echo "LiteDoc macOS development environment is ready."
echo "Open a new terminal or run:"
echo "  export PATH=\"$NODE_DIR/bin:\$HOME/.cargo/bin:\$PATH\""
