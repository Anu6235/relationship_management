'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('LedgerTypes', 'start_date', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW') // Defaults to the current timestamp
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('LedgerTypes', 'start_date');
  }
};
