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
    fine: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Accumulated fine amount for late payment'
    },
    fine_last_calculated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of when the fine was last calculated'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    invoice_status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '1: Pending, 2: Paid, 3: Overdue, 4: Cancelled'
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {});

  // Instance method to recalculate fine
  Ledger.prototype.recalculateFine = async function(models) {
    if (this.invoice_status !== 1) {
      return this; // Only recalculate for pending invoices
    }

    const ledgerType = await models.LedgerType.findByPk(this.ledger_type_id);
    if (!ledgerType) {
      return this;
    }

    const now = new Date();
    const dueDate = new Date(this.due_date);

    if (now <= dueDate) {
      return this; // Not overdue yet
    }

    const fine = ledgerType.calculateFine(dueDate, now);

    // Update the fine amount and total amount
    this.fine = fine;
    this.fine_last_calculated_at = now;
    this.total_amount = parseFloat(this.amount) + parseFloat(fine);

    // Update invoice status to overdue if not already
    if (this.invoice_status === 1) {
      this.invoice_status = 3; // Set to overdue
    }

    await this.save();
    return this;
  };

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