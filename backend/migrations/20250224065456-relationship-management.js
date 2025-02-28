'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Members', 'father_id', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Members', 'mother_id', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Members', 'father_id');
    await queryInterface.removeColumn('Members', 'mother_id');
  }
};