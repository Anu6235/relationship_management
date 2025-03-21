const { Member, sequelize, ParentTable } = require('../models');
const { Op } = require('sequelize');

// Create multiple marriages at once (all in pending state)
exports.createMultipleMarriages = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { marriages, member_id, gender } = req.body;
    
    if (!marriages || !Array.isArray(marriages) || marriages.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No marriages provided'
      });
    }

    const mainMember = await Member.findByPk(member_id);
    if (!mainMember) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const createdMarriages = [];

    // Process each marriage in the array
    for (const marriage of marriages) {
      const { spouse_id, marriage_date } = marriage;
      
      const spouse = await Member.findByPk(spouse_id);
      if (!spouse) {
        continue; // Skip this marriage if spouse not found
      }
      
      // Determine husband_id and wife_id based on gender
      let husband_id, wife_id;
      if (gender === 'male') {
        husband_id = member_id;
        wife_id = spouse_id;
      } else {
        husband_id = spouse_id;
        wife_id = member_id;
      }
      
      // Verify correct gender pairing
      const husband = await Member.findByPk(husband_id);
      const wife = await Member.findByPk(wife_id);
      
      if (!husband || !wife || husband.gender !== 'male' || wife.gender !== 'female') {
        continue; // Skip this marriage if gender combination is invalid
      }
      
      // Check if the same husband and wife have already married before
      const existingMarriage = await ParentTable.findOne({
        where: {
          husband_id,
          wife_id
        }
      });
      
      if (existingMarriage) {
        continue; // Skip this marriage if already exists
      }
      
      // Determine status based on whether the requesting member is deceased
      const status = mainMember.deceased ? 'pending widowed' : 'pending';
      
      // Create a new marriage record in pending state
      const newMarriage = await ParentTable.create(
        { 
          husband_id, 
          wife_id, 
          marriage_date, 
          status, // Now using the status determined above
          requested_by: member_id 
        },
        { transaction: t }
      );
      
      createdMarriages.push(newMarriage);
    }
    
    // If no marriages were created successfully, rollback
    if (createdMarriages.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'None of the marriages could be created'
      });
    }

    await t.commit();
    res.status(201).json({
      success: true,
      message: `${createdMarriages.length} marriage requests created successfully`,
      data: createdMarriages
    });

  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Keep the existing controller methods
exports.createMarriage = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { husband_id, wife_id, marriage_date, requested_by } = req.body;

    // Verify both members exist
    const [husband, wife] = await Promise.all([
      Member.findByPk(husband_id),
      Member.findByPk(wife_id)
    ]);

    if (!husband || !wife) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'One or both members not found'
      });
    }

    // Verify gender
    if (husband.gender !== 'male' || wife.gender !== 'female') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid gender combination'
      });
    }

    // Check if the same husband and wife have already married before
    const existingMarriage = await ParentTable.findOne({
      where: {
        husband_id,
        wife_id
      }
    });

    if (existingMarriage) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'This couple is already married and cannot remarry'
      });
    }

    // Find the requesting member to check if they are deceased
    const requestingMember = await Member.findByPk(requested_by);
    if (!requestingMember) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Requesting member not found'
      });
    }

    // Determine status based on deceased flag
    const status = requestingMember.deceased ? 'pending widowed' : 'pending';

    // Create a new marriage record
    const marriage = await ParentTable.create(
      { husband_id, wife_id, marriage_date, status, requested_by },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({
      success: true,
      data: marriage
    });

  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Modified to maintain multiple current marriages
exports.confirmMarriage = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params; // Marriage ID (ParentTable ID)
    const { responding_member_id } = req.body;

    // Find the pending marriage in the ParentTable
    const marriage = await ParentTable.findOne({
      where: {
        id,
        status: "pending",
      },
      transaction: t
    });

    if (!marriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Pending marriage request not found",
      });
    }

    // Fixed authorization check:
    // 1. Responding member must be part of the marriage (husband or wife)
    // 2. If there is a requester, the responding member should not be the requester
    if (
      (responding_member_id != marriage.husband_id && responding_member_id != marriage.wife_id) || 
      (marriage.requested_by && responding_member_id == marriage.requested_by)
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "You are not authorized to confirm this marriage request",
      });
    }

    // REMOVED: No longer setting other marriages to is_current: false
    // We now allow multiple current marriages

    // Confirm the marriage: update ParentTable
    await marriage.update(
      {
        status: "confirmed",
        is_current: true
      },
      { transaction: t }
    );

    // Get the husband and wife members
    const husband = await Member.findByPk(marriage.husband_id, { transaction: t });
    const wife = await Member.findByPk(marriage.wife_id, { transaction: t });

    if (!husband || !wife) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "One or both members of this marriage could not be found",
      });
    }

    // Update parent_id for husband using the helper method
    husband.addParentId(id);
    await husband.update({ 
      parent_id: husband.parent_id,
      marital_status: 'married' 
    }, { transaction: t });

    // Update parent_id for wife using the helper method
    wife.addParentId(id);
    await wife.update({ 
      parent_id: wife.parent_id,
      marital_status: 'married' 
    }, { transaction: t });

    await t.commit();
    res.status(200).json({
      success: true,
      message: "Marriage confirmed successfully, parent_id updated for both members",
      data: marriage,
    });

  } catch (error) {
    await t.rollback();
    console.error("Marriage confirmation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred while confirming the marriage",
    });
  }
};

// Remaining controller methods unchanged
exports.declineMarriage = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { responding_member_id } = req.body;
    
    // Find the pending marriage
    const marriage = await ParentTable.findOne({
      where: { 
        id,
        status: 'pending'
      }
    });
    
    if (!marriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending marriage request not found'
      });
    }
    
    // Fixed authorization check
    if (
      (responding_member_id != marriage.husband_id && responding_member_id != marriage.wife_id) ||
      (marriage.requested_by && responding_member_id == marriage.requested_by)
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this marriage request'
      });
    }
    
    // Delete the marriage record
    await marriage.destroy({ transaction: t });
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Marriage request declined successfully'
    });
    
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get pending marriage requests for a specific member
exports.getMarriageRequests = async (req, res) => {
  try {
    const memberId = req.params.memberId;
    
    // Find pending marriage requests where the member is either husband or wife
    const pendingRequests = await ParentTable.findAll({
      attributes: ['id', 'status', 'husband_id', 'wife_id', 'requested_by', 'marriage_date'],
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId },
        ],
        status: 'pending'
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
    
    res.status(200).json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Error fetching marriage requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get member with all marriage history
exports.getMemberMarriages = async (req, res) => {
  try {
    const { id } = req.params;
    
    const member = await Member.findByPk(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Get all marriages from parent_id array
    const parentIds = member.parent_id;
    
    let marriages = [];
    if (parentIds && parentIds.length > 0) {
      marriages = await ParentTable.findAll({
        where: { 
          id: {
            [Op.in]: parentIds
          }
        },
        include: [
          {
            model: Member,
            as: 'husband',
            attributes: ['id', 'first_name', 'last_name', 'profile_image', 'deceased']
          },
          {
            model: Member,
            as: 'wife',
            attributes: ['id', 'first_name', 'last_name', 'profile_image', 'deceased']
          },
          {
            model: Member,
            as: 'deceasedSpouse',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }
    
    // Get all current marriages (can be multiple now)
    const currentMarriages = marriages.filter(m => m.is_current) || [];
    
    res.status(200).json({
      success: true,
      data: {
        member,
        marriages,
        current_marriages: currentMarriages
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};