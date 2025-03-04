'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('LedgerTypes', 'fine_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    });
    
    await queryInterface.addColumn('LedgerTypes', 'fine_interval_value', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10
    });
    
    await queryInterface.addColumn('LedgerTypes', 'fine_interval_unit', {
      type: Sequelize.ENUM('minute', 'hour', 'day', 'month'),
      allowNull: false,
      defaultValue: 'day'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('LedgerTypes', 'fine_amount');
    await queryInterface.removeColumn('LedgerTypes', 'fine_interval_value');
    await queryInterface.removeColumn('LedgerTypes', 'fine_interval_unit');
  }
};