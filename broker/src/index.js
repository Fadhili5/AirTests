import net from "node:net";
import aedes from "aedes";

const broker = aedes();
const port = Number.parseInt(process.env.MQTT_PORT || "1883", 10);

const server = net.createServer(broker.handle);
server.listen(port, () => {
  console.log(`Local MQTT broker listening on port ${port}`);
});

broker.on("client", (client) => {
  console.log(`MQTT client connected: ${client?.id || "unknown"}`);
});

broker.on("publish", (packet, client) => {
  if (!client) return;
  console.log(`Published ${packet.topic} by ${client.id}`);
});
