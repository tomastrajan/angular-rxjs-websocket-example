import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  defer,
  filter, finalize,
  Observable,
  retry,
  share,
  switchMap,
  tap,
} from 'rxjs';
import { webSocket } from 'rxjs/webSocket';

if (typeof global !== 'undefined') {
  global.WebSocket = require('ws'); // <-- FIX BUILD / SSR ERRORS
}

const API_HOST = 'localhost:8080';
const API_URL = `http://${API_HOST}/api`;

@Injectable({
  providedIn: 'root',
})
export class EnsService {
  private http = inject(HttpClient);

  eventTypeStreamRegistry: { [eventType: string]: Observable<any> } = {};

  ws = defer(() =>
    webSocket<{ eventType: string; payload: any }>(`ws://${API_HOST}/ws`),
  ).pipe(share({ resetOnRefCountZero: true }));

  getEvents(eventType: string) {
    if (this.eventTypeStreamRegistry[eventType]) {
      return this.eventTypeStreamRegistry[eventType];
    } else {
      const eventTypeStream = this.setupEventInBackend(eventType).pipe(
        switchMap(() => this.ws),
        filter((event) => event.eventType === eventType),
        finalize(() => { delete this.eventTypeStreamRegistry[eventType]; }),
        share({ resetOnRefCountZero: true }),
      );
      this.eventTypeStreamRegistry[eventType] = eventTypeStream;
      return eventTypeStream;
    }
  }

  setupEventInBackend(eventType: string) {
    // TODO resolve current json path and do that creaueOrUpdate in backend...
    return this.http.post<void>(API_URL + '/event', { eventType }).pipe(
      retry({ count: 3, delay: 1000, resetOnSuccess: true }),
    )
  }

  jsonPathResolver() {
    // ...
  }
}
