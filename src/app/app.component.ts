import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ReminderService } from './core/domain/services/reminder.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly reminders = inject(ReminderService);

  ngOnInit(): void {
    void this.reminders.init();
  }
}
