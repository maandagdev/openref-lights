export enum RefereePosition {
  LEFT = 'left',
  CHIEF = 'chief',
  RIGHT = 'right',
}

export enum Decision {
  WHITE = 'white',
  RED = 'red',
  BLUE = 'blue',
  YELLOW = 'yellow',
}

export enum LiftStateType {
  AWAITING_DECISIONS = 'awaitingDecisions',
  COLLECTING_DECISIONS = 'collectingDecisions',
  READY_TO_REVEAL = 'readyToReveal',
  REVEALING_DECISIONS = 'revealingDecisions',
  JURY_OVERRULE = 'juryOverrule',
}

export interface RefereeDecision {
  position: RefereePosition;
  decision: Decision;
}

export interface JuryOverrule {
  decision: Decision;
  timestamp: number;
}

export interface LiftState {
  state: LiftStateType;
  context: {
    decisions: RefereeDecision[];
    connectedReferees: RefereePosition[];
    juryOverrule?: JuryOverrule;
  };
}
