const { Ledger, LedgerType } = require('../models');
const { Op } = require('sequelize');
const cron = require('node-cron');

/**
 * Scheduled task to recalculate fines for all overdue ledgers
 * Runs daily at midnight
 */
const scheduleFineCalculation = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled fine calculation task...');
    try {
      const now = new Date();
      
      // Find all pending or overdue ledgers that are past their due date
      const overdueLegers = await Ledger.findAll({
        where: {
          due_date: {
            [Op.lt]: now // Due date is less than current date
          },
          invoice_status: {
            [Op.in]: [1, 3] // Pending or Already marked as Overdue
          }
        },
        include: [
          {
            model: LedgerType,
            as: 'ledgerType',
            where: {
              apply_fine: true // Only process ledgers with types that apply fines
            }
          }
        ]
      });
      
      if (overdueLegers.length === 0) {
        console.log('No overdue ledgers found that applies fines.');
        return;
      }
      
      console.log(`Found ${overdueLegers.length} overdue ledgers. Recalculating fines...`);
      
      // Recalculate fines for each ledger
      await Promise.all(
        overdueLegers.map(async ledger => {
          try {
            // Make sure to explicitly mark status as overdue (3) if not already
            if (ledger.invoice_status === 1) {
              ledger.invoice_status = 3;
            }
            
            await ledger.recalculateFine(Ledger.sequelize.models);
            console.log(`Updated ledger ${ledger.id} for member ${ledger.member_id}. Fine: ${ledger.fine}`);
          } catch (error) {
            console.error(`Error updating ledger ${ledger.id}:`, error);
          }
        })
      );
      
      console.log('Scheduled fine calculation completed successfully.');
    } catch (error) {
      console.error('Error in scheduled fine calculation task:', error);
    }
  });
  
  console.log('Fine calculation scheduled task registered.');
};

module.exports = { scheduleFineCalculation };