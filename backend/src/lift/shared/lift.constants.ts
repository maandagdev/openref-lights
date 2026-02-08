// Event type constants
export const EVENT_TYPES = {
  REFEREE_CONNECTED: 'REFEREE_CONNECTED',
  REFEREE_DISCONNECTED: 'REFEREE_DISCONNECTED',
  DECISION: 'DECISION',
  RESET_REFEREE_DECISION: 'RESET_REFEREE_DECISION',
  REVEAL_DECISIONS: 'REVEAL_DECISIONS',
  RESET_ALL: 'RESET_ALL',
  JURY_OVERRULE: 'JURY_OVERRULE',
  CLEAR_JURY_OVERRULE: 'CLEAR_JURY_OVERRULE',
} as const;

// Enums for type safety
export enum RefereePosition {
  LEFT = 'left',
  CHIEF = 'chief',
  RIGHT = 'right',
}

export enum Decision {
  WHITE = 'white', // Good lift
  RED = 'red', // No lift reason 1
  BLUE = 'blue', // No lift reason 2
  YELLOW = 'yellow', // No lift reason 3
}

/** The number of referee decisions required for a complete lift. */
export const REQUIRED_REFEREE_COUNT = 3;

// Arrays for iteration
export const ALL_REFEREE_POSITIONS = [RefereePosition.LEFT, RefereePosition.CHIEF, RefereePosition.RIGHT] as const;

export const ALL_DECISIONS = [Decision.WHITE, Decision.RED, Decision.BLUE, Decision.YELLOW] as const;
