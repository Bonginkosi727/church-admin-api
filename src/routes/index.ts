import { Router } from 'express'
import { authRoutes } from './authRoutes'
import memberRoutes from './memberRoutes'
import ministryRoutes from './ministryRoutes'
import eventRoutes from './eventRoutes'
import contributionRoutes from './contributionRoutes'
import announcementRoutes from './announcementRoutes'

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/ministries', ministryRoutes);
router.use('/events', eventRoutes);
router.use('/contributions', contributionRoutes);
router.use('/announcements', announcementRoutes);

export { router as routes };

