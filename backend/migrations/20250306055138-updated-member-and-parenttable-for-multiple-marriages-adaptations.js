'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create member_parents join table
    await queryInterface.createTable('member_parents', {
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'members',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'parent_table',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Remove parent_id column from members table
    await queryInterface.removeColumn('members', 'parent_id');

    // Add is_current column to parent_table
    await queryInterface.addColumn('parent_table', 'is_current', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this is the current active marriage for both members'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove is_current column from parent_table
    await queryInterface.removeColumn('parent_table', 'is_current');

    // Restore parent_id column in members table (if needed)
    await queryInterface.addColumn('members', 'parent_id', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Drop the member_parents join table
    await queryInterface.dropTable('member_parents');
  }
};
