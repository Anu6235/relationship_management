'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('LedgerTypes', [{
      name: 'Member Fee',
      description: 'Monthly membership fee for all active members',
      amount: 199.00,
      is_active: true,
      duration_value: 30,
      duration_unit: 'day',
      condition_config: JSON.stringify({
        marital_status: 'married',
        gender: 'male',
        status: 'active',
        deceased: 'no'
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('LedgerTypes', {
      name: 'Member Fee'
    }, {});
  }
};