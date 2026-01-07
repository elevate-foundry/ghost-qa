# Ghost QA 👻

An autonomous QA bot that tests your local web applications in the background. Point it at a localhost URL and let it find bugs while you code.

## Features

- **Autonomous Testing**: Randomly clicks buttons, fills forms, and navigates links
- **Smart Avoidance**: Automatically avoids delete/remove buttons to prevent data loss
- **Error Detection**: Catches HTTP errors (4xx, 5xx), console errors, and page crashes
- **Native Notifications**: Get desktop alerts when errors are found
- **Screenshot Capture**: Automatically saves screenshots of errors to your desktop
- **Floating Window**: Always-on-top UI that stays visible while you work
- **Real-time Stats**: Track actions performed, errors found, and pages visited

## Installation

```bash
cd ghostqa
npm install
```

This will install Electron and Playwright, and automatically download Chromium.

## Usage

```bash
npm start
```

1. Enter your localhost URL (e.g., `http://localhost:3000`)
2. Configure the testing interval and max actions
3. Click "Start Testing"
4. Watch the Ghost find bugs in your app!

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| Target URL | `http://localhost:3000` | The URL to test |
| Interval | `2000ms` | Time between actions |
| Max Actions | `100` | Stop after this many actions |
| Screenshot on Error | `true` | Save screenshots when errors occur |

## How It Works

Ghost QA uses Playwright to control a real Chromium browser. It performs weighted random actions:

- **40%** - Click random interactive elements
- **25%** - Fill form fields with test data (including edge cases like XSS, SQL injection strings)
- **20%** - Navigate to random links
- **10%** - Scroll the page
- **5%** - Hover over elements

### Safety Features

The bot automatically avoids:
- Buttons containing "delete", "remove", or "destroy"
- Elements with `[data-danger]` attribute
- Elements with `.delete` or `.remove` classes
- Submit buttons with delete-related values

## Screenshots

Error screenshots are saved to: `~/Desktop/ghost-qa-screenshots/`

## Development

```bash
npm run dev
```

This opens DevTools for debugging.

## Tech Stack

- **Electron** - Desktop app framework
- **Playwright** - Browser automation
- **Chromium** - Real browser rendering

## License

MIT
