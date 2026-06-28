import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-mic-button',
  template: `
    <button
      type="button"
      class="mic-button"
      [class.listening]="listening()"
      [disabled]="disabled()"
      [attr.aria-label]="
        listening() ? 'Listening. Press to stop.' : 'Start speaking'
      "
      [attr.aria-pressed]="listening()"
      (click)="pressed.emit()"
    >
      <span class="pulse" aria-hidden="true"></span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V5a3.5 3.5 0 1 0-7 0v7a3.5 3.5 0 0 0 3.5 3.5Zm-1.5-10.5a1.5 1.5 0 1 1 3 0v7a1.5 1.5 0 1 1-3 0V5Zm7.5 7a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.94V22H8v2h8v-2h-3v-2.06A8 8 0 0 0 20 12h-2Z"
        />
      </svg>
      <span>{{ listening() ? 'Listening…' : 'Speak' }}</span>
    </button>
  `,
  styleUrl: './mic-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MicButtonComponent {
  readonly listening = input(false);
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
