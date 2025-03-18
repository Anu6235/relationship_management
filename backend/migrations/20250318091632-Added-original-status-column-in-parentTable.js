'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('parent_table', 'original_status', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Stores the previous status when transitioning to pending divorce',
      after: 'status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('parent_table', 'original_status');
  }
};