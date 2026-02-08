import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisplayComponent } from './display';
import { LiftService } from '../../services/lift.service';
import { LiftStateType, Decision, RefereePosition, LiftState } from '../../models/lift.model';
import { signal, WritableSignal } from '@angular/core';

describe('DisplayComponent', () => {
  let component: DisplayComponent;
  let fixture: ComponentFixture<DisplayComponent>;
  let mockLiftService: Partial<LiftService>;
  let stateSignal: WritableSignal<LiftState | null>;

  beforeEach(async () => {
    stateSignal = signal<LiftState | null>(null);

    mockLiftService = {
      state: stateSignal.asReadonly(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      revealDecisions: vi.fn(),
      resetAll: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DisplayComponent],
      providers: [{ provide: LiftService, useValue: mockLiftService }],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should connect to service on init', () => {
    component.ngOnInit();
    expect(mockLiftService.connect).toHaveBeenCalled();
  });

  it('should disconnect on destroy', () => {
    component.ngOnDestroy();
    expect(mockLiftService.disconnect).toHaveBeenCalled();
  });

  it('should expose state from service', () => {
    expect(component.state).toBe(mockLiftService.state);
  });

  it('should expose Decision enum for template', () => {
    expect(component.Decision).toBe(Decision);
  });

  it('should expose RefereePosition enum for template', () => {
    expect(component.RefereePosition).toBe(RefereePosition);
  });

  it('should get decision for a referee position', () => {
    stateSignal.set({
      state: LiftStateType.COLLECTING_DECISIONS,
      context: {
        decisions: [{ position: RefereePosition.LEFT, decision: Decision.WHITE }],
        connectedReferees: [],
      },
    });

    const decision = component.getDecision(RefereePosition.LEFT);

    expect(decision).toBe(Decision.WHITE);
  });

  it('should return undefined for position without decision', () => {
    stateSignal.set({
      state: LiftStateType.AWAITING_DECISIONS,
      context: {
        decisions: [],
        connectedReferees: [],
      },
    });

    const decision = component.getDecision(RefereePosition.LEFT);

    expect(decision).toBeUndefined();
  });

  it('should show jury overrule when present', () => {
    stateSignal.set({
      state: LiftStateType.JURY_OVERRULE,
      context: {
        decisions: [],
        connectedReferees: [],
        juryOverrule: { decision: Decision.RED, timestamp: Date.now() },
      },
    });

    expect(component.state()?.context.juryOverrule?.decision).toBe(Decision.RED);
  });

  it('should clear auto-reset timer on destroy', () => {
    component.ngOnInit();
    component.ngOnDestroy();
    expect(mockLiftService.disconnect).toHaveBeenCalled();
  });
});
