'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.renameColumn('members', 'firstName', 'first_name'),
      queryInterface.renameColumn('members', 'lastName', 'last_name'),

      queryInterface.addColumn('members', 'status', {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active'
      }),

      queryInterface.addColumn('members', 'last_login', {
        type: Sequelize.DATE,
        allowNull: true,
      })
    ]); 
  },

  async down (queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.renameColumn('members', 'last_name', 'lastName'),
      queryInterface.renameColumn('members', 'first_name', 'firstName'),

      queryInterface.removeColumn('members', 'status'),
      queryInterface.removeColumn('members', 'last_login')
    ]);
  }
};