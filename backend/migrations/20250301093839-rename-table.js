module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("marriages", "parent_table");
    await queryInterface.removeColumn("parent_table", "couple_id");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("parent_table", "marriages");
    await queryInterface.addColumn("marriages", "couple_id", {
      type: Sequelize.INTEGER,
    });
  },
};
