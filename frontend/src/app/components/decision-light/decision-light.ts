import { Component, Input } from '@angular/core';

/**
 * Reusable decision light component.
 */
@Component({
  selector: 'app-decision-light',
  template: `
    <div class="light-container">
      <div [class]="'light-circle light-' + (decisionClass || 'inactive')"></div>
      <span class="light-label">{{ label }}</span>
    </div>
  `,
})
export class DecisionLightComponent {
  @Input() decisionClass = '';
  @Input() label = '';
}
