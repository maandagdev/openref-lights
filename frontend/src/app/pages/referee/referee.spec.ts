import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefereeComponent } from './referee';
import { LiftService } from '../../services/lift.service';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { LiftStateType, Decision, RefereePosition, LiftState } from '../../models/lift.model';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';

describe('RefereeComponent', () => {
  let component: RefereeComponent;
  let fixture: ComponentFixture<RefereeComponent>;
  let mockLiftService: Partial<LiftService>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let stateSignal: WritableSignal<LiftState | null>;

  beforeEach(async () => {
    stateSignal = signal<LiftState | null>(null);

    mockLiftService = {
      state: stateSignal.asReadonly(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      makeDecision: vi.fn(),
      resetRefereeDecision: vi.fn(),
    };

    mockActivatedRoute = {
      params: of({ position: 'left' }),
      paramMap: of(convertToParamMap({ position: 'left' })),
      snapshot: {
        params: { position: 'left' },
      } as unknown as ActivatedRouteSnapshot,
    };

    await TestBed.configureTestingModule({
      imports: [RefereeComponent],
      providers: [
        { provide: LiftService, useValue: mockLiftService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RefereeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should connect to service with position on init', () => {
    component.ngOnInit();
    expect(mockLiftService.connect).toHaveBeenCalledWith(component.position);
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

  it('should initialize with default position', () => {
    expect(component.position).toBe(RefereePosition.CHIEF);
  });

  it('should initialize with isSubmitting as false', () => {
    expect(component.isSubmitting()).toBe(false);
  });

  it('should initialize countdown at 1', () => {
    expect(component.countdown()).toBe(1);
  });

  it('should compute current decision correctly', () => {
    component.position = RefereePosition.LEFT;
    stateSignal.set({
      state: LiftStateType.COLLECTING_DECISIONS,
      context: {
        decisions: [{ position: RefereePosition.LEFT, decision: Decision.WHITE }],
        connectedReferees: [],
      },
    });

    expect(component.currentDecision()).toBe(Decision.WHITE);
  });

  it('should return null when no decision made', () => {
    component.position = RefereePosition.CHIEF;
    stateSignal.set({
      state: LiftStateType.AWAITING_DECISIONS,
      context: {
        decisions: [],
        connectedReferees: [],
      },
    });

    expect(component.currentDecision()).toBeNull();
  });

  it('should allow decisions when not submitting and in correct state', () => {
    stateSignal.set({
      state: LiftStateType.AWAITING_DECISIONS,
      context: {
        decisions: [],
        connectedReferees: [],
      },
    });

    expect(component.canMakeDecision()).toBe(true);
  });

  it('should not allow decisions when submitting', () => {
    component.isSubmitting.set(true);
    stateSignal.set({
      state: LiftStateType.AWAITING_DECISIONS,
      context: {
        decisions: [],
        connectedReferees: [],
      },
    });

    expect(component.canMakeDecision()).toBe(false);
  });

  it('should disable decision button when that decision is already selected', () => {
    component.position = RefereePosition.RIGHT;
    stateSignal.set({
      state: LiftStateType.COLLECTING_DECISIONS,
      context: {
        decisions: [{ position: RefereePosition.RIGHT, decision: Decision.RED }],
        connectedReferees: [],
      },
    });

    expect(component.isDecisionDisabled(Decision.RED)).toBe(true);
    expect(component.isDecisionDisabled(Decision.WHITE)).toBe(false);
  });

  it('should call makeDecision service method when submitting', () => {
    component.position = RefereePosition.CHIEF;
    component.makeDecision(Decision.WHITE);
    expect(component.isSubmitting()).toBe(true);
  });

  it('should handle reset referee decision', () => {
    component.resetRefereeDecision();
    expect(mockLiftService.resetRefereeDecision).toHaveBeenCalledWith(component.position);
  });
});
