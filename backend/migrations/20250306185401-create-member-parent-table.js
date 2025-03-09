'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('member_parent_table', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      child_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'members',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'members',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      parent_table_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'parent_table',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'rejected'),
        defaultValue: 'confirmed'
      },
      relationship_type: {
        type: Sequelize.ENUM('biological', 'adopted', 'step'),
        defaultValue: 'biological'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add unique constraint to prevent duplicate relationships
    await queryInterface.addIndex('member_parent_table', ['child_id', 'parent_id'], {
      unique: true,
      name: 'unique_child_parent_relationship'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('member_parent_table');
  }
};