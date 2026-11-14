import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';

import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';
import routes from './routes/index.js';
import { getUploadDir } from './utils/storage.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api', globalLimiter);

const publicUploadsPath = path.join(getUploadDir(), 'public');
app.use('/uploads', express.static(publicUploadsPath, {
  maxAge: '7d',
  fallthrough: false
}));

const openapiPath = fileURLToPath(new URL('./docs/openapi.yaml', import.meta.url));
const openapiFile = fs.readFileSync(openapiPath, 'utf8');
const swaggerDocument = yaml.parse(openapiFile);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.json({
    name: 'Pixel Forge API',
    version: '1.0.0',
    docs: '/api/docs'
  });
});

app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
