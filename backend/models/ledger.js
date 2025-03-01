'use strict';
module.exports = (sequelize, DataTypes) => {
  const Ledger = sequelize.define('Ledger', {
    ledger_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ledger_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      }
    },
    invoice_created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    invoice_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {});

  Ledger.associate = function(models) {
    Ledger.belongsTo(models.Member, {
      foreignKey: 'member_id',
      as: 'member'
    });
    Ledger.belongsTo(models.LedgerType, {
      foreignKey: 'ledger_type_id',
      as: 'ledgerType'
    });
  };

  return Ledger;
};