# Backend - OpenRef Lights

NestJS WebSocket server that powers the referee light system.

> **Part of the [OpenRef Lights](../README.md) monorepo** . See the root README for full project setup.

---

## Overview

The backend provides real-time communication for the referee light system using WebSockets. It manages the lift decision lifecycle through a custom state machine, ensuring all connected clients stay synchronized.

**Key responsibilities:**

- Manage referee connections and disconnections
- Track decisions from all three referee positions
- Handle jury overrule functionality
- Broadcast state changes to all connected clients

---

## Tech Stack

- **NestJS** 11: Progressive Node.js framework
- **Socket. IO** 4: Real-time bidirectional communication
- **TypeScript** 5: Type-safe development
- **Jest** : Testing framework

---

## Prerequisites

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher

If installing from the monorepo root, dependencies are automatically installed.

---

## Installation

**From monorepo root (recommended):**

```bash
npm install
```

**Standalone:**

```bash
cd backend
npm install
```

---

## Configuration

Create a `.env` file in the backend directory:

```bash
# Server port
PORT=3000

# Environment
NODE_ENV=development

# CORS configuration
CORS_ORIGIN=*

# Authentication token (optional)
# Provides basic access control - see Security note below
# Leave empty to disable, or generate with: openssl rand -hex 32
AUTH_TOKEN=
```

**Security Note:** The AUTH_TOKEN provides protection against casual unauthorized access but is transmitted in plaintext over HTTP/WebSocket. This is suitable for isolated/private networks (typical competition setup). For untrusted networks or internet-facing deployments, use HTTPS. See the main [README Security Considerations](../README.md#security-considerations) for details.

---

## Running the Server

**Development (with hot reload):**

```bash
npm run start:dev
```

**Debug mode:**

```bash
npm run start:debug
```

**Build for deployment:**

```bash
npm run build
npm run start:prod
```

**From monorepo root:**

```bash
npm run dev:backend
```

The server starts on `http://localhost:3000` by default.

---

## State Machine

The lift lifecycle is managed by a custom state machine with five states:

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                           │
│   awaitingDecisions ──► collectingDecisions ──► readyToReveal ──► revealingDecisions      │
│          ▲                      │                      │                  │               │
│          │                      │                      │                  │               │
│          │                      ▼                      ▼                  ▼               │
│          │                 juryOverrule ◄──────────────┴──────────────────┘               │
│          │                      │                                                         │
│          └──────────────────────┘                                                         │
│                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

| State                 | Description                                     |
| --------------------- | ----------------------------------------------- |
| `awaitingDecisions`   | Initial state. Waiting for referees to connect. |
| `collectingDecisions` | Referees connected. Waiting for decisions.      |
| `readyToReveal`       | All decisions submitted. Ready to display.      |
| `revealingDecisions`  | Lights visible to audience.                     |
| `juryOverrule`        | Jury has overridden the referee decision.       |

---

## WebSocket API

### Connection

Connect to the WebSocket server:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-auth-token',
  }, // Optional
});
```

### Client → Server Events

| Event                  | Payload                                             | Description                          |
| ---------------------- | --------------------------------------------------- | ------------------------------------ |
| `join`                 | `{ position?: 'left' \| 'chief' \| 'right' }`       | Join session (position for referees) |
| `decision`             | `{ position: RefereePosition, decision: Decision }` | Submit a referee decision            |
| `resetRefereeDecision` | `{ position: RefereePosition }`                     | Retract a referee decision           |
| `revealDecisions`      | -                                                   | Reveal decisions to audience         |
| `resetAll`             | -                                                   | Reset system to awaiting decisions   |
| `juryOverrule`         | `{ decision: Decision }`                            | Jury overrules referees              |
| `clearJuryOverrule`    | -                                                   | Remove jury overrule                 |

### Server → Client Events

| Event         | Payload                                      | Description                              |
| ------------- | -------------------------------------------- | ---------------------------------------- |
| `stateUpdate` | `{ state: LiftState, context: LiftContext }` | Full state snapshot after every change   |
| `error`       | `{ message: string }`                        | Error occurred (e.g. invalid auth token) |

### Decision Types

```typescript
enum Decision {
  WHITE = 'white', // Good lift
  RED = 'red', // No lift reason 1
  BLUE = 'blue', // No lift reason 2
  YELLOW = 'yellow', // No lift reason 3
}

enum RefereePosition {
  LEFT = 'left',
  CHIEF = 'chief',
  RIGHT = 'right',
}
```

---

## Testing

**Run all tests:**

```bash
npm test
```

**Watch mode:**

```bash
npm run test:watch
```

**With coverage:**

```bash
npm run test:cov
```

Coverage reports are generated in the `coverage/` directory.

---

## Docker

**Build the image:**

```bash
docker build -t openref-lights-backend .
```

**Run the container:**

```bash
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=* \
  openref-lights-backend
```

---

## Available Scripts

| Script                | Description               |
| --------------------- | ------------------------- |
| `npm run start:dev`   | Start with hot reload     |
| `npm run start:debug` | Start in debug mode       |
| `npm run start:prod`  | Start production build    |
| `npm run build`       | Build for production      |
| `npm test`            | Run tests                 |
| `npm run test:watch`  | Run tests in watch mode   |
| `npm run test:cov`    | Run tests with coverage   |
| `npm run lint`        | Lint code                 |
| `npm run format`      | Format code with Prettier |

---

## Related Documentation

- [Root README](../README.md): Full project overview
- [Frontend README](../frontend/README.md): Angular application
