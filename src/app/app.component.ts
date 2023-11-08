import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

import { EnsService } from './ens.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="container p-8">
      <h1 class="mb-2 text-4xl font-bold">ENS example</h1>

      <p class="mb-4 font-bold text-lg">
        RxJs stream focused, concise implementation
      </p>

      <p class="my-4">
        Start and stop multiple view subscription to streams for specific event
        type, open dev tools console to see the behavior...
      </p>

      <div class="flex gap-4 my-8">
        @for (eventType of eventTypes; track $index) {
        <button
          class="px-4 py-2 rounded bg-green-300 hover:bg-green-500"
          (click)="start(eventType)"
        >
          {{ eventType }}
        </button>
        <button
          class="px-4 py-2 rounded bg-red-300 hover:bg-red-500"
          (click)="stop(eventType)"
        >
          {{ eventType }}
        </button>
        }
      </div>
      <button class="p-4 rounded bg-blue-300" (click)="ping()">ping</button>
    </div>
  `,
})
export class AppComponent {
  private ensService = inject(EnsService);

  eventTypes = ['a', 'b', 'c'];

  subscriptions: { [eventType: string]: Subscription } = {};

  ping() {
    this.ensService.ping();
  }

  start(eventType: string) {
    const sub = this.ensService.getEvents(eventType).subscribe((event) => {
      console.log(`[view] [${eventType}]`, event);
    });
    if (this.subscriptions[eventType]) {
      this.subscriptions[eventType].add(sub);
    } else {
      this.subscriptions[eventType] = sub;
    }
  }

  stop(eventType: string) {
    if (this.subscriptions[eventType]) {
      this.subscriptions[eventType].unsubscribe();
      delete this.subscriptions[eventType];
    }
  }
}
