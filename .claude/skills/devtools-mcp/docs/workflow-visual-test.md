# Visual Test

Run `bootstrap.md` first (2-3 tool calls max).

Then execute using DIRECT MCP tool calls (not `claude mcp call`):

## Viewports

| Device | Width | Height |
|--------|-------|--------|
| Mobile | 375 | 812 |
| Tablet | 768 | 1024 |
| Desktop | 1920 | 1080 |

## For each page and viewport:

1. Call `navigate_page` with url
2. Call `resize_page` with width and height
3. Wait 1 second
4. Call `take_screenshot` → save to `./screenshots/{page}/{viewport}-light.png`
5. If dark mode requested: call `emulate` with colorScheme="dark" → screenshot → reset

## Report
```
✅ Visual Test Complete — N screenshots captured
Saved to: ./screenshots/
```
