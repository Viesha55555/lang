import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

import { StudySessionService } from './core/domain/services/study-session.service';
import { ReminderService } from './core/domain/services/reminder.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<router-outlet />
    <nav class="bottom-nav" aria-label="Main navigation">
      @for (tab of tabs; track tab.path) {
        <a [routerLink]="tab.path" (click)="leavePractice()" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" ariaCurrentWhenActive="page">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="tab.icon" /></svg><span>{{ tab.label }}</span>
        </a>
      }
    </nav>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly session = inject(StudySessionService);
  leavePractice(): void {
    this.session.exitPractice();
    this.session.selectedLevel.set(null);
    this.session.selectedTopicId.set(null);
  }
  readonly tabs = [
    {path: '/', label: 'Today', icon: 'M3 10 12 3 21 10V21H15V14H9V21H3Z'},
    {path: '/learn', label: 'Learn', icon: 'M12 5C8 2 4 3 2 4V20C6 18 9 19 12 21C15 19 18 18 22 20V4C18 2 15 3 12 5ZM12 5V21'},
    {path: '/dictionary', label: 'Focus', icon: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z'},
    {path: '/review', label: 'Review', icon: 'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2'},
  ];
  private readonly reminders = inject(ReminderService);

  ngOnInit(): void {
    void this.reminders.init();
  }
}
