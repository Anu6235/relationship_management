module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('members');

    if (!tableDescription.death_date) {
      await queryInterface.addColumn('members', 'death_date', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    await queryInterface.changeColumn('members', 'marital_status', {
      type: Sequelize.ENUM('single', 'married', 'divorced', 'widowed', 'deceased'),
      defaultValue: 'single'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('members', 'death_date');

    await queryInterface.changeColumn('members', 'marital_status', {
      type: Sequelize.ENUM('single', 'married'),
      defaultValue: 'single'
    });
  }
};
