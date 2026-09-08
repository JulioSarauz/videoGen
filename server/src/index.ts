import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`genVideo escuchando en el puerto ${env.port} (${env.nodeEnv})`);
});
