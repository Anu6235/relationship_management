const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const appConfigRouter = require('./routes/appConfig');
const ledgerRoutes = require('./routes/ledgerRoutes');
const ledgerTypeRoutes = require('./routes/ledgerTypeRoutes');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/app-config', appConfigRouter);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/ledger-types', ledgerTypeRoutes);

// ✅ Ensure Angular build exists before serving
const distPath = path.join(__dirname, 'dist', 'frontend');
app.use(express.static(distPath));

// ✅ Serve Angular frontend correctly
app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
});

// ✅ Handle 404 API routes separately
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API route not found'
    });
});

// ✅ Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Something went wrong!' });
});

module.exports = app;
