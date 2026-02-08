import { LiftStateMachine } from './lift.machine';
import { LiftState } from '../shared/lift.types';
import { EVENT_TYPES, RefereePosition, Decision } from '../shared/lift.constants';

describe('LiftMachine', () => {
  let machine: LiftStateMachine;

  beforeEach(() => {
    machine = new LiftStateMachine();
  });

  describe('Initial State', () => {
    it('should start in awaiting decisions state', () => {
      expect(machine.getSnapshot().state).toBe(LiftState.AWAITING_DECISIONS);
    });

    it('should have empty context', () => {
      const snapshot = machine.getSnapshot();
      expect(snapshot.context.decisions.size).toBe(0);
      expect(snapshot.context.connectedReferees.size).toBe(0);
      expect(snapshot.context.juryOverrule).toBeUndefined();
    });
  });

  describe('Referee Connection', () => {
    it('should track connected referees', () => {
      machine.send({ type: EVENT_TYPES.REFEREE_CONNECTED, position: RefereePosition.LEFT });
      machine.send({ type: EVENT_TYPES.REFEREE_CONNECTED, position: RefereePosition.CHIEF });

      const snapshot = machine.getSnapshot();
      expect(snapshot.context.connectedReferees.size).toBe(2);
      expect(snapshot.context.connectedReferees.has(RefereePosition.LEFT)).toBe(true);
      expect(snapshot.context.connectedReferees.has(RefereePosition.CHIEF)).toBe(true);
    });

    it('should remove disconnected referees', () => {
      machine.send({ type: EVENT_TYPES.REFEREE_CONNECTED, position: RefereePosition.LEFT });
      machine.send({ type: EVENT_TYPES.REFEREE_DISCONNECTED, position: RefereePosition.LEFT });

      const snapshot = machine.getSnapshot();
      expect(snapshot.context.connectedReferees.size).toBe(0);
    });
  });

  describe('Decision Flow', () => {
    it('should transition from awaiting decisions to collecting decisions on first decision', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });

      const snapshot = machine.getSnapshot();
      expect(snapshot.state).toBe(LiftState.COLLECTING_DECISIONS);
      expect(snapshot.context.decisions.get(RefereePosition.LEFT)).toBe(Decision.WHITE);
    });

    it('should check allDecisionsMade guard with non-DECISION event', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.CHIEF,
        decision: Decision.RED,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.RIGHT,
        decision: Decision.BLUE,
      });

      // Should be in readyToReveal state now
      expect(machine.getSnapshot().state).toBe(LiftState.READY_TO_REVEAL);
    });

    it('should transition to ready to reveal when all 3 referees decide', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.CHIEF,
        decision: Decision.RED,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.RIGHT,
        decision: Decision.BLUE,
      });

      const snapshot = machine.getSnapshot();
      expect(snapshot.state).toBe(LiftState.READY_TO_REVEAL);
      expect(snapshot.context.decisions.size).toBe(3);
    });

    it('should allow all 4 decision types', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.CHIEF,
        decision: Decision.RED,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.RIGHT,
        decision: Decision.YELLOW,
      });

      const snapshot = machine.getSnapshot();
      expect(snapshot.context.decisions.get(RefereePosition.LEFT)).toBe(Decision.WHITE);
      expect(snapshot.context.decisions.get(RefereePosition.CHIEF)).toBe(Decision.RED);
      expect(snapshot.context.decisions.get(RefereePosition.RIGHT)).toBe(Decision.YELLOW);
    });
  });

  describe('Decision Reset', () => {
    it('should allow referee to reset their decision', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.CHIEF,
        decision: Decision.RED,
      });

      expect(machine.getSnapshot().context.decisions.size).toBe(2);

      machine.send({
        type: EVENT_TYPES.RESET_REFEREE_DECISION,
        position: RefereePosition.LEFT,
      });

      const snapshot = machine.getSnapshot();
      expect(snapshot.context.decisions.size).toBe(1);
      expect(snapshot.context.decisions.has(RefereePosition.LEFT)).toBe(false);
      expect(snapshot.state).toBe(LiftState.COLLECTING_DECISIONS);
    });

    it('should transition back to awaiting decisions when last decision is reset', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });

      expect(machine.getSnapshot().state).toBe(LiftState.COLLECTING_DECISIONS);

      machine.send({
        type: EVENT_TYPES.RESET_REFEREE_DECISION,
        position: RefereePosition.LEFT,
      });

      expect(machine.getSnapshot().state).toBe(LiftState.AWAITING_DECISIONS);
    });

    it('should stay in collecting decisions when resetting one of multiple decisions', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.CHIEF,
        decision: Decision.RED,
      });

      expect(machine.getSnapshot().state).toBe(LiftState.COLLECTING_DECISIONS);

      // Reset one decision - should stay in collecting decisions
      machine.send({
        type: EVENT_TYPES.RESET_REFEREE_DECISION,
        position: RefereePosition.CHIEF,
      });

      const snapshot = machine.getSnapshot();
      expect(snapshot.state).toBe(LiftState.COLLECTING_DECISIONS);
      expect(snapshot.context.decisions.size).toBe(1);
    });
  });

  describe('Show and Reset', () => {
    it('should transition to revealing decisions from ready to reveal', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.CHIEF,
        decision: Decision.WHITE,
      });
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.RIGHT,
        decision: Decision.WHITE,
      });

      machine.send({ type: EVENT_TYPES.REVEAL_DECISIONS });

      expect(machine.getSnapshot().state).toBe(LiftState.REVEALING_DECISIONS);
    });

    it('should clear decisions on reset', () => {
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });
      machine.send({ type: EVENT_TYPES.RESET_ALL });

      const snapshot = machine.getSnapshot();
      expect(snapshot.state).toBe(LiftState.AWAITING_DECISIONS);
      expect(snapshot.context.decisions.size).toBe(0);
    });
  });

  describe('Jury Overrule', () => {
    it('should transition to juryOverrule state', () => {
      machine.send({
        type: EVENT_TYPES.JURY_OVERRULE,
        decision: Decision.WHITE,
      });

      const snapshot = machine.getSnapshot();
      expect(snapshot.state).toBe(LiftState.JURY_OVERRULE);
      expect(snapshot.context.juryOverrule?.decision).toBe(Decision.WHITE);
      expect(snapshot.context.juryOverrule?.timestamp).toBeDefined();
    });

    it('should block all events except clearJuryOverrule in juryOverrule state', () => {
      machine.send({
        type: EVENT_TYPES.JURY_OVERRULE,
        decision: Decision.RED,
      });

      // Try to make a decision (should be blocked)
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });

      const snapshot = machine.getSnapshot();
      expect(snapshot.state).toBe(LiftState.JURY_OVERRULE);
      expect(snapshot.context.decisions.size).toBe(0);
    });

    it('should clear jury overrule and return to awaiting decisions', () => {
      machine.send({
        type: EVENT_TYPES.JURY_OVERRULE,
        decision: Decision.BLUE,
      });

      machine.send({ type: EVENT_TYPES.CLEAR_JURY_OVERRULE });

      const snapshot = machine.getSnapshot();
      expect(snapshot.state).toBe(LiftState.AWAITING_DECISIONS);
      expect(snapshot.context.juryOverrule).toBeUndefined();
    });

    it('should allow jury overrule from any state', () => {
      // From collecting decisions state
      machine.send({
        type: EVENT_TYPES.DECISION,
        position: RefereePosition.LEFT,
        decision: Decision.WHITE,
      });

      expect(machine.getSnapshot().state).toBe(LiftState.COLLECTING_DECISIONS);

      machine.send({
        type: EVENT_TYPES.JURY_OVERRULE,
        decision: Decision.RED,
      });

      expect(machine.getSnapshot().state).toBe(LiftState.JURY_OVERRULE);
    });

    it('should clear decisions when clearing jury overrule after revealing decisions', () => {
      // All 3 refs submit decisions
      machine.send({ type: EVENT_TYPES.DECISION, position: RefereePosition.LEFT, decision: Decision.WHITE });
      machine.send({ type: EVENT_TYPES.DECISION, position: RefereePosition.CHIEF, decision: Decision.WHITE });
      machine.send({ type: EVENT_TYPES.DECISION, position: RefereePosition.RIGHT, decision: Decision.RED });
      machine.send({ type: EVENT_TYPES.REVEAL_DECISIONS });
      expect(machine.getSnapshot().state).toBe(LiftState.REVEALING_DECISIONS);

      // Jury overrules
      machine.send({ type: EVENT_TYPES.JURY_OVERRULE, decision: Decision.WHITE });
      expect(machine.getSnapshot().state).toBe(LiftState.JURY_OVERRULE);

      // Clear jury overrule
      machine.send({ type: EVENT_TYPES.CLEAR_JURY_OVERRULE });

      const snapshot = machine.getSnapshot();
      expect(snapshot.state).toBe(LiftState.AWAITING_DECISIONS);
      expect(snapshot.context.decisions.size).toBe(0);
      expect(snapshot.context.juryOverrule).toBeUndefined();
    });

    it('should persist jury overrule through display reset', () => {
      machine.send({
        type: EVENT_TYPES.JURY_OVERRULE,
        decision: Decision.YELLOW,
      });

      const juryOverrule = machine.getSnapshot().context.juryOverrule;

      machine.send({ type: EVENT_TYPES.RESET_ALL });

      const snapshot = machine.getSnapshot();
      expect(snapshot.context.juryOverrule).toEqual(juryOverrule);
    });
  });
});
