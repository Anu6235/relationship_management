'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('members');
    
    if (tableInfo.parentSelection) {
      await queryInterface.renameColumn('members', 'parentSelection', 'parent_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('members');
    
    if (tableInfo.parent_selection) {
      await queryInterface.renameColumn('members', 'parent_id', 'parentSelection');
    }
  }
};