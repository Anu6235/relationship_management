'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the new parent_id column
    await queryInterface.addColumn('Members', 'parent_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'parent_table',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Remove the old father_id and mother_id columns
    await queryInterface.removeColumn('Members', 'father_id');
    await queryInterface.removeColumn('Members', 'mother_id');

    // Populate the parent_id only where marriage is confirmed
    await queryInterface.sequelize.query(`
      UPDATE Members AS m
      SET parent_id = (
        SELECT id FROM parent_table AS p
        WHERE (p.husband_id = m.id OR p.wife_id = m.id) AND p.status = 'confirmed'
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM parent_table AS p
        WHERE (p.husband_id = m.id OR p.wife_id = m.id) AND p.status = 'confirmed'
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert changes by adding back father_id and mother_id
    await queryInterface.addColumn('Members', 'father_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('Members', 'mother_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Remove the parent_id column
    await queryInterface.removeColumn('Members', 'parent_id');
  },
};
