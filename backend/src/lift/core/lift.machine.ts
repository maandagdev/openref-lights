import { LiftContext, LiftEvent, LiftState, LiftSnapshot } from '../shared/lift.types';
import { EVENT_TYPES, RefereePosition, Decision, REQUIRED_REFEREE_COUNT } from '../shared/lift.constants';

type StateChangeCallback = (snapshot: LiftSnapshot) => void;

/**
 * State machine that manages the lifecycle of a powerlifting lift.
 *
 * Handles the flow from awaitingDecisions -> collectingDecisions -> readyToReveal -> revealingDecisions,
 * including jury overrule capabilities and referee connection tracking.
 *
 * Uses the observer pattern to notify subscribers of state changes.
 */
export class LiftStateMachine {
  private state: LiftState = LiftState.AWAITING_DECISIONS;
  private context: LiftContext = {
    decisions: new Map<RefereePosition, Decision>(),
    connectedReferees: new Set<RefereePosition>(),
    juryOverrule: undefined,
  };
  private subscribers: StateChangeCallback[] = [];

  /**
   * Returns a deep copy of the current state and context.
   * This prevents external mutation of the internal state while
   * allowing subscribers to safely read the current state.
   *
   * @returns Immutable snapshot of current state
   */
  getSnapshot(): LiftSnapshot {
    return {
      state: this.state,
      context: {
        decisions: new Map(this.context.decisions),
        connectedReferees: new Set(this.context.connectedReferees),
        juryOverrule: this.context.juryOverrule ? { ...this.context.juryOverrule } : undefined,
      },
    };
  }

  /**
   * Subscribe to state changes. Callback is invoked after every state transition.
   *
   * @param callback Function to call with new snapshot after state changes
   * @returns Unsubscribe function to clean up the subscription
   */
  subscribe(callback: StateChangeCallback): () => void {
    this.subscribers.push(callback);
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * Processes an event and triggers the appropriate state transition.
   * All state changes happen through this method to ensure consistency
   * and proper subscriber notification.
   *
   * @param event The event to process
   */
  send(event: LiftEvent): void {
    switch (event.type) {
      case EVENT_TYPES.REFEREE_CONNECTED:
        this.onRefereeConnected(event);
        break;
      case EVENT_TYPES.REFEREE_DISCONNECTED:
        this.onRefereeDisconnected(event);
        break;
      case EVENT_TYPES.DECISION:
        this.onDecision(event);
        break;
      case EVENT_TYPES.RESET_REFEREE_DECISION:
        this.onResetRefereeDecision(event);
        break;
      case EVENT_TYPES.REVEAL_DECISIONS:
        this.onRevealDecisions();
        break;
      case EVENT_TYPES.RESET_ALL:
        this.onResetAll();
        break;
      case EVENT_TYPES.JURY_OVERRULE:
        this.onJuryOverrule(event);
        break;
      case EVENT_TYPES.CLEAR_JURY_OVERRULE:
        this.onClearJuryOverrule();
        break;
    }
    this.notifySubscribers();
  }

  /** Tracks a referee as connected. Connection tracking is independent of lift state. */
  private onRefereeConnected(event: LiftEvent): void {
    if (event.type === EVENT_TYPES.REFEREE_CONNECTED) {
      this.context.connectedReferees.add(event.position);
    }
  }

  /** Removes a referee from connected list. Connection tracking is independent of lift state. */
  private onRefereeDisconnected(event: LiftEvent): void {
    if (event.type === EVENT_TYPES.REFEREE_DISCONNECTED) {
      this.context.connectedReferees.delete(event.position);
    }
  }

  /**
   * Records a referee's decision. Transitions state:
   * - AWAITING_DECISIONS -> COLLECTING_DECISIONS (first decision)
   * - COLLECTING_DECISIONS -> READY_TO_REVEAL (when 3 decisions recorded)
   * Blocked during jury overrule.
   */
  private onDecision(event: LiftEvent): void {
    if (event.type !== EVENT_TYPES.DECISION) return;
    if (this.state === LiftState.JURY_OVERRULE) return;

    this.context.decisions.set(event.position, event.decision);
    this.state = this.allDecisionsMade() ? LiftState.READY_TO_REVEAL : LiftState.COLLECTING_DECISIONS;
  }

  /**
   * Allows a referee to retract their decision before lights are revealed.
   * Transitions COLLECTING_DECISIONS -> AWAITING_DECISIONS if this was the last decision.
   * Blocked in READY_TO_REVEAL, REVEALING_DECISIONS, and JURY_OVERRULE states.
   */
  private onResetRefereeDecision(event: LiftEvent): void {
    if (event.type !== EVENT_TYPES.RESET_REFEREE_DECISION) return;
    if (
      this.state === LiftState.JURY_OVERRULE ||
      this.state === LiftState.READY_TO_REVEAL ||
      this.state === LiftState.REVEALING_DECISIONS
    )
      return;

    this.context.decisions.delete(event.position);
    if (this.state === LiftState.COLLECTING_DECISIONS && this.context.decisions.size === 0) {
      this.state = LiftState.AWAITING_DECISIONS;
    }
  }

  /** Transitions READY_TO_REVEAL -> REVEALING_DECISIONS to display lights. */
  private onRevealDecisions(): void {
    if (this.state === LiftState.READY_TO_REVEAL) {
      this.state = LiftState.REVEALING_DECISIONS;
    }
  }

  /**
   * Clears all decisions and returns to AWAITING_DECISIONS state.
   * Blocked during jury overrule (use clearJuryOverrule instead).
   */
  private onResetAll(): void {
    if (this.state === LiftState.JURY_OVERRULE) return;

    this.context.decisions.clear();
    this.state = LiftState.AWAITING_DECISIONS;
  }

  /**
   * Jury overrule allows jury to force a specific decision,
   * overruling referee decisions. Transitions to JURY_OVERRULE state.
   * Can be changed while already in jury overrule state.
   */
  private onJuryOverrule(event: LiftEvent): void {
    if (event.type !== EVENT_TYPES.JURY_OVERRULE) return;

    this.context.juryOverrule = {
      decision: event.decision,
      timestamp: Date.now(),
    };
    this.state = LiftState.JURY_OVERRULE;
  }

  /**
   * Clears jury overrule and returns to AWAITING_DECISIONS state.
   * This is the only way to exit JURY_OVERRULE state.
   * Also clears all decisions to avoid stale decisions from the previous round.
   */
  private onClearJuryOverrule(): void {
    this.context.juryOverrule = undefined;
    if (this.state === LiftState.JURY_OVERRULE) {
      this.context.decisions.clear();
      this.state = LiftState.AWAITING_DECISIONS;
    }
  }

  /** Returns true when all required referee decisions have been recorded. */
  private allDecisionsMade(): boolean {
    return this.context.decisions.size >= REQUIRED_REFEREE_COUNT;
  }

  /** Notifies all subscribers with a fresh snapshot of the current state. */
  private notifySubscribers(): void {
    const snapshot = this.getSnapshot();
    this.subscribers.forEach((callback) => callback(snapshot));
  }
}
