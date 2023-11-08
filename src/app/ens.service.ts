import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  defer,
  filter,
  finalize,
  Observable,
  of,
  retry,
  share,
  switchMap,
  tap,
} from 'rxjs';
import { webSocket } from 'rxjs/webSocket';

if (typeof global !== 'undefined') {
  global.WebSocket = require('ws'); // <-- <-- FIX BUILD / SSR ERRORS
}

const API_HOST = 'localhost:8080';
const API_URL = `http://${API_HOST}/api`;

@Injectable({
  providedIn: 'root',
})
export class EnsService {
  private http = inject(HttpClient);

  // cache created streams
  eventTypeStreamRegistry: { [eventType: string]: Observable<any> } = {};

  // self-closing WS (ref count)
  // single WS will be reused for all the event types
  // just a stream definition, nothing runs (defer)
  ws = defer(() =>
    webSocket<{ eventType: string; payload: any }>(`ws://${API_HOST}/ws`),
  ).pipe(
    tap({
      // next: (e) => console.log('[ws] next event', e),
      subscribe: () => console.log('[ws] subscribe'),
      unsubscribe: () => console.log('[ws] unsubscribe'),
      complete: () => console.log('[ws] complete'),
      finalize: () => console.log('[ws] finalize'),
    }),
    share({
      resetOnRefCountZero: true, // can be made fancier eg () => timer(5000)
    }),
  );

  // self-cleaning event type streams
  // 1. check if (and return) existing stream for event type from registry
  // 2. make an API request to create eventType topic in backend and map it to socket stream
  // 2a. robustness, eg retry, ...
  // 3. filter events from WS for eventType
  // 4. share and reset on ref count
  // 5. store in registry
  // 6. on ref count trigger cleanup from registry
  getEvents(eventType: string) {
    if (this.eventTypeStreamRegistry[eventType]) {
      console.log(
        `[stream for ${eventType}] - reuse existing stream from registry`,
      );
      return this.eventTypeStreamRegistry[eventType];
    } else {
      // make request to create sub in backend
      const eventTypeStream = this.setupEventInBackend(eventType).pipe(
        retry({
          count: 3,
          delay: 1000,
          resetOnSuccess: true,
        }),
        tap(() => `[stream for ${eventType}] - setup event in backend success`),
        // on success, map stream into the WS (which will now get events from backend)
        switchMap(() => this.ws),
        // only events for the eventType
        filter((event) => event.eventType === eventType),
        tap({
          // cleanup
          finalize: () => {
            console.log(
              `[stream for ${eventType}] - remove stored stream from registry`,
            );
            delete this.eventTypeStreamRegistry[eventType];
            // TODO do we need to make a API request to cleanup on backend too??
            console.log(`[stream for ${eventType}] - debug, list stored streams`, this.eventTypeStreamRegistry);
          },
        }),
        // cleanup on refcount
        share({
          resetOnRefCountZero: true,
        }),
      );
      console.log(
        `[stream for ${eventType}] - store stream reference in registry`,
      );
      this.eventTypeStreamRegistry[eventType] = eventTypeStream;
      return eventTypeStream;
    }
  }

  setupEventInBackend(eventType: string) {
    return this.http.post<void>(API_URL + '/event', { eventType });
  }

  ping() {
    this.http
      .get<string>(API_URL + '/ping', {
        responseType: 'text' as any,
      })
      .subscribe((res) => console.log(res));
  }
}
