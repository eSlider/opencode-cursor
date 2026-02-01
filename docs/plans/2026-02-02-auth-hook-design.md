# AuthHook Integration Design

## Overview
Add OpenCode AuthHook integration to enable `opencode auth login cursor-acp` for seamless authentication via cursor-agent's OAuth flow.

## Goals
- Allow users to authenticate via `opencode auth login cursor-acp`
- Open browser automatically with cursor-agent's login URL
- Verify successful authentication
- No token parsing or management (cursor-agent handles everything)

## Architecture

### Auth Flow
```
User runs: opencode auth login cursor-acp
         │
         ▼
Plugin AuthHook triggered
         │
         ▼
Spawn: cursor-agent login
         │
         ▼
Capture loginDeepControl URL from stdout
         │
         ▼
Return to OpenCode: { url, instructions, callback }
         │
         ▼
OpenCode opens browser for user
         │
         ▼
User completes auth in browser
         │
         ▼
Callback verifies ~/.cursor/auth.json exists
         │
         ▼
Return success/failed to OpenCode
```

### Components

#### 1. Auth Module (src/auth.ts)
```typescript
export async function startCursorOAuth(): Promise<{
  url: string;
  instructions: string;
  callback: () => Promise<AuthResult>;
}> {
  // Spawn cursor-agent login
  // Parse loginDeepControl URL from stdout
  // Return URL + verification callback
}

export async function verifyCursorAuth(): Promise<boolean> {
  // Check if ~/.cursor/auth.json exists
  // Return true if authenticated
}
```

#### 2. AuthHook Integration (src/plugin.ts)
```typescript
auth: {
  provider: "cursor-acp",
  methods: [{
    type: "oauth",
    label: "Cursor",
    authorize: async () => {
      const { url, instructions, callback } = await startCursorOAuth();
      return {
        type: "oauth",
        url,
        instructions,
        callback
      };
    }
  }]
}
```

## Implementation Details

### URL Extraction
Parse cursor-agent stdout for login URL:
```typescript
const urlMatch = stdout.match(/https:\/\/cursor\.com\/loginDeepControl[^\s]+/);
```

### Verification
After callback, check for auth file:
```typescript
const authFile = path.join(homedir(), '.cursor', 'auth.json');
return fs.existsSync(authFile);
```

### Error Handling
- **cursor-agent not found**: Clear error with install instructions
- **Timeout**: "Authentication timed out, please try again"
- **User cancelled**: "Authentication cancelled"
- **No URL captured**: "Failed to get login URL from Cursor CLI"

## Files to Create/Modify

### New Files
- `src/auth.ts` - OAuth helper functions (~40 lines)

### Modified Files
- `src/plugin.ts` - Add `auth` hook to returned Hooks
- `src/index.ts` - Export auth module (if needed)

## Testing Plan

1. Run `opencode auth login cursor-acp`
2. Verify browser opens with cursor.com login URL
3. Complete authentication in browser
4. Verify success message in OpenCode
5. Verify `~/.cursor/auth.json` exists
6. Test using cursor-acp model: `opencode run "test" --model cursor-acp/auto`

## Dependencies
- No new dependencies needed
- Uses existing `child_process` and `fs` modules

## Notes
- No token parsing required
- No refresh logic needed
- No logout functionality (users can use `cursor-agent logout`)
- Re-authentication handled by re-running `opencode auth login cursor-acp`
