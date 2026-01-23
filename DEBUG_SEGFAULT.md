# Bun/OpenCode Segfault Investigation

## Issue
OpenCode segfaults when loading this plugin, even though:
- The plugin structure matches working plugins (opencode-notifier, opencode-gemini-auth)
- The plugin loads correctly in Node.js
- The plugin exports are correct
- No hook.config errors

## Observations

1. **Bundle Size**: Our plugin bundles the entire `@agentclientprotocol/sdk` (480KB, 14,469 lines)
   - When externalized: 23KB
   - Working plugins are much smaller (opencode-notifier: ~5KB source)

2. **Module Loading**: 
   - Plugin loads fine in Node.js
   - Plugin function works when called directly
   - Segfault happens specifically in Bun/opencode

3. **ACP SDK**: 
   - SDK loads fine standalone in Node.js
   - No issues importing it directly

4. **Differences from working plugins**:
   - opencode-gemini-auth: Uses `"module": "index.ts"` (TypeScript, not compiled)
   - opencode-notifier: Compiles to dist but much smaller bundle
   - Our plugin: Large bundle with ACP SDK included

## Hypothesis

The segfault might be caused by:
1. **Bun's handling of large bundled modules** - The 480KB bundle might trigger a bug in Bun's module loader
2. **ACP SDK compatibility** - Something in the bundled ACP SDK code doesn't work well with Bun's runtime
3. **Circular dependencies** - The ACP SDK bundle might have circular deps that Bun can't handle
4. **Memory issues** - The large bundle might be causing memory issues in Bun

## Related Issues Found

1. **opencode #4970** (CLOSED): "Since opencode 1.0.116 no longer able to run binary as it crashes with bun seg fault"
   - Was linked to Bun bug: oven-sh/bun#25276
   - Suggests segfaults can be Bun-related bugs, not necessarily plugin issues

2. **opencode #3876** (OPEN): "Segfaults on musl box"
   - About binary segfaults on musl systems (Alpine Linux)
   - Not plugin-related

3. **No specific plugin segfault issues found** - This suggests our issue might be unique or related to:
   - Large bundle size (480KB vs typical ~5KB)
   - ACP SDK bundling
   - Bun's handling of large bundled modules

## Next Steps to Debug

1. Try externalizing ACP SDK and see if opencode can load it from node_modules
2. Check if other plugins that bundle large dependencies have similar issues
3. Test with a minimal plugin that just imports ACP SDK
4. Check Bun version compatibility (currently 1.3.5)
5. Look for Bun issues related to large bundled modules
6. Check if issue is reproducible with Bun 1.3.6 (newer version)
7. Consider reporting to Bun if it's a Bun bug with large bundles

## Test Commands

```bash
# Test plugin in Node.js (works)
node -e "const m = require('./dist/index.js'); console.log(m.default);"

# Test in Bun (segfaults)
bun run dist/index.js

# Test with external ACP SDK
bun build ./src/index.ts --outdir ./dist --target node --external "@agentclientprotocol/sdk"
```
