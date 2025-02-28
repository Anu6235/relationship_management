'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create the table if it doesn't exist
    await queryInterface.createTable('marriage_requests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      requester_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      requestee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Check and create unique constraint if not exists
    const [resultsUnique] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'marriage_requests' AND CONSTRAINT_NAME = 'unique_request';
    `);

    if (!resultsUnique.length) {
      await queryInterface.addConstraint('marriage_requests', {
        fields: ['requester_id', 'requestee_id'],
        type: 'unique',
        name: 'unique_request'
      });
    }

    // Check and create index if not exists
    const [resultsIndex] = await queryInterface.sequelize.query(`
      SHOW INDEX FROM marriage_requests WHERE Key_name = 'idx_status';
    `);

    if (!resultsIndex.length) {
      await queryInterface.addIndex('marriage_requests', ['status'], {
        name: 'idx_status'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('marriage_requests');
  }
};
