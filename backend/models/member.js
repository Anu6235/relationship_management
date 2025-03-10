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
    parent_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Comma-separated ParentTable IDs of confirmed marriages'
    }
  }, {
    tableName: 'members',
    underscored: true,
  });

  Member.associate = (models) => {
    // Verifier association
    Member.belongsTo(models.User, {
      foreignKey: 'verified_by',
      as: 'verifier',
      targetKey: 'id'
    });

    // Marriage relationships
    Member.belongsToMany(Member, {
      through: models.ParentTable,
      as: 'spouse',
      foreignKey: 'husband_id',
      otherKey: 'wife_id'
    });

    // Parent-child relationships
    Member.belongsToMany(Member, {
      through: 'MemberParentTable',
      as: 'parents',
      foreignKey: 'child_id',
      otherKey: 'parent_id'
    });

    Member.belongsToMany(Member, {
      through: 'MemberParentTable',
      as: 'children',
      foreignKey: 'parent_id',
      otherKey: 'child_id'
    });
  };

  Member.prototype.getProfileImageUrl = function () {
    if (this.profile_image) {
      return `/images/member-images/${this.profile_image}`;
    }
    return `/images/member-avatars/${this.gender.toLowerCase()}-avatar.png`;
  };

  Member.prototype.getParentIds = function() {
    return this.parent_id ? this.parent_id.split(',').map(id => Number(id)) : [];
  };

  Member.prototype.addParentId = function(newParentId) {
    const currentIds = this.getParentIds();
    if (!currentIds.includes(Number(newParentId))) {
      currentIds.push(Number(newParentId));
      this.parent_id = currentIds.join(',');
    }
    return this.parent_id;
  };

  return Member;
};