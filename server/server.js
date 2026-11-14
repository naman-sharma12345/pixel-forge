import { env } from './src/config/env.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import app from './src/app.js';
import { ensureUploadDirs } from './src/utils/storage.js';

let server;

async function bootstrap() {
  await ensureUploadDirs();
  await connectDB();

  server = app.listen(env.PORT, () => {
    console.log(`Pixel Forge server running on ${env.SERVER_URL}`);
    console.log(`API Docs available at ${env.SERVER_URL}/api/docs`);
  });
}

const gracefulShutdown = async () => {
  if (server) {
    server.close(async () => {
      try {
        await disconnectDB();
      } catch (err) {
        console.error('Error during DB disconnect:', err);
      } finally {
        process.exit(0);
      }
    });
  } else {
    try {
      await disconnectDB();
    } catch (err) {
      console.error('Error during DB disconnect:', err);
    } finally {
      process.exit(0);
    }
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

bootstrap();
