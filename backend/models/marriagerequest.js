'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MarriageRequest extends Model {
    static associate(models) {
      MarriageRequest.belongsTo(models.User, {
        foreignKey: 'requester_id',
        as: 'requester',
        onDelete: 'CASCADE'
      });
      MarriageRequest.belongsTo(models.User, {
        foreignKey: 'requestee_id',
        as: 'requestee',
        onDelete: 'CASCADE'
      });
    }
  }

  MarriageRequest.init(
    {
      requester_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      requestee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        defaultValue: 'pending'
      }
    },
    {
      sequelize,
      modelName: 'MarriageRequest',
      tableName: 'marriage_requests',
      underscored: true
    }
  );

  return MarriageRequest;
};
