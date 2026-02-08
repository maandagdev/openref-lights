# Frontend - OpenRef Lights

Angular web application for the powerlifting referee light system.

> **Part of the [OpenRef Lights](../README.md) monorepo** . See the root README for full project setup.

---

## Overview

The frontend provides all the interfaces needed to run a powerlifting competition:

- **Control Dashboard** : Monitor system state and manage the flow
- **Referee Interfaces** : Three separate decision panels (left, chief, right)
- **Jury Panel** : Override referee decisions when needed
- **Public Display** : Large view for the competition audience

All views stay synchronized in real-time through WebSocket connections to the backend.

---

## Tech Stack

- **Angular** 21: Modern Angular with signals
- **TypeScript** 5.9: Type-safe development
- **Custom CSS** : Lightweight custom styling with CSS variables
- **Socket. IO Client** : Real-time communication
- **Angular Signals** : Reactive state management

---

## Prerequisites

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher
- Backend server running (see [backend README](../backend/README.md))

If installing from the monorepo root, dependencies are automatically installed.

---

## Installation

**From monorepo root (recommended):**

```bash
npm install
```

**Standalone:**

```bash
cd frontend
npm install
```

---

## Configuration

Copy the example environment file:

```bash
cp src/app/environments/environment.example.ts \
   src/app/environments/environment.ts
```

Edit the file for your setup:

```typescript
// src/app/environments/environment.ts
export const environment = {
  debug: true, // Enable console logging for development
  backendUrl: 'http://localhost:3000',
  authToken: '', // Optional: must match backend AUTH_TOKEN
};
```

**For local development:** Use the defaults above.

**For competition deployment:** Update `backendUrl` to your server's IP address (e.g., `http://192.168.1.100:3000` ) and set `authToken` if you've configured one on the backend.

---

## Running the Application

**Development server:**

```bash
npm start
```

**From monorepo root:**

```bash
npm run dev:frontend
```

The app runs at `http://localhost:4200` with hot reload enabled.

> **Note:** The backend must be running for the app to function. Start it first with `npm run dev:backend` from the root.

---

## Application Routes

| Route            | Description                                     |
| ---------------- | ----------------------------------------------- |
| `/`              | Control Dashboard: system overview and controls |
| `/referee/left`  | Left Referee: decision panel                    |
| `/referee/chief` | Chief Referee: decision panel                   |
| `/referee/right` | Right Referee: decision panel                   |
| `/jury`          | Jury Panel: overrule interface                  |
| `/display`       | Public Display: audience-facing view            |

---

## Connecting to the Backend

The frontend connects to the backend WebSocket server using the `LiftService` . Connection is automatic when you navigate to any page.

**Service location:** `src/app/services/lift.service.ts`

**Example usage in a component:**

```typescript
import { LiftService } from '../services/lift.service';

@Component({ ... })
export class RefereeComponent {
  private liftService = inject(LiftService);

  // Get current state as a signal
  state = this.liftService.state;

  makeDecision(decision: Decision) {
    this.liftService.makeDecision(RefereePosition.CHIEF, decision);
  }
}
```

The service exposes:

- `state`: Current system state as a signal
- `connect()`: Connect to the backend WebSocket server
- `disconnect()`: Disconnect from the backend
- `makeDecision()`: Submit a referee decision
- `resetRefereeDecision()`: Retract a referee decision
- `revealDecisions()`: Reveal decisions to audience
- `resetAll()`: Reset system to awaiting decisions
- `juryOverrule()`: Submit jury override
- `clearJuryOverrule()`: Remove jury override

---

## Testing

**Run unit tests:**

```bash
npm test
```

**Run in watch mode (for development):**

```bash
npm run test -- --watch
```

Tests use Vitest with jsdom for DOM testing.

---

## Building for Deployment

```bash
npm run build
```

Output is generated in the `dist/` directory.

**Serve the build locally:**

```bash
npx serve dist/openref-lights-frontend/browser
```

---

## Docker

**Build the image:**

```bash
docker build -t openref-lights-frontend .
```

**Run with Nginx:**

```bash
docker run -p 80:80 openref-lights-frontend
```

The Dockerfile uses Nginx to serve the static files and handle client-side routing.

---

## Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm start`        | Start development server |
| `npm run build`    | Build for deployment     |
| `npm test`         | Run unit tests           |
| `npm run lint`     | Lint code                |
| `npm run lint:fix` | Lint and auto-fix        |
| `npm run format`   | Format with Prettier     |

---

## Troubleshooting

**WebSocket connection failed:**

- Ensure the backend is running on the correct port
- Check `environment.ts` has the right `backendUrl`
- Verify CORS is configured on the backend

---

## Related Documentation

- [Root README](../README.md): Full project overview
- [Backend README](../backend/README.md): WebSocket server
