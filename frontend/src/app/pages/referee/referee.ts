import { Component, OnInit, OnDestroy, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LiftService } from '../../services/lift.service';
import { RefereePosition, Decision, LiftStateType } from '../../models/lift.model';
import { DecisionLightComponent } from '../../components/decision-light/decision-light';
import { interval } from 'rxjs';
import { takeWhile, tap, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const VALID_POSITIONS = new Set(Object.values(RefereePosition));

const COUNTDOWN_DURATION_SECONDS = 1;

/** Countdown tick interval in milliseconds. */
const COUNTDOWN_TICK_MS = 100;

@Component({
  selector: 'app-referee',
  imports: [CommonModule, DecisionLightComponent],
  templateUrl: './referee.html',
  styleUrl: './referee.css',
})
export class RefereeComponent implements OnInit, OnDestroy {
  position: RefereePosition = RefereePosition.CHIEF;

  protected liftService = inject(LiftService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  state = this.liftService.state;

  isSubmitting = signal(false);
  countdown = signal(COUNTDOWN_DURATION_SECONDS);
  pendingDecision = signal<Decision | null>(null);
  private countdownToken = 0;

  currentDecision = computed(() => {
    const state = this.liftService.state();

    if (!state || !this.position) return null;

    return state.context.decisions.find((d) => d.position === this.position)?.decision ?? null;
  });

  canMakeDecision = computed(() => {
    if (this.isSubmitting()) return false;

    const state = this.liftService.state()?.state;

    if (!state) return true;

    return state === LiftStateType.AWAITING_DECISIONS || state === LiftStateType.COLLECTING_DECISIONS;
  });

  hasJuryOverrule = computed(() => {
    const state = this.liftService.state();

    return state?.state === LiftStateType.JURY_OVERRULE || !!state?.context.juryOverrule;
  });

  /** Whether the reset button should be visible. */
  canResetDecision = computed(() => {
    const decision = this.currentDecision();
    const currentState = this.liftService.state()?.state;

    return (
      !!decision && currentState !== LiftStateType.REVEALING_DECISIONS && currentState !== LiftStateType.READY_TO_REVEAL
    );
  });

  /** Whether the decision feedback section should be shown (non-submitting). */
  showDecisionFeedback = computed(() => {
    const decision = this.currentDecision();
    const currentState = this.liftService.state()?.state;

    return !!decision && currentState !== LiftStateType.REVEALING_DECISIONS;
  });

  /** Whether we're in the REVEALING_DECISIONS state (lights revealed). */
  isRevealingDecisions = computed(() => {
    return this.liftService.state()?.state === LiftStateType.REVEALING_DECISIONS;
  });

  // Check if a specific decision button should be disabled
  isDecisionDisabled = (decision: Decision) => {
    return this.pendingDecision() === decision || this.currentDecision() === decision;
  };

  Decision = Decision;
  LiftStateType = LiftStateType;

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const position = params.get('position');

      if (!position || !VALID_POSITIONS.has(position as RefereePosition)) {
        this.router.navigate(['/']);

        return;
      }
      this.position = position as RefereePosition;
      this.liftService.connect(this.position);
    });
  }

  ngOnDestroy() {
    this.liftService.disconnect();
  }

  makeDecision(decision: Decision) {
    this.countdownToken += 1;
    const token = this.countdownToken;

    // If already decided, reset first then proceed with new decision
    if (this.currentDecision() !== null) {
      this.resetRefereeDecision();
    }

    this.isSubmitting.set(true);
    this.pendingDecision.set(decision);

    this.countdown.set(COUNTDOWN_DURATION_SECONDS);

    interval(COUNTDOWN_TICK_MS)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((tick) => {
          const remaining = Math.max(0, COUNTDOWN_DURATION_SECONDS - tick * 0.1);

          this.countdown.set(Number(remaining.toFixed(1)));
        }),
        takeWhile(() => this.countdown() > 0 && token === this.countdownToken, true),
        finalize(() => {
          if (token !== this.countdownToken) {
            return;
          }
          if (this.countdown() <= 0) {
            this.liftService.makeDecision(this.position, decision);
          }
          this.isSubmitting.set(false);
          this.pendingDecision.set(null);
        }),
      )
      .subscribe();
  }

  cancelDecision() {
    this.countdownToken += 1;
    this.countdown.set(0);
    this.isSubmitting.set(false);
    this.pendingDecision.set(null);
  }

  resetAll() {
    this.liftService.resetAll();
  }

  resetRefereeDecision() {
    this.liftService.resetRefereeDecision(this.position);
  }

  getPositionLabel(): string {
    return this.position.charAt(0).toUpperCase() + this.position.slice(1);
  }

  getDecisionText(decision: Decision): string {
    return decision === Decision.WHITE ? 'GOOD LIFT' : 'NO LIFT';
  }

  // Helper methods for template
  getDecision(position: string): Decision | undefined {
    const state = this.liftService.state();

    // Only show decisions when state is "revealingDecisions" or "juryOverrule"
    if (state?.state !== LiftStateType.REVEALING_DECISIONS && state?.state !== LiftStateType.JURY_OVERRULE) {
      return undefined;
    }
    const pos = position.toLowerCase() as RefereePosition;

    return state.context.decisions.find((d) => d.position === pos)?.decision;
  }

  getDecisionClass(position: string): string {
    const decision = this.getDecision(position);

    return decision ? decision.toLowerCase() : '';
  }

  getJuryDecision(): Decision | undefined {
    const state = this.liftService.state();

    // Only show jury overrule when state is "revealingDecisions" or "juryOverrule"
    if (state?.state !== LiftStateType.REVEALING_DECISIONS && state?.state !== LiftStateType.JURY_OVERRULE) {
      return undefined;
    }

    return state.context.juryOverrule?.decision;
  }

  getJuryDecisionClass(): string {
    const decision = this.getJuryDecision();

    return decision ? decision.toLowerCase() : '';
  }
}
