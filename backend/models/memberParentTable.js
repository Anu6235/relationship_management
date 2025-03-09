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
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      type: DataTypes.ENUM('pending', 'confirmed', 'rejected'),
      defaultValue: 'confirmed',
    },
    relationship_type: {
      type: DataTypes.ENUM('biological', 'adopted', 'step'),
      defaultValue: 'biological',
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
      foreignKey: 'parent_id',
      as: 'parent'
    });
    
    MemberParentTable.belongsTo(models.ParentTable, {
      foreignKey: 'parent_table_id',
      as: 'parentMarriage'
    });
  };

  return MemberParentTable;
};