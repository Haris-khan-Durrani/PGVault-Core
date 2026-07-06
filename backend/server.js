const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { startScheduler } = require('./services/schedulerService');

const prisma = require('./db');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function(origin, callback) { callback(null, true); },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true } // secure: true in production with HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Anti-Session Hijacking Middleware
app.use((req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (!req.session.clientInfo) {
      req.session.clientInfo = {
        ip: clientIp,
        userAgent: userAgent
      };
    } else {
      if (req.session.clientInfo.ip !== clientIp || req.session.clientInfo.userAgent !== userAgent) {
        console.warn(`Session hijacking prevented! IP/UA mismatch for user ${req.user?.username}`);
        return req.logout((err) => {
          req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.status(401).json({ error: 'Session invalidated due to security policy. Please login again.' });
          });
        });
      }
    }
  }
  next();
});

// Passport config
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { username: username },
          { email: username }
        ]
      } 
    });
    if (!user) return done(null, false, { message: 'Incorrect username or email.' });
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Routes
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const backupRoutes = require('./routes/backup');
const profileRoutes = require('./routes/profile');
const apiKeysRoutes = require('./routes/apiKeys');
const externalApiRoutes = require('./routes/externalApi');
const systemRoutes = require('./routes/system');
const { swaggerUi, specs } = require('./swagger');

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/apikeys', apiKeysRoutes);
app.use('/api/system', systemRoutes);

// External API and Swagger Docs
app.use('/api/v1', externalApiRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Clean up any orphaned pending backups (e.g., if server crashed during backup)
  try {
    const updatedCount = await prisma.backup.updateMany({
      where: { status: 'pending' },
      data: { status: 'failed' }
    });
    if (updatedCount.count > 0) {
      console.log(`Marked ${updatedCount.count} orphaned pending backups as failed.`);
    }
  } catch (error) {
    console.error('Failed to clean up orphaned backups:', error);
  }

  await startScheduler();
});
