import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import warehouseRoutes from './routes/warehouses.js';
import { prisma } from './db.js';
import orderRoutes from './routes/orderRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import rcaRoutes from './routes/rcaRoutes.js';
import riskRoutes from './routes/riskRoutes.js';

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: true, // Dynamically reflects the requesting origin (e.g., http://localhost:3000)
    credentials: true,
  })
);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/rca', rcaRoutes);
app.use('/api/risk', riskRoutes);

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
