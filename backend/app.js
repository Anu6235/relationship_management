const express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const appConfigRouter = require('./routes/appConfig');
const ledgerRoutes = require('./routes/ledgerRoutes');
const ledgerTypeRoutes = require('./routes/ledgerTypeRoutes');

require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

app.use('/users', usersRouter);
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/app-config', appConfigRouter);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/ledger-types', ledgerTypeRoutes);

// Serve Angular frontend
const distPath = path.join(__dirname, 'dist', 'frontend', 'browser');
app.use(express.static(distPath));

// Handle Angular routing (must be AFTER API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Something went wrong!' });
  });


module.exports = app;
