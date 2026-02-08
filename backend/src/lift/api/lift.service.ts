import { Injectable } from '@nestjs/common';
import { LiftStateMachine } from '../core/lift.machine';
import { LiftSnapshot } from '../shared/lift.types';
import { EVENT_TYPES, RefereePosition, Decision } from '../shared/lift.constants';

/**
 * Service layer that encapsulates the lift state machine.
 *
 * Provides a clean API for interacting with the state machine without
 * exposing its internal implementation. All state changes go through
 * this service to maintain consistency.
 */
@Injectable()
export class LiftService {
  private machine = new LiftStateMachine();

  /**
   * Subscribe to state changes.
   *
   * @param callback Function called with snapshot after each state change
   * @returns Unsubscribe function to clean up the subscription
   */
  subscribe(callback: (snapshot: LiftSnapshot) => void): () => void {
    return this.machine.subscribe(callback);
  }

  /**
   * Get current state snapshot.
   *
   * @returns Immutable snapshot of the current state
   */
  getState(): LiftSnapshot {
    return this.machine.getSnapshot();
  }

  /**
   * Record a referee's decision.
   *
   * @param position Referee position (left, chief, right)
   * @param decision Decision value (white, red, blue, yellow)
   */
  makeDecision(position: RefereePosition, decision: Decision) {
    this.machine.send({ type: EVENT_TYPES.DECISION, position, decision });
  }

  /**
   * Allow a referee to retract their decision.
   *
   * @param position Referee position to reset
   */
  resetRefereeDecision(position: RefereePosition) {
    this.machine.send({ type: EVENT_TYPES.RESET_REFEREE_DECISION, position });
  }

  /** Trigger display of lights once all decisions are made. */
  revealDecisions() {
    this.machine.send({ type: EVENT_TYPES.REVEAL_DECISIONS });
  }

  /** Clear all decisions and return to awaiting decisions state. */
  resetAll() {
    this.machine.send({ type: EVENT_TYPES.RESET_ALL });
  }

  /**
   * Set a jury overrule decision.
   *
   * @param decision Jury's overrule decision
   */
  juryOverrule(decision: Decision) {
    this.machine.send({ type: EVENT_TYPES.JURY_OVERRULE, decision });
  }

  /** Clear the jury overrule and return to awaiting decisions. */
  clearJuryOverrule() {
    this.machine.send({ type: EVENT_TYPES.CLEAR_JURY_OVERRULE });
  }

  /**
   * Register a referee as connected.
   *
   * @param position Referee position that connected
   */
  refereeConnected(position: RefereePosition) {
    this.machine.send({ type: EVENT_TYPES.REFEREE_CONNECTED, position });
  }

  /**
   * Register a referee as disconnected.
   *
   * @param position Referee position that disconnected
   */
  refereeDisconnected(position: RefereePosition) {
    this.machine.send({ type: EVENT_TYPES.REFEREE_DISCONNECTED, position });
  }
}
