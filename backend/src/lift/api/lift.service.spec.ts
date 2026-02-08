import { Test, TestingModule } from '@nestjs/testing';
import { LiftService } from './lift.service';
import { LiftState } from '../shared/lift.types';
import { RefereePosition, Decision } from '../shared/lift.constants';

describe('LiftService', () => {
  let service: LiftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiftService],
    }).compile();

    service = module.get<LiftService>(LiftService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const state = service.getState();
      expect(state.state).toBe(LiftState.AWAITING_DECISIONS);
      expect(state.context.decisions.size).toBe(0);
    });
  });

  describe('makeDecision', () => {
    it('should record a decision', () => {
      service.makeDecision(RefereePosition.LEFT, Decision.WHITE);
      const state = service.getState();

      expect(state.context.decisions.get(RefereePosition.LEFT)).toBe(Decision.WHITE);
    });

    it('should accept all decision types', () => {
      service.makeDecision(RefereePosition.LEFT, Decision.WHITE);
      service.makeDecision(RefereePosition.CHIEF, Decision.RED);
      service.makeDecision(RefereePosition.RIGHT, Decision.BLUE);

      const state = service.getState();
      expect(state.context.decisions.get(RefereePosition.LEFT)).toBe(Decision.WHITE);
      expect(state.context.decisions.get(RefereePosition.CHIEF)).toBe(Decision.RED);
      expect(state.context.decisions.get(RefereePosition.RIGHT)).toBe(Decision.BLUE);
    });

    it('should change state to collecting decisions on first decision', () => {
      service.makeDecision(RefereePosition.LEFT, Decision.WHITE);
      expect(service.getState().state).toBe(LiftState.COLLECTING_DECISIONS);
    });

    it('should change state to ready to reveal when all 3 decide', () => {
      service.makeDecision(RefereePosition.LEFT, Decision.WHITE);
      service.makeDecision(RefereePosition.CHIEF, Decision.WHITE);
      service.makeDecision(RefereePosition.RIGHT, Decision.WHITE);

      expect(service.getState().state).toBe(LiftState.READY_TO_REVEAL);
    });
  });

  describe('resetRefereeDecision', () => {
    it('should clear a referee decision', () => {
      service.makeDecision(RefereePosition.LEFT, Decision.WHITE);
      service.resetRefereeDecision(RefereePosition.LEFT);

      const state = service.getState();
      expect(state.context.decisions.has(RefereePosition.LEFT)).toBe(false);
    });
  });

  describe('revealDecisions', () => {
    it('should transition to revealing decisions state', () => {
      service.makeDecision(RefereePosition.LEFT, Decision.WHITE);
      service.makeDecision(RefereePosition.CHIEF, Decision.WHITE);
      service.makeDecision(RefereePosition.RIGHT, Decision.WHITE);
      service.revealDecisions();

      expect(service.getState().state).toBe(LiftState.REVEALING_DECISIONS);
    });
  });

  describe('resetAll', () => {
    it('should clear all decisions', () => {
      service.makeDecision(RefereePosition.LEFT, Decision.WHITE);
      service.makeDecision(RefereePosition.CHIEF, Decision.RED);
      service.resetAll();

      const state = service.getState();
      expect(state.context.decisions.size).toBe(0);
      expect(state.state).toBe(LiftState.AWAITING_DECISIONS);
    });
  });

  describe('juryOverrule', () => {
    it('should set jury overrule', () => {
      service.juryOverrule(Decision.WHITE);

      const state = service.getState();
      expect(state.state).toBe(LiftState.JURY_OVERRULE);
      expect(state.context.juryOverrule?.decision).toBe(Decision.WHITE);
    });

    it('should accept all decision types', () => {
      service.juryOverrule(Decision.YELLOW);

      const state = service.getState();
      expect(state.context.juryOverrule?.decision).toBe(Decision.YELLOW);
    });
  });

  describe('clearJuryOverrule', () => {
    it('should clear jury overrule', () => {
      service.juryOverrule(Decision.RED);
      service.clearJuryOverrule();

      const state = service.getState();
      expect(state.state).toBe(LiftState.AWAITING_DECISIONS);
      expect(state.context.juryOverrule).toBeUndefined();
    });
  });

  describe('refereeConnected/Disconnected', () => {
    it('should track connected referees', () => {
      service.refereeConnected(RefereePosition.LEFT);
      service.refereeConnected(RefereePosition.CHIEF);

      const state = service.getState();
      expect(state.context.connectedReferees.size).toBe(2);
    });

    it('should remove disconnected referees', () => {
      service.refereeConnected(RefereePosition.LEFT);
      service.refereeDisconnected(RefereePosition.LEFT);

      const state = service.getState();
      expect(state.context.connectedReferees.size).toBe(0);
    });
  });
});
