'use strict';

module.exports = (sequelize, DataTypes) => {
  const ParentTable = sequelize.define('ParentTable', {
    husband_id: {
      type: DataTypes.INTEGER,
      allowNull: true, 
      references: {
        model: 'Members',
        key: 'id'
      }
    },
    wife_id: {
      type: DataTypes.INTEGER,
      allowNull: true, 
      references: {
        model: 'Members',
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
        model: 'Members',
        key: 'id'
      }
    },    
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'pending divorce', 'divorced', 'widowed', 'pending widowed'),
      defaultValue: 'pending',
    },
    original_status: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stores the previous status when transitioning to pending divorce'
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this is the current active marriage for both members'
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
    
    ParentTable.belongsTo(models.Member, {
      foreignKey: 'deceased_spouse_id',
      as: 'deceasedSpouse'
    });
    
    // Add association for the many-to-many relationship with Member
    ParentTable.belongsToMany(models.Member, {
      through: 'member_parent_table',
      foreignKey: 'parent_table_id',
      otherKey: 'member_id',
      as: 'members'
    });
  };

  return ParentTable;
};