#!/usr/bin/env bash
# =============================================================================
# upload-knowledge.sh — Trinity E-Learning Portal
# =============================================================================
# Discovers documentation in this repo and uploads it to Open WebUI Knowledge
# Bases, ready for RAG with Ollama + nomic-embed-text.
#
# Usage:
#   ./scripts/upload-knowledge.sh
#
# Required env vars (prompted interactively if not set):
#   OPENWEBUI_URL      Open WebUI base URL   (default: http://localhost:3000)
#   OPENWEBUI_API_KEY  API key from Open WebUI Settings → Account → API Keys
#
# Optional env vars:
#   REPO_ROOT          Repo directory         (default: script's parent dir)
#   POLL_TIMEOUT       Max seconds to wait for each file to process (default: 120)
#   POLL_INTERVAL      Seconds between status polls (default: 3)
#   DRY_RUN            Set to "1" to discover files but skip uploads
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
die()     { error "$*"; exit 1; }

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
for cmd in curl jq sha256sum find; do
  command -v "$cmd" &>/dev/null || die "Required tool '$cmd' not found. Please install it."
done

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(dirname "$SCRIPT_DIR")}"
POLL_TIMEOUT="${POLL_TIMEOUT:-120}"
POLL_INTERVAL="${POLL_INTERVAL:-3}"
DRY_RUN="${DRY_RUN:-0}"

# Prompt for required env vars if not set
if [[ -z "${OPENWEBUI_URL:-}" ]]; then
  read -rp "Open WebUI URL [http://localhost:3000]: " OPENWEBUI_URL
  OPENWEBUI_URL="${OPENWEBUI_URL:-http://localhost:3000}"
fi
# Strip trailing slash
OPENWEBUI_URL="${OPENWEBUI_URL%/}"

if [[ "$DRY_RUN" != "1" ]]; then
  if [[ -z "${OPENWEBUI_API_KEY:-}" ]]; then
    read -rsp "Open WebUI API Key: " OPENWEBUI_API_KEY
    echo
  fi
  [[ -z "$OPENWEBUI_API_KEY" ]] && die "OPENWEBUI_API_KEY is required."
fi

AUTH_HEADER="Authorization: Bearer ${OPENWEBUI_API_KEY:-dry-run}"
CONTENT_JSON="Content-Type: application/json"
ACCEPT_JSON="Accept: application/json"

# ---------------------------------------------------------------------------
# Ignore list — relative paths / prefixes (from repo root) to never upload
# ---------------------------------------------------------------------------
# Each entry is matched as a prefix against the relative file path.
# Trailing "/" matches a whole directory tree.
declare -a IGNORE_PATTERNS=(
  # Machine-generated / lock files
  "drizzle/meta/"              # huge JSON snapshots, not human-readable docs
  "pnpm-lock.yaml"             # dependency lock file
  "next-env.d.ts"              # auto-generated Next.js types

  # IDE / tool configs — not project documentation
  ".continue/"                 # Continue IDE config
  ".vscode/"                   # VS Code workspace settings
  ".github/hooks/"             # CI hook JSON configs

  # Tiny re-exports / boilerplate with no RAG value
  "src/server/better-auth/index.ts"   # 33-byte re-export
  "src/trpc/query-client.ts"          # boilerplate TanStack config
  "src/server/db/index.ts"            # just drizzle(conn, {schema}) — no useful context
  "src/server/api/routers/post.ts"    # T3 scaffold placeholder, not real app code
  ".npmrc"                            # single-line shamefully-hoist

  # Next.js API route handlers — just thin wrappers, no logic
  "src/app/api/"
)

# Returns 0 (true) if the given absolute filepath should be ignored
is_ignored() {
  local abs="$1"
  local rel="${abs#"$REPO_ROOT/"}"
  local pattern
  for pattern in "${IGNORE_PATTERNS[@]}"; do
    case "$rel" in
      "$pattern"*) return 0 ;;
    esac
  done
  return 1
}

# ---------------------------------------------------------------------------
# Knowledge Base definitions
# ---------------------------------------------------------------------------
# Each entry: "slug|display_name|description"
#
# Objective: these KBs feed RAG context to AI agents (OpenCode + Open WebUI).
# Upload DOCUMENTATION and SPECIFICATIONS only — not runtime source code.
# Rule: if a file explains HOW the project works, upload it.
#       if a file IS the implementation, skip it (OpenCode reads the repo directly).
declare -a KB_DEFS=(
  "kb-company-standards|Company Standards|Agent instructions, Copilot config, coding prompts, and skill guides"
  "kb-coding-standards|Coding Standards|AGENTS.md rules, linter/formatter/TS config, and opencode agent definitions"
  "kb-architecture|Architecture Docs|PLAN.md, DB schema, Drizzle SQL migrations, session notes, and opencode config"
  "kb-api-specs|API Specs|tRPC router definitions (the API surface), auth config, and environment schema"
  "kb-readme|README Files|All README.md documentation files in the project"
)

# ---------------------------------------------------------------------------
# File discovery: map each file path to a KB slug
# Returns lines of "slug|filepath" — ignores files matching IGNORE_PATTERNS
#
# Strategy: folder-based + pattern-based scanning.
# Each section lists the folders and filename patterns that belong to a KB.
# ---------------------------------------------------------------------------
discover_files() {
  local root="$1"

  # Helper: emit "slug|filepath" if file exists and is not ignored
  emit() {
    local slug="$1" f="$2"
    [[ -f "$f" ]] || return 0
    is_ignored "$f" && return 0
    echo "${slug}|${f}"
  }

  # Helper: scan a folder and emit all matching files for a slug
  # Usage: scan_folder <slug> <folder> <find_args...>
  scan_folder() {
    local slug="$1" folder="$2"; shift 2
    [[ -d "$folder" ]] || return 0
    while IFS= read -r f; do
      emit "$slug" "$f"
    done < <(find "$folder" -type f "$@" 2>/dev/null | sort)
  }

  # ── kb-company-standards ───────────────────────────────────────────────
  # Folders : .github/agents  .github/instructions  .github/prompts  .github/skills
  # Patterns: *.md  *.yaml  *.yml  (excludes hooks/ via IGNORE_PATTERNS)
  emit kb-company-standards "$root/AGENTS.md"
  emit kb-company-standards "$root/.github/copilot-instructions.md"
  scan_folder kb-company-standards "$root/.github/agents"       \( -name "*.md" \)
  scan_folder kb-company-standards "$root/.github/instructions" \( -name "*.md" \)
  scan_folder kb-company-standards "$root/.github/prompts"      \( -name "*.md" \)
  scan_folder kb-company-standards "$root/.github/skills"       \( -name "*.md" \)

  # ── kb-coding-standards ────────────────────────────────────────────────
  # Files: AGENTS.md, .opencode/AGENTS.md, eslint/prettier/tsconfig
  emit kb-coding-standards "$root/AGENTS.md"
  emit kb-coding-standards "$root/.opencode/AGENTS.md"
  scan_folder kb-coding-standards "$root/.opencode/agents"  \( -name "*.md" \)
  emit kb-coding-standards "$root/eslint.config.js"
  emit kb-coding-standards "$root/prettier.config.js"
  emit kb-coding-standards "$root/tsconfig.json"
  emit kb-coding-standards "$root/next.config.js"
  emit kb-coding-standards "$root/package.json"

  # ── kb-architecture ────────────────────────────────────────────────────
  # Folders : drizzle/ (SQL migrations only), memories/, .opencode/
  # Files   : PLAN.md, drizzle.config.ts, src/server/db/schema.ts
  emit kb-architecture "$root/PLAN.md"
  emit kb-architecture "$root/drizzle.config.ts"
  emit kb-architecture "$root/src/server/db/schema.ts"
  # scan_folder kb-architecture "$root/drizzle"    \( -name "*.sql" \)   # migrations only, not snapshots
  emit kb-architecture "$root/.opencode/opencode.json"
  emit kb-architecture "$root/.opencode/README.md"

  # ── kb-api-specs ───────────────────────────────────────────────────────
  # These files ARE the API specification — router signatures define the
  # contract that agents need to understand when writing client code.
  # Included: tRPC routers, root router, trpc init, auth config, env schema
  # Excluded: client hooks (react.tsx), boilerplate (query-client.ts)
  emit kb-api-specs "$root/src/server/api/root.ts"
  emit kb-api-specs "$root/src/server/api/trpc.ts"
  scan_folder kb-api-specs "$root/src/server/api/routers" \( -name "*.ts" \)
  emit kb-api-specs "$root/src/server/better-auth/config.ts"
  emit kb-api-specs "$root/src/server/better-auth/server.ts"
  emit kb-api-specs "$root/src/server/better-auth/client.ts"
  emit kb-api-specs "$root/src/trpc/server.ts"
  emit kb-api-specs "$root/src/env.js"

  # ── kb-readme ──────────────────────────────────────────────────────────
  # Pattern : README.md anywhere in repo (excluding build/vendor dirs)
  while IFS= read -r f; do
    emit kb-readme "$f"
  done < <(find "$root" -type f -name "README.md" \
    -not -path "$root/node_modules/*" \
    -not -path "$root/.git/*" \
    -not -path "$root/.next/*" \
    2>/dev/null | sort)
}

# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------
api_get() {
  local path="$1"
  curl -sf -X GET \
    -H "$AUTH_HEADER" \
    -H "$ACCEPT_JSON" \
    "${OPENWEBUI_URL}${path}"
}

api_post_json() {
  local path="$1"
  local body="$2"
  curl -sf -X POST \
    -H "$AUTH_HEADER" \
    -H "$CONTENT_JSON" \
    -H "$ACCEPT_JSON" \
    -d "$body" \
    "${OPENWEBUI_URL}${path}"
}

# Ensure a Knowledge Base exists; create if not. Returns the KB id.
ensure_kb() {
  local slug="$1"
  local name="$2"
  local description="$3"

  # List existing KBs and search by name
  local existing
  existing=$(api_get "/api/v1/knowledge/" 2>/dev/null || echo "[]")

  local kb_id
  kb_id=$(echo "$existing" | jq -r --arg name "$name" \
    '.[] | select(.name == $name) | .id' 2>/dev/null | head -1)

  if [[ -n "$kb_id" && "$kb_id" != "null" ]]; then
    echo "$kb_id"
    return
  fi

  # Create new KB
  local body
  body=$(jq -cn --arg name "$name" --arg desc "$description" \
    '{"name": $name, "description": $desc}')

  local response
  response=$(api_post_json "/api/v1/knowledge/create" "$body" 2>/dev/null) || \
    die "Failed to create Knowledge Base '$name'"

  kb_id=$(echo "$response" | jq -r '.id')
  [[ -z "$kb_id" || "$kb_id" == "null" ]] && \
    die "Knowledge Base creation returned no id for '$name'. Response: $response"

  echo "$kb_id"
}

# Three-step upload:
#   1. POST /api/v1/files/                        → store file, get file_id
#   2. POST /api/v1/retrieval/process/file         → vectorize into KB collection
#   3. POST /api/v1/knowledge/{kb_id}/file/add     → register file in KB metadata
#
# "Duplicate content" on step 2 or 3 is treated as success (already processed).
upload_file() {
  local filepath="$1"
  local kb_id="$2"

  # ── Step 1: Upload raw file ────────────────────────────────────────────
  local upload_resp
  upload_resp=$(curl -sf -X POST \
    -H "$AUTH_HEADER" \
    -H "$ACCEPT_JSON" \
    -F "file=@${filepath}" \
    "${OPENWEBUI_URL}/api/v1/files/" 2>/dev/null) || {
      warn "Upload failed for: $filepath"
      return 1
    }

  local file_id
  file_id=$(echo "$upload_resp" | jq -r '.id' 2>/dev/null)
  [[ -z "$file_id" || "$file_id" == "null" ]] && {
    warn "No file_id returned for: $filepath"
    return 1
  }

  # ── Step 2: Vectorize into the KB's collection ─────────────────────────
  local proc_resp proc_detail
  proc_resp=$(curl -sf -X POST \
    -H "$AUTH_HEADER" \
    -H "$CONTENT_JSON" \
    -H "$ACCEPT_JSON" \
    -d "{\"file_id\":\"${file_id}\",\"collection_name\":\"${kb_id}\"}" \
    "${OPENWEBUI_URL}/api/v1/retrieval/process/file" 2>/dev/null) || {
      warn "Vectorization request failed for: $filepath"
      return 1
    }

  proc_detail=$(echo "$proc_resp" | jq -r '.detail // empty' 2>/dev/null)
  if [[ -n "$proc_detail" && "$proc_detail" != *"Duplicate"* ]]; then
    warn "Vectorization error for $filepath: $proc_detail"
    return 1
  fi

  # ── Step 3: Register file in KB metadata ──────────────────────────────
  local add_resp add_detail
  add_resp=$(curl -sf -X POST \
    -H "$AUTH_HEADER" \
    -H "$CONTENT_JSON" \
    -H "$ACCEPT_JSON" \
    -d "{\"file_id\":\"${file_id}\"}" \
    "${OPENWEBUI_URL}/api/v1/knowledge/${kb_id}/file/add" 2>/dev/null) || {
      warn "KB link failed for: $filepath (file_id=$file_id)"
      return 1
    }

  add_detail=$(echo "$add_resp" | jq -r '.detail // empty' 2>/dev/null)
  if [[ -n "$add_detail" && "$add_detail" != *"Duplicate"* ]]; then
    warn "KB link error for $filepath: $add_detail"
    return 1
  fi

  echo "$file_id"
}

# Vectorization is synchronous inside upload_file — no polling needed.
wait_for_processing() {
  return 0
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo -e "\n${BOLD}Trinity E-Learning Portal — Open WebUI Knowledge Base Uploader${RESET}"
echo -e "Repo root : ${CYAN}${REPO_ROOT}${RESET}"
echo -e "Open WebUI: ${CYAN}${OPENWEBUI_URL}${RESET}"
[[ "$DRY_RUN" == "1" ]] && echo -e "${YELLOW}DRY RUN mode — no uploads will be made${RESET}"
echo

# Step 1: Verify API connectivity (skipped in DRY_RUN)
info "Verifying Open WebUI connection..."
if [[ "$DRY_RUN" != "1" ]]; then
  if ! api_get "/api/v1/auths/" &>/dev/null; then
    die "Cannot reach Open WebUI at ${OPENWEBUI_URL}. Check the URL and API key."
  fi
  success "Connected to Open WebUI."
else
  info "DRY RUN — skipping connectivity check."
fi
echo

# Step 2: Discover files — store per-KB lists as plain files in a temp dir
# (bash 3.2 on macOS does not support declare -A associative arrays)
info "Discovering documentation files in repo..."
KB_TMPDIR=$(mktemp -d)
trap 'rm -rf "$KB_TMPDIR"' EXIT

while IFS='|' read -r slug filepath; do
  [[ -f "$filepath" ]] || continue
  echo "$filepath" >> "${KB_TMPDIR}/${slug}"
done < <(discover_files "$REPO_ROOT")

# Print discovery summary
total_files=0
kb_count=0
for kb_def in "${KB_DEFS[@]}"; do
  IFS='|' read -r slug _name _desc <<< "$kb_def"
  list_file="${KB_TMPDIR}/${slug}"
  if [[ -f "$list_file" ]]; then
    count=$(grep -c . "$list_file" || true)
    total_files=$(( total_files + count ))
    kb_count=$(( kb_count + 1 ))
    info "  ${slug}: ${count} file(s)"
  fi
done
echo
success "Discovered ${total_files} file(s) across ${kb_count} knowledge base(s)."
echo

[[ "$DRY_RUN" == "1" ]] && { info "DRY RUN complete. Exiting."; exit 0; }

# Step 3: Create / ensure KBs and upload files
uploaded=0
failed_count=0

for kb_def in "${KB_DEFS[@]}"; do
  IFS='|' read -r slug name description <<< "$kb_def"
  list_file="${KB_TMPDIR}/${slug}"

  # Skip if no files discovered for this KB
  [[ -f "$list_file" ]] || { warn "No files for KB '${name}' — skipping creation."; continue; }

  echo -e "${BOLD}── ${name} (${slug}) ──${RESET}"

  # Ensure KB exists
  info "Ensuring KB exists..."
  kb_id=$(ensure_kb "$slug" "$name" "$description") || { error "Could not ensure KB '$name'"; failed_count=$(( failed_count + 1 )); continue; }
  success "KB ready (id=${kb_id})"

  # Upload each file
  while IFS= read -r filepath; do
    [[ -z "$filepath" ]] && continue
    rel_path="${filepath#"$REPO_ROOT/"}"
    info "  Uploading: ${rel_path}"

    file_id=$(upload_file "$filepath" "$kb_id") || { failed_count=$(( failed_count + 1 )); continue; }

    if wait_for_processing "$file_id" "$filepath"; then
      success "  ✓ ${rel_path}"
      uploaded=$(( uploaded + 1 ))
    else
      failed_count=$(( failed_count + 1 ))
    fi
  done < "$list_file"

  echo
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo -e "${BOLD}═══════════════════════════════════════${RESET}"
echo -e "${BOLD}Upload Summary${RESET}"
echo -e "  ${GREEN}Uploaded : ${uploaded}${RESET}"
echo -e "  ${YELLOW}Failed   : ${failed_count}${RESET}"
echo -e "  Total    : ${total_files}"
echo
if (( failed_count > 0 )); then
  warn "Some files failed. Re-run the script to retry — already-processed files will be skipped by Open WebUI's hash check."
else
  success "All files uploaded and processed successfully."
fi

echo
echo -e "${BOLD}Next Steps:${RESET}"
echo "  1. Open WebUI → Admin → Documents → set Embedding Model to:"
echo "     ollama/nomic-embed-text (via ${OPENWEBUI_URL})"
echo "  2. In OpenCode, reference a KB in chat with:  #kb-coding-standards"
echo "  3. Replace OLLAMA_SERVER_IP in .opencode/opencode.json with your LAN IP."
echo "  4. Set OPENWEBUI_API_KEY in your shell environment (or .env.local) for MCP."
echo
