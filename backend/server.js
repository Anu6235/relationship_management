const app = require('./app');
const db = require('./models');
const { setupLedgerScheduler } = require('./utils/ledgerScheduler');

const PORT = process.env.PORT || 5000;

db.sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
    
    setupLedgerScheduler();
});