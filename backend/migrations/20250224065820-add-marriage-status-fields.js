module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Members');

    if (!tableDescription.death_date) {
      await queryInterface.addColumn('Members', 'death_date', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    await queryInterface.changeColumn('Members', 'marital_status', {
      type: Sequelize.ENUM('single', 'married', 'divorced', 'widowed', 'deceased'),
      defaultValue: 'single'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Members', 'death_date');

    await queryInterface.changeColumn('Members', 'marital_status', {
      type: Sequelize.ENUM('single', 'married'),
      defaultValue: 'single'
    });
  }
};
