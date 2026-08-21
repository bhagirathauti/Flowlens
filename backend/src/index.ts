import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import warehouseRoutes from './routes/warehouses.js';
import { prisma } from './db.js';

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/warehouses', warehouseRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Flowlens API is running' });
});

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database');
    console.log(`Server is running on port ${PORT}`);
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  }
});
