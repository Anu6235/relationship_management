'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('member_parent_table', 'requested_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'members',
        key: 'id'
      },
      comment: 'ID of the member who requested this parent-child relationship'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('member_parent_table', 'requested_by');
  }
};