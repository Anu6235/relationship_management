'use strict';

module.exports = (sequelize, DataTypes) => {
  const Member = sequelize.define('Member', {
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female'),
      allowNull: false,
    },
    mobile_number: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    aadhar_number: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users', 
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },   
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
    deceased: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    marital_status: {
      type: DataTypes.ENUM('single', 'married', 'widowed', 'divorced'),
      defaultValue: 'single',
    },
  }, {
    tableName: 'members', 
    underscored: true, 
  });

   Member.associate = (models) => {
    Member.belongsTo(models.User, {
      foreignKey: 'verified_by',
      as: 'verifier',
      targetKey: 'id'
    });
    Member.hasOne(models.ParentId, {
      foreignKey: 'member_id',
      as: 'parentId'
    });
    Member.hasMany(models.ParentTable, {
      foreignKey: 'husband_id',
      as: 'husbandMarriages'
    });
    Member.hasMany(models.ParentTable, {
      foreignKey: 'wife_id',
      as: 'wifeMarriages'
    });
    Member.belongsToMany(Member, {
      through: models.ParentTable,
      as: 'spouse',
      foreignKey: 'husband_id',
      otherKey: 'wife_id'
    });
    Member.hasMany(Member, {
      foreignKey: 'father_id',
      as: 'fatherChildren'
    });
    Member.hasMany(Member, {
      foreignKey: 'mother_id',
      as: 'motherChildren'
    });
    Member.belongsTo(Member, {
      foreignKey: 'father_id',
      as: 'father'
    });
    Member.belongsTo(Member, {
      foreignKey: 'mother_id',
      as: 'mother'
    });
  };

  Member.prototype.getProfileImageUrl = function() {
    if (this.profile_image) {
      return `/images/member-images/${this.profile_image}`;
    }
    return `/images/member-avatars/${this.gender.toLowerCase()}-avatar.png`;
  };

  return Member;
};