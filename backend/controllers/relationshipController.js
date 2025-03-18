const { Member, sequelize, ParentTable } = require('../models');
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

    // 1.5 PENDING DIVORCE RELATIONSHIPS
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
    
    // 2. PENDING SPOUSE RELATIONSHIPS
    
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
      console.log("id is :",request.id);
      
      potentialSpouse.dataValues.is_outgoing = isRequester;
      potentialSpouse.dataValues.created_at = request.createdAt;
      potentialSpouse.dataValues.relationship_status = 'pending';
      
      return potentialSpouse;
    }).filter(Boolean);

    // 3. CHILDREN RELATIONSHIPS
    // Instead of using a non-existing table, we'll derive child relationships from the ParentTable
    const childrenData = [];
    
    // Check if MemberParentTable exists
    let memberParentTableExists = false;
    try {
      await sequelize.query('SELECT 1 FROM member_parent_table LIMIT 1');
      memberParentTableExists = true;
    } catch (e) {
      // Table doesn't exist
    }
    
    if (memberParentTableExists) {
      // If the table exists, use it
      const children = await sequelize.query(`
        SELECT m.id, m.first_name, m.last_name, m.profile_image, m.gender, 
               m.dob, m.deceased, m.marital_status, mpt.status as relationship_status,
               IFNULL(mpt.relationship_type, 'biological') as relationship_type
        FROM members m
        JOIN member_parent_table mpt ON m.id = mpt.child_id
        WHERE mpt.parent_id = :memberId
      `, {
        replacements: { memberId },
        type: sequelize.QueryTypes.SELECT
      });
      
      childrenData.push(...children);
    } else {
      // Derive children from ParentTable
      // This is a temporary solution until MemberParentTable exists
      
      // For male members, find children through marriages
      if (member.gender === 'male') {
        const husbandMarriages = await ParentTable.findAll({
          where: { 
            husband_id: memberId,
            status: 'confirmed'
          },
          include: [{
            model: Member,
            as: 'wife',
            attributes: ['id']
          }]
        });
        
        // Find children who have marriages with their mothers
        for (const marriage of husbandMarriages) {
          if (!marriage.wife) continue;
          
          // Assume members who are 18+ years younger than the marriage date are children
          const potentialChildren = await Member.findAll({
            where: {
              dob: {
                [Op.gte]: sequelize.literal(`DATE_SUB(${marriage.marriage_date ? `'${marriage.marriage_date.toISOString()}'` : 'NOW()'}, INTERVAL 18 YEAR)`)
              }
            },
            attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
          });
          
          // Add to children with derived relationship status
          for (const child of potentialChildren) {
            child.dataValues.relationship_status = 'confirmed';
            child.dataValues.relationship_type = 'biological';
            childrenData.push(child);
          }
        }
      }
      
      // For female members, similar approach
      if (member.gender === 'female') {
        const wifeMarriages = await ParentTable.findAll({
          where: { 
            wife_id: memberId,
            status: 'confirmed'
          },
          include: [{
            model: Member,
            as: 'husband',
            attributes: ['id']
          }]
        });
        
        // Similar logic as above
        for (const marriage of wifeMarriages) {
          // Similar code as for male members
          if (!marriage.husband) continue;
          
          const potentialChildren = await Member.findAll({
            where: {
              dob: {
                [Op.gte]: sequelize.literal(`DATE_SUB(${marriage.marriage_date ? `'${marriage.marriage_date.toISOString()}'` : 'NOW()'}, INTERVAL 18 YEAR)`)
              }
            },
            attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status']
          });
          
          for (const child of potentialChildren) {
            child.dataValues.relationship_status = 'confirmed';
            child.dataValues.relationship_type = 'biological';
            childrenData.push(child);
          }
        }
      }
    }
    
    // 4. PARENT RELATIONSHIPS
    // Similar approach as with children
    const parentsData = [];
    
    if (memberParentTableExists) {
      // If the table exists, use it
      const parents = await sequelize.query(`
        SELECT m.id, m.first_name, m.last_name, m.profile_image, m.gender, 
               m.dob, m.deceased, m.marital_status, mpt.status as relationship_status,
               IFNULL(mpt.relationship_type, 'biological') as relationship_type
        FROM members m
        JOIN member_parent_table mpt ON m.id = mpt.parent_id
        WHERE mpt.child_id = :memberId
      `, {
        replacements: { memberId },
        type: sequelize.QueryTypes.SELECT
      });
      
      parentsData.push(...parents);
    } else {
      // Use the parent_id field from members table
      if (member.parent_id) {
        const parentIds = member.getParentIds();
        
        // Fetch all parent marriages
        const parentMarriages = await ParentTable.findAll({
          where: { 
            id: { [Op.in]: parentIds },
            status: 'confirmed'
          },
          include: [
            { model: Member, as: 'husband', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status'] },
            { model: Member, as: 'wife', attributes: ['id', 'first_name', 'last_name', 'profile_image', 'gender', 'dob', 'deceased', 'marital_status'] }
          ]
        });
        
        // Add both parents from each marriage
        for (const marriage of parentMarriages) {
          if (marriage.husband) {
            const father = marriage.husband;
            father.dataValues.relationship_status = 'confirmed';
            father.dataValues.relationship_type = 'biological';
            parentsData.push(father);
          }
          
          if (marriage.wife) {
            const mother = marriage.wife;
            mother.dataValues.relationship_status = 'confirmed';
            mother.dataValues.relationship_type = 'biological';
            parentsData.push(mother);
          }
        }
      }
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
          children: childrenData,
          parents: parentsData,
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