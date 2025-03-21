'use strict';

module.exports = (sequelize, DataTypes) => {
  const MemberParentTable = sequelize.define('MemberParentTable', {
    child_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'members',
        key: 'id'
      }
    },
    father_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'members',
        key: 'id'
      }
    },
    mother_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'members',
        key: 'id'
      }
    },
    parent_table_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'parent_table',
        key: 'id'
      },
      comment: 'Links to the marriage record if the parent relationship is from a marriage'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'rejected', 'widowed', 'divorced'),
      defaultValue: 'confirmed',
    },
    relationship_type: {
      type: DataTypes.ENUM('biological', 'adopted', 'step'),
      defaultValue: 'biological',
    },
    requested_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'members',
        key: 'id'
      },
      comment: 'ID of the member who requested this parent-child relationship'
    }
  }, {
    tableName: 'member_parent_table',
    underscored: true,
  });

  MemberParentTable.associate = (models) => {
    MemberParentTable.belongsTo(models.Member, {
      foreignKey: 'child_id',
      as: 'child'
    });
    
    MemberParentTable.belongsTo(models.Member, {
      foreignKey: 'father_id',
      as: 'father'
    });
    
    MemberParentTable.belongsTo(models.Member, {
      foreignKey: 'mother_id',
      as: 'mother'
    });
    
    MemberParentTable.belongsTo(models.ParentTable, {
      foreignKey: 'parent_table_id',
      as: 'parentMarriage'
    });
    
    MemberParentTable.belongsTo(models.Member, {
      foreignKey: 'requested_by',
      as: 'requester'
    });
  };

  return MemberParentTable;
};