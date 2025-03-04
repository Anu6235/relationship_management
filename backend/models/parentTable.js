'use strict';

module.exports = (sequelize, DataTypes) => {
  const ParentTable = sequelize.define('ParentTable', {
    husband_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'members',
        key: 'id'
      }
    },
    wife_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'members',
        key: 'id'
      }
    },
    requested_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID of the member who initiated the marriage request'
    },
    marriage_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    divorce_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    death_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deceased_spouse_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'members',
        key: 'id'
      }
    },    
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'divorced', 'widowed'),
      defaultValue: 'pending',
    }
  }, {
    tableName: 'parent_table',
    underscored: true,
  });

  ParentTable.associate = (models) => {
    ParentTable.belongsTo(models.Member, {
      foreignKey: 'husband_id',
      as: 'husband'
    });
    ParentTable.belongsTo(models.Member, {
      foreignKey: 'wife_id',
      as: 'wife'
    });
  };

  return ParentTable;
};