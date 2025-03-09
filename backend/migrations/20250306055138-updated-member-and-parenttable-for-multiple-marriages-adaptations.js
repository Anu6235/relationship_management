'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, change parent_id column from INTEGER to STRING
    await queryInterface.changeColumn('members', 'parent_id', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Then, add is_current column to parent_table
    await queryInterface.addColumn('parent_table', 'is_current', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this is the current active marriage for both members'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove is_current column from parent_table
    await queryInterface.removeColumn('parent_table', 'is_current');

    // Change parent_id column back to INTEGER
    await queryInterface.changeColumn('members', 'parent_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};