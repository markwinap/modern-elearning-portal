# OpenCode + Open WebUI Configuration

AI coding agent setup for the **Trinity E-Learning Portal** using [OpenCode](https://opencode.ai) backed by local [Ollama](https://ollama.com) models and [Open WebUI](https://openwebui.com) as the RAG knowledge layer.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  Developer                  │
│           (runs OpenCode in IDE)            │
└──────────────────┬──────────────────────────┘
                   │ opencode CLI
                   ▼
┌─────────────────────────────────────────────┐
│              OpenCode (local)               │
│  .opencode/opencode.json  ←  this folder   │
│  Agents: coder · reasoner · reviewer       │
│  MCP: Open WebUI proxy (RAG queries)        │
└──────┬──────────────────────────────────────┘
       │ OpenAI-compatible /v1 API
       ▼
┌─────────────────────────────────────────────┐
│          Ollama (Ubuntu LAN server)         │
│  ├── qwen2.5-coder:14b  (coding agent)      │
│  ├── qwen3:14b           (review agent)     │
│  ├── deepseek-r1:14b     (reasoner agent)   │
│  └── nomic-embed-text    (RAG embeddings)   │
└──────────────────────────────────────────────┘
       │ REST API / embeddings
       ▼
┌─────────────────────────────────────────────┐
│          Open WebUI (localhost:3000)        │
│  Knowledge Bases:                           │
│  ├── kb-company-standards                  │
│  ├── kb-coding-standards                   │
│  ├── kb-architecture                       │
│  ├── kb-api-specs                          │
│  └── kb-readme                             │
└─────────────────────────────────────────────┘
```

---

## Folder Structure

```
.opencode/
├── opencode.json       # Provider, model, agent, and MCP configuration
├── AGENTS.md           # OpenCode workflow rules (extends root AGENTS.md)
├── README.md           # This file
└── agents/
    ├── coder.md        # Primary coding agent — Qwen2.5-Coder 14B
    ├── reasoner.md     # Architecture sub-agent — DeepSeek-R1 14B
    └── reviewer.md     # Code review sub-agent — Qwen3 14B

scripts/
└── upload-knowledge.sh # Discovers repo docs and uploads to Open WebUI KBs
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [OpenCode](https://opencode.ai) | latest | AI coding agent CLI |
| [Ollama](https://ollama.com) | ≥ 0.9 | Local model server (Ubuntu LAN) |
| [Open WebUI](https://openwebui.com) | ≥ 0.9.6 | RAG + knowledge base UI |
| `curl`, `jq`, `sha256sum` | any | Required by upload script |

### Required Ollama models

Pull these on the Ubuntu server:

```bash
ollama pull qwen2.5-coder:14b
ollama pull qwen3:14b
ollama pull deepseek-r1:14b
ollama pull nomic-embed-text
```

---

## Setup

### 1. Set your Ollama LAN IP

Edit `opencode.json` and replace the placeholder:

```json
"baseURL": "http://192.168.1.226:11434/v1"
```

The Ollama server is at `192.168.1.226` — this is already set in `opencode.json`.

### 2. Set Ollama context window

Tool calls fail below ~16k tokens. On the Ollama server, set:

```bash
# Option A — environment variable (persistent via systemd override)
OLLAMA_NUM_CTX=32768 ollama serve

# Option B — per-model Modelfile
ollama show qwen2.5-coder:14b --modelfile > Modelfile
# Add: PARAMETER num_ctx 32768
ollama create qwen2.5-coder:14b -f Modelfile
```

### 3. Get your Open WebUI API key

Open WebUI → **Settings** → **Account** → **API Keys** → **Create new secret key**

Export it in your shell (or add to `~/.zshrc`):

```bash
export OPENWEBUI_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> **Security**: the full API key is stored only in your shell environment or a local `.env` file — never committed to Git.

### 4. Configure Open WebUI embeddings

Open WebUI → **Admin Panel** → **Settings** → **Documents**:
- **Embedding Model Engine**: Ollama
- **Embedding Model**: `nomic-embed-text`
- **Ollama Base URL**: `http://192.168.1.226:11434`

### 5. Upload knowledge bases

```bash
# Preview what will be uploaded (no changes made)
DRY_RUN=1 ./scripts/upload-knowledge.sh

# Run the actual upload
./scripts/upload-knowledge.sh
```

The script will prompt for `OPENWEBUI_URL` and `OPENWEBUI_API_KEY` if not set as env vars.

### 6. Start OpenCode

```bash
# From the repo root
opencode
```

OpenCode will auto-load `.opencode/opencode.json`, `AGENTS.md`, and `.opencode/AGENTS.md`.

---

## Components

### `opencode.json` — Main Configuration

| Key | Value | Description |
|-----|-------|-------------|
| `model` | `ollama/qwen2.5-coder:14b` | Default model for all sessions |
| `default_agent` | `coder` | Agent loaded on startup |
| `instructions` | `AGENTS.md`, `.opencode/AGENTS.md`, `README.md` | Auto-loaded context files |
| `provider.ollama.npm` | `@ai-sdk/openai-compatible` | Ollama's OpenAI-compatible API adapter |
| `provider.ollama.options.baseURL` | `http://OLLAMA_SERVER_IP:11434/v1` | **Replace with your LAN IP** |
| `mcp.openwebui` | `npx mcp-openapi-proxy` | MCP server proxying Open WebUI's REST API |

### `agents/coder.md` — Primary Coding Agent

- **Model**: `qwen2.5-coder:14b`
- **Mode**: `primary` (active on startup, cycle with Tab)
- **Permissions**: full read/edit/bash/glob/grep/list/lsp/task
- **Best for**: TypeScript edits, tRPC procedures, React components, DB queries, test writing

### `agents/reasoner.md` — Architecture Sub-Agent

- **Model**: `deepseek-r1:14b`
- **Mode**: `subagent` (invoke with `@reasoner`)
- **Permissions**: read-only (edit/bash denied)
- **Best for**: architectural trade-offs, complex algorithm design, debugging hard problems
- Produces structured output with decision tables and implementation notes for the `coder` agent

### `agents/reviewer.md` — Code Review Sub-Agent

- **Model**: `qwen3:14b`
- **Mode**: `subagent` (invoke with `@reviewer`)
- **Permissions**: read-only (edit/bash denied)
- **Best for**: post-feature review against Trinity coding standards
- Checks: type safety, auth on mutations, Zod validation, named exports, no `any`
- Outputs a numbered issue list with severity (CRITICAL / MAJOR / MINOR)

### `scripts/upload-knowledge.sh` — Knowledge Base Uploader

Discovers repo documentation and uploads it to 5 categorised Open WebUI Knowledge Bases:

| Knowledge Base | Slug | Source Files |
|----------------|------|-------------|
| Company Standards | `kb-company-standards` | `AGENTS.md`, `.github/**` |
| Coding Standards | `kb-coding-standards` | `AGENTS.md`, `eslint.config.js`, `prettier.config.js`, `tsconfig.json` |
| Architecture Docs | `kb-architecture` | `PLAN.md`, `drizzle/**`, `memories/**`, `.opencode/**` |
| API Specs | `kb-api-specs` | `src/server/api/**`, `src/trpc/**`, `src/server/better-auth/**`, `src/env.js` |
| README Files | `kb-readme` | All `README.md` files (excluding `node_modules`, `.git`, `.next`) |

**Script environment variables:**

| Variable | Default | Required |
|----------|---------|---------|
| `OPENWEBUI_URL` | `http://localhost:3000` | No (prompted) |
| `OPENWEBUI_API_KEY` | — | **Yes** (prompted) |
| `REPO_ROOT` | parent of `scripts/` | No |
| `POLL_TIMEOUT` | `120` | No |
| `POLL_INTERVAL` | `3` | No |
| `DRY_RUN` | `0` | No |

---

## Usage

### In-chat agent switching

```
Tab              → cycle primary agents
@reasoner        → invoke architecture agent
@reviewer        → invoke code review agent
/models          → switch model interactively
#kb-api-specs    → attach a Knowledge Base to the chat context
```

### Common workflows

**Start a new feature:**
```
You: @reasoner — should the new quiz feature use a separate tRPC router or extend the existing course router?
→ Reasoner analyses and recommends
You: (switch to coder) implement the quiz router as recommended
```

**Post-feature review:**
```
You: @reviewer — please review src/server/api/routers/quiz.ts
→ Reviewer outputs numbered issues
You: fix issues 1, 2, and 4
```

**Re-sync docs after code changes:**
```bash
./scripts/upload-knowledge.sh
```

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| `Cannot reach Open WebUI` | Check `OPENWEBUI_URL`, confirm Open WebUI is running on port 3000 |
| `Upload returns 400 empty content` | File still processing — script polls automatically; increase `POLL_TIMEOUT` |
| Tool calls not working in OpenCode | Increase `num_ctx` on Ollama server to ≥ 16384 |
| Model not found | Confirm `ollama pull <model>` ran on the Ubuntu server |
| Ollama unreachable | Verify `http://192.168.1.226:11434` is accessible from this machine (`curl http://192.168.1.226:11434`) |
| MCP Open WebUI tools not appearing | Ensure `OPENWEBUI_API_KEY` env var is set; run `opencode auth list` |
| Schema untrusted warning in VS Code | Harmless IDE warning — OpenCode resolves `$schema` correctly at runtime |
