module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn("parent_table", "requested_by", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn("parent_table", "divorce_date", {
        type: Sequelize.DATE,
        allowNull: true,
      }),
      queryInterface.addColumn("parent_table", "death_date", {
        type: Sequelize.DATE,
        allowNull: true,
      }),
      queryInterface.addColumn("parent_table", "deceased_spouse_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn("parent_table", "requested_by"),
      queryInterface.removeColumn("parent_table", "divorce_date"),
      queryInterface.removeColumn("parent_table", "death_date"),
      queryInterface.removeColumn("parent_table", "deceased_spouse_id"),
    ]);
  },
};
