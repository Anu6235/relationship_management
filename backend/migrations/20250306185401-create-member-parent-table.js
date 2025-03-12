'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, check if the table already exists and drop it if it does
      await queryInterface.dropTable('member_parent_table').catch(() => {
        // Ignore error if table doesn't exist
      });

      // Create the table
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
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      // Add the index after confirming the table is created successfully
      await queryInterface.addIndex('member_parent_table', ['child_id', 'parent_id'], {
        unique: true,
        name: 'unique_child_parent_relationship'
      });

    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // First drop the index
      await queryInterface.removeIndex('member_parent_table', 'unique_child_parent_relationship')
        .catch(() => {
          // Ignore error if index doesn't exist
        });
      
      // Then drop the table
      await queryInterface.dropTable('member_parent_table');
    } catch (error) {
      console.error('Rollback error:', error);
      throw error;
    }
  }
};