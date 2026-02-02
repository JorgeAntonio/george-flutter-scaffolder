# George Flutter Architect AI (v2.0)

An AI-powered CLI agent designed to scaffold Flutter projects strictly following the **"George Stack" Clean Architecture**. Built with `@github/copilot-sdk`.

## The "George Stack" Architecture
This tool enforces a strict Clean Architecture pattern:
- **Structure:** `lib/src/{core, features, shared}`
- **Core:** `app`, `assets`, `config`, `constants`, `providers`, `routing`, `services`, `theme`
- **Shared:** `widgets`, `utils`, `extensions`, `presentation`
- **Features:** Modularized by feature (`data`, `domain`, `presentation`)
- **Tech Stack:** `flutter_riverpod`, `go_router`, `dio`, `freezed`, `flutter_hooks`

## New in v2.0: Interactive Architect
The agent now acts as a Lead Architect:
1.  **Brainstorms** features based on your project idea.
2.  **Clarifies** requirements (Navigation style, Organization).
3.  **Generates** a complete scaffold with working routing (Bottom Nav / Drawer) and feature placeholders.

## Prerequisites
- Node.js (v18+ recommended)
- Flutter SDK installed and available in your PATH.
- A GitHub Token with Copilot access (configured in `.env`).

## Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory and add your GitHub Token:
    ```env
    GITHUB_TOKEN=your_github_token_here
    ```

## Usage

### Development Mode
Run the agent directly with `ts-node`:
```bash
npm run dev
```

### Build and Run
Build the project to JavaScript:
```bash
npm run build
```
Run the compiled script:
```bash
node dist/scaffolder.js
```

## How it works
The agent uses the GitHub Copilot SDK to interpret natural language commands.

**Example Interaction:**
> User: "I want to build a crypto wallet app."
> Agent: "Analyzing... I suggest features like 'Auth', 'Wallet', 'Market'. What navigation style do you prefer? (Bottom Nav / Drawer)"
> User: "Bottom Nav, please."
> Agent: *Scaffolds the entire project with configured routing and folders.*
