import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env';
import connectDB from './config/db';
import routes from './routes';
import errorHandler from './middlewares/error.middleware';
import { UPLOAD_DIR } from './config/upload';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

// Serve static files from uploads directory
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Agri-Trace API v2.0',
    blockchain:
      env.CONTRACT_ADDRESS && env.BLOCKCHAIN_PRIVATE_KEY
        ? 'configured'
        : 'not-configured',
  });
});

app.use('/api/v1', routes);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB(env.DB_URI);
    console.log('MongoDB connected');

    app.listen(env.PORT, () => {
      console.log(`Server running at http://localhost:${env.PORT}`);
      console.log(`API base: http://localhost:${env.PORT}/api/v1`);
      console.log(`Blockchain RPC: ${env.BLOCKCHAIN_RPC_URL}`);
      console.log(`Contract: ${env.CONTRACT_ADDRESS || 'NOT SET'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
