import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

const connectDB = async (uri: string): Promise<typeof mongoose> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') {
    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create();
    }

    const memoryUri = memoryServer.getUri();
    console.log(`Using in-memory MongoDB at ${memoryUri}`);
    return mongoose.connect(memoryUri);
  }

  if (!uri) {
    throw new Error('DB_URI is required when USE_IN_MEMORY_DB is not enabled.');
  }

  return mongoose.connect(uri);
};

export default connectDB;
