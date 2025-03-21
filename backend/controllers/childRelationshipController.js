const { Member, MemberParentTable, ParentTable, sequelize } = require('../models');
const { Op } = require('sequelize');

// Create a parent-child relationship request
exports.createParentChildRelationship = async (req, res) => {
    const t = await sequelize.transaction();
  
    try {
      const { parent_table_id, child_id, relationship_type, requested_by } = req.body;
  
      // Verify the marriage (parent_table) exists and is in a valid status
      const parentMarriage = await ParentTable.findOne({
        where: {
          id: parent_table_id,
          status: {
            [Op.in]: ['confirmed', 'widowed', 'divorced'] // Allow these statuses
          }
        },
        include: [
          {
            model: Member,
            as: 'husband'
          },
          {
            model: Member,
            as: 'wife'
          }
        ],
        transaction: t
      });
  
      if (!parentMarriage) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Valid marriage not found (must be confirmed, widowed, or divorced)'
        });
      }
  
      // Verify the child exists
      const child = await Member.findByPk(child_id, { transaction: t });
      if (!child) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Child member not found'
        });
      }
      
      // Prevent circular relationships - child cannot be the same as mother or father
      if (child_id == parentMarriage.husband_id || child_id == parentMarriage.wife_id) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid relationship: A member cannot be both a parent and child in the same relationship'
        });
      }
  
      // Validate that the requester exists
      const requester = await Member.findByPk(requested_by, { transaction: t });
      if (!requester) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Requesting member not found'
        });
      }
      
      // Verify that the requester is either the child or one of the parents
      const isRequesterChild = requested_by == child_id;
      const isRequesterParent = requested_by == parentMarriage.husband_id || requested_by == parentMarriage.wife_id;
      
      if (!isRequesterChild && !isRequesterParent) {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: 'Relationship can only be requested by the child or one of the parents'
        });
      }
  
      // Check if relationship already exists with either parent
      const existingRelationships = await MemberParentTable.findAll({
        where: {
          child_id,
          [Op.or]: [
            { father_id: parentMarriage.husband_id },
            { mother_id: parentMarriage.wife_id }
          ],
          status: {
            [Op.ne]: 'rejected' // Ignore rejected relationships
          }
        },
        transaction: t
      });
  
      if (existingRelationships.length > 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'A parent-child relationship already exists with one or both parents'
        });
      }

      // If this is a biological relationship, check if child already has confirmed biological parents
      if (relationship_type === 'biological') {
        const existingBiologicalRelationships = await MemberParentTable.findAll({
          where: {
            child_id,
            relationship_type: 'biological',
            status: {
              [Op.in]: ['confirmed', 'widowed', 'divorced'] // Consider all confirmed states
            }
          },
          transaction: t
        });

        if (existingBiologicalRelationships.length > 0) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'This member already has confirmed biological parents'
          });
        }
      }

      // Check if child has pending biological relationships when creating a new one
      if (relationship_type === 'biological') {
        const pendingBiologicalRelationships = await MemberParentTable.findAll({
          where: {
            child_id,
            relationship_type: 'biological',
            status: 'pending'
          },
          transaction: t
        });

        if (pendingBiologicalRelationships.length > 0) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'This member already has pending biological parent relationships'
          });
        }
      }
  
      // Determine initial status based on marriage status
      let initialStatus = 'pending';
  
      // Create parent-child relationship with both father and mother in a single record
      const relationship = await MemberParentTable.create({
        child_id,
        father_id: parentMarriage.husband_id,
        mother_id: parentMarriage.wife_id,
        parent_table_id,
        status: initialStatus,
        relationship_type,
        requested_by // Store the ID of the member who requested this relationship
      }, { transaction: t });
  
      await t.commit();
      res.status(201).json({
        success: true,
        message: 'Parent-child relationship request created successfully',
        data: {
          relationship,
          marriage_status: parentMarriage.status
        }
      });
  
    } catch (error) {
      await t.rollback();
      console.error('Error creating parent-child relationship:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

// Confirm a parent-child relationship
exports.confirmParentChildRelationship = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params; // MemberParentTable ID
    const { responding_member_id } = req.body;

    // Find the pending parent-child relationship
    const relationship = await MemberParentTable.findOne({
      where: {
        id,
        status: 'pending'
      },
      include: [
        {
          model: ParentTable,
          as: 'parentMarriage'
        }
      ],
      transaction: t
    });

    if (!relationship) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending parent-child relationship not found'
      });
    }
    
    // Prevent circular relationships - verify again that child is not also a parent
    if (relationship.child_id == relationship.father_id || relationship.child_id == relationship.mother_id) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid relationship: A member cannot be both a parent and child in the same relationship'
      });
    }

    // If this is a biological relationship, check if child already has confirmed biological parents
    if (relationship.relationship_type === 'biological') {
      const existingBiologicalRelationships = await MemberParentTable.findAll({
        where: {
          child_id: relationship.child_id,
          relationship_type: 'biological',
          status: {
            [Op.in]: ['confirmed', 'widowed', 'divorced'] // Consider all confirmed states
          },
          id: {
            [Op.ne]: id // Exclude the current relationship being confirmed
          }
        },
        transaction: t
      });

      if (existingBiologicalRelationships.length > 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'This member already has confirmed biological parents'
        });
      }
    }

    // Check if requested by child and responding is a parent, or vice versa
    const isRequestedByChild = relationship.requested_by == relationship.child_id;
    const isRequestedByParent = relationship.requested_by == relationship.father_id || relationship.requested_by == relationship.mother_id;
    const isRespondingParent = responding_member_id == relationship.father_id || responding_member_id == relationship.mother_id;
    const isRespondingChild = responding_member_id == relationship.child_id;
    
    // Verify the responding member is authorized
    if ((isRequestedByChild && !isRespondingParent) || (isRequestedByParent && !isRespondingChild)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to confirm this parent-child relationship. If requested by child, responding must be a parent and vice versa.'
      });
    }

    // Determine the relationship status based on the marriage status
    let relationshipStatus = 'confirmed';
    
    if (relationship.parentMarriage) {
      if (relationship.parentMarriage.status === 'widowed') {
        relationshipStatus = 'widowed';
      } else if (relationship.parentMarriage.status === 'divorced') {
        relationshipStatus = 'divorced';
      }
    }

    // Update the status of the relationship
    await relationship.update({ status: relationshipStatus }, { transaction: t });

    await t.commit();
    res.status(200).json({
      success: true,
      message: `Parent-child relationship confirmed with status: ${relationshipStatus}`,
      data: {
        relationship
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('Error confirming parent-child relationship:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Decline a parent-child relationship
exports.declineParentChildRelationship = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params; // MemberParentTable ID
    const { responding_member_id } = req.body;

    // Find the pending parent-child relationship
    const relationship = await MemberParentTable.findOne({
      where: {
        id,
        status: 'pending'
      },
      transaction: t
    });

    if (!relationship) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending parent-child relationship not found'
      });
    }

    // Check if requested by child and responding is a parent, or vice versa
    const isRequestedByChild = relationship.requested_by == relationship.child_id;
    const isRequestedByParent = relationship.requested_by == relationship.father_id || relationship.requested_by == relationship.mother_id;
    const isRespondingParent = responding_member_id == relationship.father_id || responding_member_id == relationship.mother_id;
    const isRespondingChild = responding_member_id == relationship.child_id;
    
    // Verify the responding member is authorized
    if ((isRequestedByChild && !isRespondingParent) || (isRequestedByParent && !isRespondingChild)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this parent-child relationship. If requested by child, responding must be a parent and vice versa.'
      });
    }

    // Delete the relationship instead of updating status
    await relationship.destroy({ transaction: t });

    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Parent-child relationship declined and removed successfully'
    });

  } catch (error) {
    await t.rollback();
    console.error('Error declining parent-child relationship:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update parent-child relationship status when marriage status changes
exports.updateRelationshipStatus = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { parent_table_id, new_status } = req.body;

    // Verify the new status is valid
    if (!['confirmed', 'widowed', 'divorced'].includes(new_status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be confirmed, widowed, or divorced'
      });
    }

    // Find all parent-child relationships for this marriage
    const relationships = await MemberParentTable.findAll({
      where: {
        parent_table_id,
        status: {
          [Op.in]: ['confirmed', 'widowed', 'divorced']
        }
      },
      transaction: t
    });

    if (relationships.length === 0) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'No active parent-child relationships found for this marriage'
      });
    }

    // Update all relationships to the new status
    const updatePromises = relationships.map(rel => 
      rel.update({ status: new_status }, { transaction: t })
    );
    
    await Promise.all(updatePromises);

    await t.commit();
    res.status(200).json({
      success: true,
      message: `Updated ${relationships.length} parent-child relationships to ${new_status}`,
      count: relationships.length
    });

  } catch (error) {
    await t.rollback();
    console.error('Error updating relationship status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get pending parent-child relationship requests for a specific parent
exports.getParentChildRequests = async (req, res) => {
  try {
    const parentId = req.params.parentId;
    const parentMember = await Member.findByPk(parentId);
    
    if (!parentMember) {
      return res.status(404).json({
        success: false,
        message: 'Parent member not found'
      });
    }
    
    // Determine which field to query based on gender
    const isFieldToQuery = parentMember.gender === 'male' ? 'father_id' : 'mother_id';

    // Find pending parent-child relationship requests where the member is a parent
    const pendingRequests = await MemberParentTable.findAll({
      attributes: ['id', 'father_id', 'mother_id', 'child_id', 'parent_table_id', 'status', 'relationship_type', 'requested_by'],
      where: {
        [isFieldToQuery]: parentId,
        status: 'pending'
      },
      include: [
        {
          model: Member,
          as: 'child',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob']
        },
        {
          model: Member,
          as: 'father',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: Member,
          as: 'mother',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: ParentTable,
          as: 'parentMarriage',
          attributes: ['id', 'husband_id', 'wife_id', 'marriage_date', 'status']
        },
        {
          model: Member,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Error fetching parent-child requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all children for a specific parent
exports.getParentChildren = async (req, res) => {
  try {
    const parentId = req.params.parentId;
    const parentMember = await Member.findByPk(parentId);
    
    if (!parentMember) {
      return res.status(404).json({
        success: false,
        message: 'Parent member not found'
      });
    }
    
    // Determine which field to query based on gender
    const isFieldToQuery = parentMember.gender === 'male' ? 'father_id' : 'mother_id';

    // Find all parent-child relationships (excluding rejected)
    const relationships = await MemberParentTable.findAll({
      where: {
        [isFieldToQuery]: parentId,
        status: {
          [Op.ne]: 'rejected'
        }
      },
      include: [
        {
          model: Member,
          as: 'child',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'death_date']
        },
        {
          model: Member,
          as: 'father',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: Member,
          as: 'mother',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: ParentTable,
          as: 'parentMarriage',
          attributes: ['id', 'husband_id', 'wife_id', 'marriage_date', 'status']
        },
        {
          model: Member,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    // Group relationships by status
    const groupedRelationships = {
      confirmed: relationships.filter(rel => rel.status === 'confirmed'),
      widowed: relationships.filter(rel => rel.status === 'widowed'),
      divorced: relationships.filter(rel => rel.status === 'divorced'),
      pending: relationships.filter(rel => rel.status === 'pending')
    };

    res.status(200).json({
      success: true,
      data: {
        relationships,
        groupedByStatus: groupedRelationships
      }
    });
  } catch (error) {
    console.error('Error fetching parent children:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all parents for a specific child
exports.getChildParents = async (req, res) => {
  try {
    const childId = req.params.childId;

    // Find all parent-child relationships (excluding rejected)
    const relationships = await MemberParentTable.findAll({
      where: {
        child_id: childId,
        status: {
          [Op.ne]: 'rejected'
        }
      },
      include: [
        {
          model: Member,
          as: 'father',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'deceased', 'death_date']
        },
        {
          model: Member,
          as: 'mother',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'deceased', 'death_date']
        },
        {
          model: ParentTable,
          as: 'parentMarriage',
          attributes: ['id', 'status', 'marriage_date', 'divorce_date', 'death_date']
        },
        {
          model: Member,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    // Group parents by marriages and status
    const parentsByMarriage = {};
    relationships.forEach(rel => {
      if (rel.parent_table_id) {
        if (!parentsByMarriage[rel.parent_table_id]) {
          parentsByMarriage[rel.parent_table_id] = {
            marriage_id: rel.parent_table_id,
            marriage_status: rel.parentMarriage?.status,
            marriage_date: rel.parentMarriage?.marriage_date,
            divorce_date: rel.parentMarriage?.divorce_date,
            death_date: rel.parentMarriage?.death_date,
            status: rel.status,
            requested_by: rel.requested_by,
            requester: rel.requester,
            parents: []
          };
        }
        
        if (rel.father) {
          const fatherExists = parentsByMarriage[rel.parent_table_id].parents.some(p => p.id === rel.father.id);
          if (!fatherExists) {
            parentsByMarriage[rel.parent_table_id].parents.push(rel.father);
          }
        }
        
        if (rel.mother) {
          const motherExists = parentsByMarriage[rel.parent_table_id].parents.some(p => p.id === rel.mother.id);
          if (!motherExists) {
            parentsByMarriage[rel.parent_table_id].parents.push(rel.mother);
          }
        }
      }
    });

    // Group by relationship status
    const groupedByStatus = {
      confirmed: relationships.filter(rel => rel.status === 'confirmed'),
      widowed: relationships.filter(rel => rel.status === 'widowed'),
      divorced: relationships.filter(rel => rel.status === 'divorced'),
      pending: relationships.filter(rel => rel.status === 'pending')
    };

    res.status(200).json({
      success: true,
      data: {
        relationships,
        parentsByMarriage: Object.values(parentsByMarriage),
        groupedByStatus
      }
    });
  } catch (error) {
    console.error('Error fetching child parents:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};