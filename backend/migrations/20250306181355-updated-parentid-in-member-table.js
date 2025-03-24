'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if parent_id column already exists in members table
    const tableInfo = await queryInterface.describeTable('Members');
    
    if (tableInfo.parent_id) {
      // If exists, change it from INTEGER to STRING
      await queryInterface.changeColumn('Members', 'parent_id', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Comma-separated ParentTable IDs of confirmed marriages'
      });
    } else {
      // If it doesn't exist, add it
      await queryInterface.addColumn('Members', 'parent_id', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Comma-separated ParentTable IDs of confirmed marriages'
      });
    }

    // Check if is_current column already exists in parent_table
    const parentTableInfo = await queryInterface.describeTable('parent_table');
    
    if (!parentTableInfo.is_current) {
      // Add is_current column to parent_table if it doesn't exist
      await queryInterface.addColumn('parent_table', 'is_current', {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this is the current active marriage for both Members'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove is_current column from parent_table
    await queryInterface.removeColumn('parent_table', 'is_current');

    // Change parent_id column back to INTEGER
    await queryInterface.changeColumn('Members', 'parent_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};