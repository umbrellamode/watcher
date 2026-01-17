# Monitoring running Claude Code sessions: A technical deep-dive

**AgentWatch cannot fully monitor Claude Code sessions it didn't spawn—but partial monitoring is possible via JSONL log tailing.** Claude Code writes rich session data to `~/.claude/projects/<encoded-path>/*.jsonl` in real-time, making this the primary viable path for observing pre-existing sessions. However, capturing live terminal output from sessions you didn't start requires invasive OS-level techniques (strace, eBPF) with significant permissions and complexity tradeoffs. This architectural constraint shapes the product: AgentWatch should prioritize spawning sessions itself while offering degraded-but-useful monitoring for existing sessions via log file observation.

---

## Claude Code exposes no IPC channels for external monitoring

The research confirms **Claude Code does not expose any inter-process communication mechanisms** that external tools could connect to. There are no Unix domain sockets, named pipes, local HTTP servers, or D-Bus interfaces. Each `claude` invocation runs as an independent single process with no background daemon.

| IPC Type | Status | Notes |
|----------|--------|-------|
| Unix sockets | ❌ Not exposed | No socket files in ~/.claude/ |
| Named pipes | ❌ Not implemented | No FIFOs created |
| Local HTTP/WS | ❌ None | No REST API or WebSocket server |
| D-Bus | ❌ Not implemented | Linux-only anyway |
| Shared memory | ❌ None documented | No mmap-based communication |

This means AgentWatch cannot "connect to" a running session the way a tmux client connects to a tmux server. The process model is fundamentally different—tmux's server owns the PTY and maintains screen buffers; Claude Code's process owns its own terminal directly.

---

## JSONL log files enable real-time session observation

Claude Code writes comprehensive session data to disk that **can be tailed for real-time monitoring**:

**Primary location**: `~/.claude/projects/<encoded-directory-name>/*.jsonl`

Each JSONL file contains newline-delimited JSON records including:
- Full conversation history (user prompts, assistant responses)
- Tool invocations with inputs and outputs
- File context (files read, modified, created)
- Timestamps and session metadata
- Background task states (command, PID, output position)
- Permission approvals

**Example path**: `~/.claude/projects/-Users-alice-myproject/session-abc123.jsonl`

**Implementation approach**:
```bash
# Watch for new session files and tail them
fswatch -r ~/.claude/projects/ | while read path; do
  if [[ $path == *.jsonl ]]; then
    tail -f "$path" | jq --unbuffered '.type, .message.content'
  fi
done
```

This provides **structured data about what Claude is doing** (tool calls, responses, context) but does **not** capture raw terminal output (colors, interactive prompts, real-time streaming text). For many monitoring use cases—cost tracking, tool usage analysis, conversation history—this is sufficient.

**Additional data sources**:
- **SQLite session database** at `~/.claude/` stores session metadata and can be queried
- **CLAUDE.md memory files** at `~/.claude/CLAUDE.md` and `./CLAUDE.md` track persistent context
- **OpenTelemetry export** can be configured via `OTEL_EXPORTER_OTLP_ENDPOINT` for structured telemetry

---

## MCP cannot observe Claude Code sessions

The Model Context Protocol is architecturally **unidirectional**—it provides context *to* Claude Code, not observability *of* Claude Code. MCP servers are passive providers that only see requests Claude sends to them; they have no visibility into conversations, other MCP connections, or internal state.

Key limitations for monitoring:
- **Claude Code initiates all connections** outward to MCP servers; servers cannot initiate connections back
- **No session introspection primitives** exist in MCP (Tools, Resources, Prompts are all for providing data to Claude)
- **Adding MCP servers requires session restart**—cannot inject monitoring mid-session
- **MCP Inspector** is for testing servers you control, not intercepting Claude Code traffic

An MCP server you create would only see the specific tool calls Claude makes to it—not the broader conversation or other activity. This makes MCP unsuitable for general session monitoring.

---

## The SDK spawns new processes; session resume is the closest alternative

The `@anthropic-ai/claude-agent-sdk` (renamed from claude-code) spawns Claude Code as a child process with `--output-format stream-json`, capturing stdout for structured messages:

**stream-json message types**:
- `system` (init): Session ID, model, available tools, MCP servers
- `assistant`: Claude's responses with content blocks and tool_use
- `user`: Tool results with execution data
- `result`: Final outcome with cost, duration, token usage

**Critical limitation**: The SDK provides **no mechanism to attach to existing processes**. Each invocation spawns fresh. However, **session resume** offers a functional alternative:

```typescript
// Resume a session by ID (spawns new process, reloads conversation context)
const response = query({
  prompt: "Continue where we left off",
  options: { resume: "550e8400-e29b-41d4-a716-446655440001" }
})
```

This doesn't attach to a running process—it starts a new process that loads the conversation history from the stored session. For AgentWatch, this means you can:
1. Discover session IDs from `~/.claude/projects/`
2. Present them to users for "takeover" functionality
3. Spawn a new monitored process that continues the conversation

But you **cannot observe a session while another process is actively running it**.

---

## OS-level process attachment is technically possible but complex

For capturing raw terminal output from already-running Claude Code processes, several OS-level techniques exist with varying tradeoffs:

### Linux: strace or eBPF (recommended)

**strace** intercepts `write()` syscalls to capture stdout/stderr:
```bash
# Attach to running Claude process and capture output
strace -e trace=write -s 100000 -p $(pgrep -f "claude") 2>&1 | \
  grep '^write([12],' | sed 's/write([12], "\(.*\)",.*/\1/'
```

**Permissions required**: Same user works if `ptrace_scope=0`; root required for other users or restrictive systems. Check `/proc/sys/kernel/yama/ptrace_scope` (Ubuntu defaults to 1, restricting to parent processes only).

**eBPF** via bpftrace offers lower overhead:
```bash
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_write
/pid == '$PID' && (args->fd == 1 || args->fd == 2)/
{ printf("%s", str(args->buf, args->count)); }'
```

Requires root/CAP_BPF and kernel 4.9+, but adds minimal performance impact.

### macOS: DTrace with SIP limitations

```bash
sudo dtruss -t write -p $(pgrep -f "claude")
```

**System Integrity Protection severely restricts DTrace**: Cannot trace Apple-signed binaries in `/usr/bin`, `/bin`, `/System`. Since `claude` is typically installed via npm in user space, it's usually traceable. However, you may need to:
```bash
# Disable DTrace restrictions (requires Recovery Mode)
csrutil enable --without dtrace
```

### GDB/LLDB file descriptor redirection

Attach and redirect future output to a file:
```bash
sudo gdb -p $PID
(gdb) p dup2(open("/tmp/claude_output.log", 1089, 0644), 1)
(gdb) detach
# Now tail -f /tmp/claude_output.log
```

This **redirects future output only**—past output is lost. Works on both platforms with appropriate permissions.

### Practical limitations

| Technique | Platform | Permissions | Captures past output? | Performance impact |
|-----------|----------|-------------|----------------------|-------------------|
| strace | Linux | Same user (varies) | No | Moderate |
| eBPF | Linux | Root | No | Low |
| DTrace | macOS | Root + SIP config | No | Low |
| GDB/LLDB | Both | Same user | No | Minimal after detach |

**Key insight**: None of these capture output that occurred before attachment. They only intercept future writes.

---

## Existing tools all require spawning the process

Analysis of existing Claude Code management tools reveals a consistent pattern: **none support attaching to pre-existing sessions**.

**CCManager** (kbwo/ccmanager): Spawns Claude Code within its own PTY sessions, parses terminal output for state detection (waiting, busy, idle). Uses pattern matching on output—cannot attach to processes it didn't start.

**Claude Squad** (smtg-ai/claude-squad): Uses tmux as the session manager. Creates `tmux new-session -d -s <name> 'claude'`, then uses `tmux capture-pane` and `tmux send-keys` for I/O. If Claude wasn't started in tmux, Claude Squad can't monitor it.

**interminai**: Most relevant architecture—creates PTY pairs, spawns programs on the slave side, exposes Unix socket for external I/O control. Designed for AI agents to control interactive CLIs, but still requires spawning.

**tmux/screen** themselves can attach to existing sessions only because the **tmux server** originally spawned the process and owns the PTY. A standalone Claude Code process owns its own TTY—tmux cannot adopt it.

**Log-based tools** (ccusage, claude-code-usage-monitor): These successfully monitor existing sessions by watching `~/.claude/projects/` JSONL files. They track cost, token usage, and conversation history without spawning. This is the proven pattern for "passive" monitoring.

---

## Architecture recommendation for AgentWatch

Given these constraints, AgentWatch should adopt a **hybrid architecture**:

### For new sessions: PTY wrapper (full monitoring)

Spawn Claude Code within a PTY proxy that AgentWatch controls:

```
┌─────────────┐      ┌──────────────────┐      ┌───────────────┐
│ AgentWatch  │◄────►│ PTY Manager      │◄────►│ Claude Code   │
│    App      │ IPC  │ (owns master)    │ PTY  │   Process     │
└─────────────┘      └──────────────────┘      └───────────────┘
```

Use `node-pty` (Node.js) or `pty` (Python) to create PTY pairs. This gives:
- Complete stdout/stderr capture with colors and formatting
- Input injection capability
- Session persistence (AgentWatch can detach/reattach)
- Full stream-json parsing via `--output-format stream-json`

### For existing sessions: JSONL log observation (partial monitoring)

```
┌─────────────┐      ┌──────────────────────┐
│ AgentWatch  │◄────►│ ~/.claude/projects/  │
│    App      │ watch│  *.jsonl files       │
└─────────────┘      └──────────────────────┘
                              ▲
                              │ writes
                     ┌────────┴────────┐
                     │ Existing Claude │
                     │  Code Process   │
                     └─────────────────┘
```

This provides:
- Conversation history and tool calls
- Token usage and cost data
- Session metadata and timestamps
- **No** real-time terminal output or interactive control

### Optional enhancement: strace/eBPF for terminal capture

For users who want raw terminal output from existing sessions:
- Offer as opt-in "advanced monitoring" feature
- Clearly communicate permissions requirements
- Use eBPF on Linux for minimal overhead; accept macOS limitations
- Parse ANSI escape sequences to render in AgentWatch UI

### Feature matrix by session origin

| Capability | AgentWatch-spawned | Pre-existing (logs) | Pre-existing (strace) |
|------------|-------------------|--------------------|-----------------------|
| Conversation history | ✅ | ✅ | ❌ |
| Tool call details | ✅ | ✅ | Partial |
| Real-time terminal | ✅ | ❌ | ✅ |
| Token/cost tracking | ✅ | ✅ | ❌ |
| Input injection | ✅ | ❌ | ❌ |
| Session takeover | ✅ | Via resume* | ❌ |

*Session resume starts new process; original continues independently.

---

## Conclusion

**AgentWatch cannot fully attach to pre-existing Claude Code sessions**, but this isn't a blocker—it's a product design constraint. The recommended architecture spawns new sessions for full monitoring while offering useful degraded monitoring for existing sessions via JSONL log observation. This mirrors how every existing tool (CCManager, Claude Squad) handles the problem. The JSONL logs are surprisingly rich, containing everything except raw terminal output, which makes "log-only" monitoring viable for many use cases. For users needing terminal output from existing sessions, OS-level techniques (strace, eBPF) are available as an advanced option with clear tradeoffs.

The key insight is that Claude Code's architecture—independent processes with no IPC, but rich local logging—enables a practical hybrid approach rather than forcing an all-or-nothing decision.