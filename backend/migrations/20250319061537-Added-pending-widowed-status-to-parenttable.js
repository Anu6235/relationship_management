'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(`
      ALTER TABLE parent_table
      MODIFY COLUMN status ENUM('pending', 'confirmed', 'pending divorce', 'divorced', 'widowed', 'pending widowed')
      DEFAULT 'pending';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(`
      ALTER TABLE parent_table
      MODIFY COLUMN status ENUM('pending', 'confirmed', 'pending divorce', 'divorced', 'widowed')
      DEFAULT 'pending';
    `);
  }
};