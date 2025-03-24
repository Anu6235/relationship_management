'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add is_current column to parent_table if it doesn't exist
    await queryInterface.addColumn('parent_table', 'is_current', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this is the current active marriage for both members'
    }).catch(error => {
      // Column might already exist, continue
      console.log('Column may already exist:', error.message);
    });

    // 2. Create the join table for the many-to-many relationship if it doesn't exist
    await queryInterface.createTable('member_parent_table', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Members',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      parent_table_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'parent_table',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }).catch(error => {
      // Table might already exist, continue
      console.log('Table may already exist:', error.message);
    });

    // 3. Instead of changing the parent_id column type, we'll handle the migration of data
    // Get all members with parent_id
    const members = await queryInterface.sequelize.query(
      'SELECT id, parent_id FROM Members WHERE parent_id IS NOT NULL',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // For each member with a parent_id, create an entry in the join table
    for (const member of members) {
      if (member.parent_id) {
        await queryInterface.sequelize.query(
          'INSERT INTO "member_parent_table" (member_id, parent_table_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          { 
            replacements: [member.id, member.parent_id],
            type: queryInterface.sequelize.QueryTypes.INSERT 
          }
        ).catch(error => {
          console.log(`Error inserting member ${member.id} with parent ${member.parent_id}:`, error.message);
        });
      }
    }

    // 4. Remove the foreign key constraint if it exists
    await queryInterface.removeConstraint('Members', 'members_parent_id_foreign_idx')
      .catch(error => {
        console.log('Constraint may not exist:', error.message);
      });

    // 5. Update or remove the parent_id column from members table
    // Option 1: Keep it but remove the constraint
    // No action needed if you want to keep it without the constraint
    
    // Option 2: Remove it if it's no longer needed (since we have the join table)
    // await queryInterface.removeColumn('members', 'parent_id');
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Remove the join table
    await queryInterface.dropTable('member_parent_table').catch(error => {
      console.log('Error dropping table:', error.message);
    });

    // 2. Remove is_current column from parent_table
    await queryInterface.removeColumn('parent_table', 'is_current').catch(error => {
      console.log('Error removing column:', error.message);
    });

    // 3. If you removed parent_id in the up migration, add it back
    // await queryInterface.addColumn('members', 'parent_id', {
    //   type: Sequelize.INTEGER,
    //   allowNull: true
    // });

    // 4. Re-add the foreign key constraint if needed
    // await queryInterface.addConstraint('members', {
    //   fields: ['parent_id'],
    //   type: 'foreign key',
    //   name: 'members_parent_id_foreign_idx',
    //   references: {
    //     table: 'parent_table',
    //     field: 'id'
    //   },
    //   onDelete: 'set null',
    //   onUpdate: 'cascade'
    // });
  }
};