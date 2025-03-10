
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AppConfig extends Model {
    static associate(models) {
    }
  }
  
  AppConfig.init({
    app_name: DataTypes.STRING,
    logo: DataTypes.STRING,
    email: DataTypes.STRING,
    contact: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'AppConfig',
    tableName: 'app_configs',
    underscored: true,
  });
  
  return AppConfig;
};