'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename the fee column to fine
    await queryInterface.renameColumn('Ledgers', 'fee', 'fine');
    
    // Add fine_last_calculated_at column
    await queryInterface.addColumn('Ledgers', 'fine_last_calculated_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    // Add paid_at column
    await queryInterface.addColumn('Ledgers', 'paid_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    // Update the invoice_status column description
    await queryInterface.changeColumn('Ledgers', 'invoice_status', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '1: Pending, 2: Paid, 3: Overdue, 4: Cancelled'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the changes
    await queryInterface.renameColumn('Ledgers', 'fine', 'fee');
    await queryInterface.removeColumn('Ledgers', 'fine_last_calculated_at');
    await queryInterface.removeColumn('Ledgers', 'paid_at');
    await queryInterface.changeColumn('Ledgers', 'invoice_status', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
  }
};