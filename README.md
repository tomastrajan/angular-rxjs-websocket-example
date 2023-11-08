# ENS Example

RxJs APIs as much as possible, auto-cleanup of the shared **streams for event types** AND **websocket** itself

Run with `npm start`


## Implementation

Please, compare the `ens.service.ts` and `ens-without-debug.service.ts`, the whole impl is just:

1. Websocket stream definition (sharing & auto-cleanup) with `share`
2. Stream for `eventType` factory (sharing & auto-cleanup) with `share`, because it's a factory and NOT a single reused stream definition, we have to rely on the event type stream registry state as a way to reuse streams created by the factory if they are created with the same params

