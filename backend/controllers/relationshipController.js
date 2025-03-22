const { Member, sequelize, ParentTable, MemberParentTable } = require('../models');
const { Op } = require('sequelize');

exports.getMemberRelationships = async (req, res) => {
  try {
    const memberId = parseInt(req.params.id);
    
    // Get the member with their details
    const member = await Member.findByPk(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // 1. SPOUSE RELATIONSHIPS
    
    // Get all marriages (current, divorced, widowed)
    const marriageRecords = await ParentTable.findAll({
      where: { 
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
        ],
        status: { [Op.in]: ['confirmed', 'divorced', 'widowed'] }
      },
      include: [
        { model: Member, as: 'husband', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender', 'deceased'] },
        { model: Member, as: 'wife', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender', 'deceased'] }
      ]
    });
    
    // Process each marriage to categorize spouses
    const currentSpouse = [];
    const divorcedSpouses = [];
    const widowedSpouses = [];
    const marriages = [];
    
    for (const marriage of marriageRecords) {
      marriages.push(marriage);
      
      let spouse;
      if (marriage.husband_id === memberId) {
        spouse = marriage.wife;
      } else {
        spouse = marriage.husband;
      }
      
      // Skip if spouse not found
      if (!spouse) continue;
      
      // Add marriage info to spouse data
      spouse.dataValues.marriage_date = marriage.marriage_date || marriage.createdAt;
      spouse.dataValues.marriage_id = marriage.id;
      spouse.dataValues.is_current = marriage.is_current;
      spouse.dataValues.relationship_status = marriage.status;
      
      // Categorize by relationship status
      if (marriage.status === 'confirmed' && marriage.is_current) {
        currentSpouse.push(spouse);
      } else if (marriage.status === 'divorced') {
        spouse.dataValues.divorce_date = marriage.divorce_date;
        divorcedSpouses.push(spouse);
      } else if (marriage.status === 'widowed') {
        spouse.dataValues.death_date = marriage.death_date;
        widowedSpouses.push(spouse);
      }
    }

    // 2. PENDING DIVORCE RELATIONSHIPS
    const pendingDivorces = [];

    const pendingDivorceRequests = await ParentTable.findAll({
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
        ],
        status: 'pending divorce'
      },
      attributes: ['id', 'husband_id', 'wife_id', 'status', 'createdAt', 'requested_by'],
      include: [
        { model: Member, as: 'husband', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender'] },
        { model: Member, as: 'wife', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender'] }
      ]
    });

    // Format pending divorce requests
    for (const request of pendingDivorceRequests) {
      const isRequester = request.requested_by === memberId;
      const spouseId = request.husband_id === memberId ? request.wife_id : request.husband_id;
      const spouse = request.husband_id === memberId ? request.wife : request.husband;
      
      if (!spouse) continue;
      
      spouse.dataValues.request_id = request.id;
      spouse.dataValues.is_outgoing = isRequester;
      spouse.dataValues.created_at = request.createdAt;
      spouse.dataValues.marriage_date = request.marriage_date;
      spouse.dataValues.divorce_date = request.divorce_date;
      spouse.dataValues.relationship_status = 'pending divorce';
      
      pendingDivorces.push(spouse);
    }

     // 3. PENDING WIDOWED RELATIONSHIPS
     const pendingWidowed = [];

     const pendingWidowedRequests = await ParentTable.findAll({
       where: {
         [Op.or]: [
           { husband_id: memberId },
           { wife_id: memberId }
         ],
         status: 'pending widowed'
       },
       attributes: ['id', 'husband_id', 'wife_id', 'status', 'createdAt', 'requested_by'],
       include: [
         { model: Member, as: 'husband', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender'] },
         { model: Member, as: 'wife', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender'] }
       ]
     });
 
     // Format pending widowed requests
     for (const request of pendingWidowedRequests) {
       const isRequester = request.requested_by === memberId;
       const spouseId = request.husband_id === memberId ? request.wife_id : request.husband_id;
       const spouse = request.husband_id === memberId ? request.wife : request.husband;
       
       if (!spouse) continue;
       
       spouse.dataValues.request_id = request.id;
       spouse.dataValues.is_outgoing = isRequester;
       spouse.dataValues.created_at = request.createdAt;
       spouse.dataValues.marriage_date = request.marriage_date;
       spouse.dataValues.relationship_status = 'pending widowed';
       
       pendingWidowed.push(spouse);
     }
    
    // 4. PENDING SPOUSE RELATIONSHIPS
    
    const pendingMarriageRequests = await ParentTable.findAll({
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
        ],
        status: 'pending'
      },
      attributes: ['id', 'husband_id', 'wife_id', 'status', 'createdAt', 'requested_by'],
      include: [
        { model: Member, as: 'husband', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender'] },
        { model: Member, as: 'wife', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'marital_status', 'gender'] }
      ]
    });
    
    // Format pending spouse requests
    const pendingSpouses = pendingMarriageRequests.map(request => {
      const isRequester = request.requested_by === memberId;
      const potentialSpouse = request.husband_id === memberId ? request.wife : request.husband;
      
      if (!potentialSpouse) return null;
      
      potentialSpouse.dataValues.request_id = request.id;    
      potentialSpouse.dataValues.is_outgoing = isRequester;
      potentialSpouse.dataValues.created_at = request.createdAt;
      potentialSpouse.dataValues.relationship_status = 'pending';
      
      return potentialSpouse;
    }).filter(Boolean);

    // 5. CHILDREN RELATIONSHIPS - Only confirmed children
    const childrenData = [];
    
    // Find children where the member is either father or mother and status is confirmed/widowed/divorced
    const children = await MemberParentTable.findAll({
      where: {
        [Op.or]: [
          { father_id: memberId },
          { mother_id: memberId }
        ],
        status: {
          [Op.in]: ['confirmed', 'widowed', 'divorced'] // Only confirmed child relationships
        }
      },
      include: [
        {
          model: Member,
          as: 'child',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
        }
      ]
    });
    
    // Format child data
    for (const relationship of children) {
      if (!relationship.child) continue;
      
      const child = relationship.child;
      child.dataValues.relationship_status = relationship.status;
      child.dataValues.relationship_type = relationship.relationship_type;
      child.dataValues.parent_role = relationship.father_id === memberId ? 'father' : 'mother';
      
      childrenData.push(child);
    }
    
    // 6. PARENT RELATIONSHIPS - Only confirmed parents
    const parentsData = [];
    
    // Find parents where the member is the child
    const parents = await MemberParentTable.findAll({
      where: {
        child_id: memberId,
        status: {
          [Op.in]: ['confirmed', 'widowed', 'divorced'] // Only confirmed parent relationships
        }
      },
      include: [
        {
          model: Member,
          as: 'father',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
        },
        {
          model: Member,
          as: 'mother',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
        }
      ]
    });
    
    // Format parent data
    for (const relationship of parents) {
      // Add father if exists
      if (relationship.father) {
        const father = relationship.father;
        father.dataValues.relationship_status = relationship.status;
        father.dataValues.relationship_type = relationship.relationship_type;
        father.dataValues.parent_role = 'father';
        parentsData.push(father);
      }
      
      // Add mother if exists
      if (relationship.mother) {
        const mother = relationship.mother;
        mother.dataValues.relationship_status = relationship.status;
        mother.dataValues.relationship_type = relationship.relationship_type;
        mother.dataValues.parent_role = 'mother';
        parentsData.push(mother);
      }
    }
    
    // 7. PENDING PARENT RELATIONSHIPS
    const pendingParentsData = [];
    
    const pendingParents = await MemberParentTable.findAll({
      where: {
        child_id: memberId,
        status: 'pending'
      },
      attributes: ['id', 'child_id', 'father_id', 'mother_id', 'status', 'createdAt', 'requested_by'],
      include: [
        {
          model: Member,
          as: 'father',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
        },
        {
          model: Member,
          as: 'mother',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
        },
        {
          model: ParentTable,
          as: 'parentMarriage',
          attributes: ['id', 'status', 'husband_id', 'wife_id']
        }
      ]
    });
    
    // Format pending parent data
    for (const relationship of pendingParents) {
      // Add father if exists
      if (relationship.father) {
        const father = relationship.father;
        father.dataValues.relationship_status = 'pending';
        father.dataValues.relationship_type = relationship.relationship_type;
        father.dataValues.parent_role = 'father';
        father.dataValues.request_id = relationship.id;
        father.dataValues.created_at = relationship.createdAt;
        father.dataValues.is_outgoing = relationship.requested_by === memberId;
        father.dataValues.marriage_id = relationship.parent_table_id;
        pendingParentsData.push(father);
      }
      
      // Add mother if exists
      if (relationship.mother) {
        const mother = relationship.mother;
        mother.dataValues.relationship_status = 'pending';
        mother.dataValues.relationship_type = relationship.relationship_type;
        mother.dataValues.parent_role = 'mother';
        mother.dataValues.request_id = relationship.id;
        mother.dataValues.created_at = relationship.createdAt;
        mother.dataValues.is_outgoing = relationship.requested_by === memberId;
        mother.dataValues.marriage_id = relationship.parent_table_id;
        pendingParentsData.push(mother);
      }
    }
    
    // 8. PENDING CHILD RELATIONSHIPS
    const pendingChildrenData = [];
    
    // Find pending child relationships where the member is a parent
    const pendingChildren = await MemberParentTable.findAll({
      where: {
        [Op.or]: [
          { father_id: memberId },
          { mother_id: memberId }
        ],
        status: 'pending'
      },
      attributes: ['id', 'child_id', 'father_id', 'mother_id', 'status', 'createdAt', 'requested_by'],
      include: [
        {
          model: Member,
          as: 'child',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
        },
        {
          model: ParentTable,
          as: 'parentMarriage',
          attributes: ['id', 'status', 'husband_id', 'wife_id']
        }
      ]
    });
    
    // Format pending children data
    for (const relationship of pendingChildren) {
      if (!relationship.child) continue;
      
      const child = relationship.child;
      child.dataValues.relationship_status = 'pending';
      child.dataValues.relationship_type = relationship.relationship_type;
      child.dataValues.parent_role = relationship.father_id === memberId ? 'father' : 'mother';
      child.dataValues.request_id = relationship.id;
      child.dataValues.created_at = relationship.createdAt;
      child.dataValues.is_outgoing = relationship.requested_by === memberId;
      child.dataValues.marriage_id = relationship.parent_table_id;
      
      pendingChildrenData.push(child);
    }
    
    // Return comprehensive relationship data
    return res.json({
      success: true,
      data: {
        member: {
          ...member.dataValues,
          marital_relationship_status: member.marital_status
        },
        relationships: {
          spouse: currentSpouse, 
          divorced_spouses: divorcedSpouses,
          widowed_spouses: widowedSpouses,
          pending_spouses: pendingSpouses,
          pending_divorces: pendingDivorces,
          pending_widowed: pendingWidowed, 
          children: childrenData,
          parents: parentsData,
          pending_parents: pendingParentsData,
          pending_children: pendingChildrenData,
          marriages: marriages.map(marriage => ({
            ...marriage.dataValues,
            relationship_status: marriage.status
          }))
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getWife = async (req, res) => {
    try {
      const husbandId = req.params.id;
      
      // Find the current marriage where the given ID is the husband
      const marriage = await ParentTable.findOne({
        where: {
          husband_id: husbandId,
          is_current: true,
          status: {
            [Op.in]: ['pending', 'confirmed'] // Only get active marriages
          }
        },
        include: [
          {
            model: Member,
            as: 'wife',
            attributes: ['id', 'first_name', 'last_name', 'profile_image']
            // Add any other wife attributes you need
          }
        ]
      });
      
      if (!marriage || !marriage.wife) {
        return res.status(404).json({
          success: false,
          message: 'No wife found for this husband'
        });
      }
      
      res.status(200).json({
        success: true,
        data: marriage.wife
      });
      
    } catch (error) {
      console.error('Error fetching wife data:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  };
  
  exports.getMarriageBySpouses = async (req, res) => {
    try {
      // Get husband_id and wife_id from query parameters
      const husbandId = req.query.husband_id;
      const wifeId = req.query.wife_id;
      
      // Validate that both IDs are provided
      if (!husbandId || !wifeId) {
        return res.status(400).json({
          success: false,
          message: 'Both husband_id and wife_id are required as query parameters'
        });
      }
      
      // Find the marriage record that matches both husband and wife IDs
      const marriage = await ParentTable.findOne({
        where: {
          husband_id: husbandId,
          wife_id: wifeId
        },
        include: [
          {
            model: Member,
            as: 'husband',
            attributes: ['id', 'first_name', 'last_name', 'profile_image']
          },
          {
            model: Member,
            as: 'wife',
            attributes: ['id', 'first_name', 'last_name', 'profile_image']
          }
        ]
      });
      
      if (!marriage) {
        return res.status(404).json({
          success: false,
          message: 'No marriage record found for the provided husband and wife IDs'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          id: marriage.id,
          husband: marriage.husband,
          wife: marriage.wife,
          status: marriage.status,
          marriage_date: marriage.marriage_date,
          requested_by: marriage.requested_by,
          is_current: marriage.is_current
        }
      });
      
    } catch (error) {
      console.error('Error fetching marriage data:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  };
  
  exports.getAllParentRelationships = async (req, res) => {
    try {
      // Fetch all marriages with status confirmed, divorced, or widowed
      const parentRelationships = await ParentTable.findAll({
        where: {
          status: {
            [Op.in]: ['confirmed', 'divorced', 'widowed']
          }
        },
        attributes: ['id', 'status', 'husband_id', 'wife_id', 'marriage_date', 'divorce_date', 'death_date'],
        include: [
          {
            model: Member,
            as: 'husband',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: Member, 
            as: 'wife',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['id', 'ASC']]
      });
  
      // Format the data to display husband and wife names
      const formattedRelationships = parentRelationships.map((relationship) => {
        const husband = relationship.husband ? relationship.husband.first_name : 'Unknown';
        const wife = relationship.wife ? relationship.wife.first_name : 'Unknown';
        
        return {
          id: relationship.id,
          name: `${husband}-${wife}`,
          status: relationship.status,
          husband_id: relationship.husband_id,
          wife_id: relationship.wife_id
        };
      });
  
      return res.status(200).json({
        success: true,
        count: formattedRelationships.length,
        data: formattedRelationships
      });
    } catch (error) {
      console.error('Error fetching parent relationships:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };

// Create parent-child relationships
exports.createParentChildRelationships = async (parentTableId, fatherId, motherId, childId, transaction) => {
  try {
    // Create a record that links the child to both parents
    await MemberParentTable.create({
      child_id: childId,
      father_id: fatherId,
      mother_id: motherId,
      parent_table_id: parentTableId,
      status: 'confirmed',
      relationship_type: 'biological'
    }, { transaction });
    
    return true;
  } catch (error) {
    console.error('Error creating parent-child relationship:', error);
    throw error;
  }
};

// Get member's parents
exports.getMemberParents = async (req, res) => {
  try {
    const childId = parseInt(req.params.id);
    
    // Find all parent relationships for this child
    const parentRelationships = await MemberParentTable.findAll({
      where: { child_id: childId },
      include: [
        {
          model: Member,
          as: 'father',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'deceased']
        },
        {
          model: Member,
          as: 'mother',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'deceased']
        },
        {
          model: ParentTable,
          as: 'parentMarriage',
          attributes: ['id', 'status', 'marriage_date']
        }
      ]
    });
    
    if (!parentRelationships.length) {
      return res.status(404).json({
        success: false,
        message: 'No parent relationships found for this member'
      });
    }
    
    // Format the response
    const parents = parentRelationships.map(relationship => ({
      id: relationship.id,
      status: relationship.status,
      relationship_type: relationship.relationship_type,
      father: relationship.father,
      mother: relationship.mother,
      marriage: relationship.parentMarriage,
    }));
    
    return res.json({
      success: true,
      data: parents
    });
    
  } catch (error) {
    console.error('Error fetching member parents:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get member's children
exports.getMemberChildren = async (req, res) => {
  try {
    const parentId = parseInt(req.params.id);
    const member = await Member.findByPk(parentId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Find all children relationships based on member's gender
    const whereClause = member.gender === 'male' 
      ? { father_id: parentId } 
      : { mother_id: parentId };
    
    const childrenRelationships = await MemberParentTable.findAll({
      where: whereClause,
      include: [
        {
          model: Member,
          as: 'child',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
        }
      ]
    });
    
    // Format the children data
    const children = childrenRelationships.map(relationship => ({
      relationship_id: relationship.id,
      status: relationship.status,
      relationship_type: relationship.relationship_type,
      ...relationship.child.dataValues
    }));
    
    return res.json({
      success: true,
      count: children.length,
      data: children
    });
    
  } catch (error) {
    console.error('Error fetching member children:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};