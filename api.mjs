import http from "node:http";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";

const PORT = 8080;

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get("/api/ping", (req, res) => {
  res.send("pong");
});

const server = http.createServer(app);

const ws = new WebSocketServer({ server, path: "/ws" });

const sockets = [];
const eventTypeSubs = {};
ws.on("connection", (socket) => {
  console.log("[server] new client connected!");
  sockets.push(socket);
  socket.on("close", () => {
    const index = sockets.findIndex((s) => s === socket);
    sockets.splice(index, 1);
    console.log("[server] client disconnected!");
    if (!sockets.length) {
      console.log("[server] remove all event type sub intervals");
      Object.values(eventTypeSubs).forEach((intervalId) =>
        clearInterval(intervalId),
      );
    }
  });
});

app.post("/api/event", (req, res) => {
  const { eventType } = req.body;
  console.log(`[server] create new subscription for `, eventType);
  eventTypeSubs[req.body.eventType] = setInterval(() => {
    console.log(`[server] push event for ${eventType}`);
    sockets.forEach((s) =>
      s.send(
        JSON.stringify({
          eventType: eventType,
          payload: `event for ${eventType}`,
        }),
      ),
    );
  }, 2500);
  res.send();
});

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

function json(value) {
  return JSON.stringify(value);
}
