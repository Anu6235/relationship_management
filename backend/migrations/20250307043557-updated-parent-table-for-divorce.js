'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('parent_table', 'status', {
      type: Sequelize.ENUM('pending', 'confirmed', 'divorced', 'widowed', 'pending divorce'),
      allowNull: false,
      defaultValue: 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('parent_table', 'status', {
      type: Sequelize.ENUM('pending', 'confirmed', 'divorced', 'widowed'),
      allowNull: false,
      defaultValue: 'pending'
    });
  }
};