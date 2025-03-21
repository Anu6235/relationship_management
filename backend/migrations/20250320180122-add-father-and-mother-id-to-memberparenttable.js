'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename parent_id to father_id
    await queryInterface.renameColumn('member_parent_table', 'parent_id', 'father_id');

    // Create a new table with the correct column order
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE member_parent_table ADD COLUMN mother_id INTEGER AFTER father_id;`,
        { transaction }
      );
      
      await queryInterface.addConstraint('member_parent_table', {
        fields: ['mother_id'],
        type: 'foreign key',
        name: 'fk_mother_id_members',
        references: {
          table: 'members',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        transaction,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the changes
    await queryInterface.renameColumn('member_parent_table', 'father_id', 'parent_id');
    await queryInterface.removeColumn('member_parent_table', 'mother_id');
  }
};
