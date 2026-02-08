import { Component, OnInit, OnDestroy, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiftService } from '../../services/lift.service';
import { RefereePosition, Decision, LiftStateType } from '../../models/lift.model';

@Component({
  selector: 'app-display',
  imports: [CommonModule],
  templateUrl: './display.html',
  styleUrl: './display.css',
})
export class DisplayComponent implements OnInit, OnDestroy {
  protected liftService = inject(LiftService);
  state = this.liftService.state;

  Decision = Decision;
  RefereePosition = RefereePosition;

  readonly refereePositions = [RefereePosition.LEFT, RefereePosition.CHIEF, RefereePosition.RIGHT];

  private showTimer?: ReturnType<typeof setTimeout>;
  private autoResetTimer?: ReturnType<typeof setTimeout>;
  private readonly AUTO_SHOW_DELAY = 500;
  private readonly AUTO_RESET_DELAY = 5000;

  /** Whether a jury overrule is currently active. */
  hasJuryOverrule = computed(() => !!this.liftService.state()?.context.juryOverrule);

  /** Whether the display is not connected to the backend. */
  isDisconnected = computed(() => !this.liftService.state());

  constructor() {
    // Use effect to handle state transitions
    effect((onCleanup) => {
      const currentState = this.liftService.state()?.state;

      // Auto-reveal when all decisions are in
      if (currentState === LiftStateType.READY_TO_REVEAL) {
        this.clearShowTimer();
        this.showTimer = setTimeout(() => {
          this.liftService.revealDecisions();
        }, this.AUTO_SHOW_DELAY);
      }

      if (currentState !== LiftStateType.READY_TO_REVEAL) {
        this.clearShowTimer();
      }

      // Auto-reset after revealing for X seconds
      if (currentState === LiftStateType.REVEALING_DECISIONS) {
        this.clearAutoResetTimer();
        this.autoResetTimer = setTimeout(() => {
          this.liftService.resetAll();
        }, this.AUTO_RESET_DELAY);
      }

      // Clear timer if we leave revealing state
      if (currentState !== LiftStateType.REVEALING_DECISIONS) {
        this.clearAutoResetTimer();
      }

      onCleanup(() => {
        this.clearTimers();
      });
    });
  }

  ngOnInit() {
    this.liftService.connect();
  }

  ngOnDestroy() {
    this.clearTimers();
    this.liftService.disconnect();
  }

  private clearTimers() {
    this.clearShowTimer();
    this.clearAutoResetTimer();
  }

  private clearShowTimer() {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }
  }

  private clearAutoResetTimer() {
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = undefined;
    }
  }

  getDecision(position: RefereePosition): Decision | undefined {
    return this.liftService.state()?.context.decisions.find((d) => d.position === position)?.decision;
  }

  getDisplayDecision(position: RefereePosition): Decision | undefined {
    const state = this.liftService.state();

    if (state?.context.juryOverrule) {
      return state.context.juryOverrule.decision;
    }

    if (state?.state === LiftStateType.REVEALING_DECISIONS || state?.state === LiftStateType.JURY_OVERRULE) {
      return this.getDecision(position);
    }

    return undefined;
  }

  getCircleClass(decision: Decision | undefined): string {
    if (decision === Decision.WHITE) return 'display-light-white';
    if (decision) return 'display-light-red';

    return 'display-light-inactive';
  }

  getIndicatorClass(decision: Decision): string {
    return `indicator-${decision.toLowerCase()}`;
  }
}
