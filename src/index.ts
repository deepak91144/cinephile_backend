import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import apiRouter from './routes/api';
import { setupSocketIO } from './socket/chatHandler';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', apiRouter);

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/cinema-social')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Setup Socket.IO
const io = setupSocketIO(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server ready`);
});
