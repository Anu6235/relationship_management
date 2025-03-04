'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('LedgerTypes', [{
      name: 'Member Fee',
      description: 'Monthly membership fee for all active members',
      amount: 199.00,
      is_active: 1,
      duration_value: 30,
      duration_unit: 'day',
      condition_config: JSON.stringify({
        marital_status: 'married',
        gender: 'male',
        status: 'active',
        deceased: 'no'
      }),
      fine_amount: 25.00,
      fine_interval_value: 10,
      fine_interval_unit: 'day',
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