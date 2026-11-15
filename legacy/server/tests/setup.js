import mongoose from 'mongoose';

export const testMongoUri = process.env.TEST_MONGODB_URI;
export const hasTestDb = Boolean(testMongoUri);

export async function connectTestDb() {
  if (!hasTestDb) {
    return;
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(testMongoUri);
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export const describeDb = hasTestDb ? describe : describe.skip;

if (!hasTestDb) {
  console.log('Skipping tests: TEST_MONGODB_URI is not set. Provide TEST_MONGODB_URI to run integration tests.');
}
