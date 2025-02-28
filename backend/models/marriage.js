'use strict';

module.exports = (sequelize, DataTypes) => {
  const Marriage = sequelize.define('Marriage', {
    couple_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
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
    marriage_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // divorce_date: {
    //   type: DataTypes.DATE,
    //   allowNull: true
    // },
    // death_date: {
    //   type: DataTypes.DATE,
    //   allowNull: true
    // },
    // deceased_spouse_id: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true
    // },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'divorced', 'widowed'),
      defaultValue: 'pending',
    }
  }, {
    tableName: 'marriages',
    underscored: true,
  });

  Marriage.associate = (models) => {
    Marriage.belongsTo(models.Member, {
      foreignKey: 'husband_id',
      as: 'husband'
    });
    Marriage.belongsTo(models.Member, {
      foreignKey: 'wife_id',
      as: 'wife'
    });
  };

  return Marriage;
};