import { Component, OnInit, OnDestroy, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiftService } from '../../services/lift.service';
import { RefereePosition, Decision } from '../../models/lift.model';
import { interval } from 'rxjs';
import { takeWhile, tap, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** Countdown duration in seconds before a jury overrule is submitted. */
const COUNTDOWN_DURATION_SECONDS = 1;

/** Countdown tick interval in milliseconds. */
const COUNTDOWN_TICK_MS = 100;

@Component({
  selector: 'app-jury',
  imports: [CommonModule],
  templateUrl: './jury.html',
  styleUrl: './jury.css',
})
export class JuryComponent implements OnInit, OnDestroy {
  protected liftService = inject(LiftService);
  private destroyRef = inject(DestroyRef);

  state = this.liftService.state;

  Decision = Decision;
  RefereePosition = RefereePosition;

  isSubmitting = signal(false);
  countdown = signal(COUNTDOWN_DURATION_SECONDS);
  pendingDecision = signal<Decision | null>(null);
  private countdownToken = 0;

  // Computed signal for jury overrule
  hasJuryOverrule = computed(() => !!this.liftService.state()?.context.juryOverrule);

  currentDecision = computed(() => {
    return this.liftService.state()?.context.juryOverrule?.decision || null;
  });

  // Check if a specific decision button should be disabled
  isDecisionDisabled = (decision: Decision) => {
    return this.pendingDecision() === decision || this.currentDecision() === decision;
  };

  ngOnInit() {
    this.liftService.connect();
  }

  ngOnDestroy() {
    this.liftService.disconnect();
  }

  getDecision(position: RefereePosition): Decision | undefined {
    return this.liftService.state()?.context.decisions.find((d) => d.position === position)?.decision;
  }

  juryOverrule(decision: Decision) {
    this.countdownToken += 1;
    const token = this.countdownToken;

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
            this.liftService.juryOverrule(decision);
          }
          this.isSubmitting.set(false);
          this.pendingDecision.set(null);
        }),
      )
      .subscribe();
  }

  cancelOverrule() {
    this.countdownToken += 1;
    this.countdown.set(0);
    this.isSubmitting.set(false);
  }

  clearJuryOverrule() {
    this.liftService.clearJuryOverrule();
  }

  getDecisionClass(position: RefereePosition): string {
    const decision = this.getDecision(position);

    return decision ? decision.toLowerCase() : '';
  }

  getJuryDecisionClass(): string {
    return this.liftService.state()?.context.juryOverrule?.decision?.toLowerCase() || '';
  }

  getJuryDecisionText(): string {
    const decision = this.liftService.state()?.context.juryOverrule?.decision;

    if (!decision) return '';

    return decision === Decision.WHITE ? 'GOOD LIFT' : 'NO LIFT';
  }
}
