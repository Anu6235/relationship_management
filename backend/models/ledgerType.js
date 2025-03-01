'use strict';
module.exports = (sequelize, DataTypes) => {
  const LedgerType = sequelize.define('LedgerType', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    duration_value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30 
    },
    duration_unit: {
      type: DataTypes.ENUM('minute', 'hour', 'day', 'month'),
      allowNull: false,
      defaultValue: 'day'
    },
    condition_config: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {} 
    }
  }, {});
  
  // Instance method to calculate duration in hours
  LedgerType.prototype.getDurationInHours = function() {
    const value = this.duration_value;
    switch(this.duration_unit) {
      case 'minute':
        return value / 60;
      case 'hour':
        return value;
      case 'day':
        return value * 24;
      case 'month':
        return value * 30 * 24; 
      default:
        return value * 24; 
    }
  };
  
  // Instance method to get due date based on invoice date
  LedgerType.prototype.calculateDueDate = function(invoiceDate) {
    const date = new Date(invoiceDate);
    switch(this.duration_unit) {
      case 'minute':
        date.setMinutes(date.getMinutes() + this.duration_value);
        break;
      case 'hour':
        date.setHours(date.getHours() + this.duration_value);
        break;
      case 'day':
        date.setDate(date.getDate() + this.duration_value);
        break;
      case 'month':
        date.setMonth(date.getMonth() + this.duration_value);
        break;
      default:
        date.setDate(date.getDate() + this.duration_value);
    }
    return date;
  };
  
  // Method to check if a member satisfies the conditions
  LedgerType.prototype.isApplicableToMember = function(member) {
    if (!this.condition_config || Object.keys(this.condition_config).length === 0) {
      return true; // No conditions means applicable to all members
    }
    
    // Check each condition against the member's attributes
    for (const [key, value] of Object.entries(this.condition_config)) {
      // Handle special case for 'deceased' which is a boolean in the database
      if (key === 'deceased' && member.hasOwnProperty(key)) {
        const boolValue = value.toLowerCase() === 'no' ? false : true;
        if (member[key] !== boolValue) {
          return false;
        }
        continue;
      }
    
      if (member.hasOwnProperty(key) && member[key] !== value) {
        return false;
      }
    }
    
    return true;
  };
  
  LedgerType.associate = function(models) {
    LedgerType.hasMany(models.Ledger, {
      foreignKey: 'ledger_type_id',
      as: 'ledgers'
    });
  };
  return LedgerType;
};