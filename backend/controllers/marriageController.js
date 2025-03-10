const { Member, sequelize, ParentTable } = require('../models');
const { Op } = require('sequelize');

// Create a new marriage
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

    // Create a new marriage record
    const marriage = await ParentTable.create(
      { husband_id, wife_id, marriage_date, status: 'pending', requested_by },
      { transaction: t }
    );

    // Update the parent_id in the members table
    await Promise.all([
      husband.update({ parent_id: marriage.id }, { transaction: t }),
      wife.update({ parent_id: marriage.id }, { transaction: t })
    ]);

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

// Confirm the marriage and update parent_id
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

    console.log(marriage.husband_id,'marriage.husband_id')
    console.log(marriage.wife_id,'marriage.wife_id')
    console.log(marriage.requested_by,'marriage.requested_by')
    console.log(responding_member_id,'responding_member_id')

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

    // Check if there's already an active marriage for each party
    // and make it no longer current if it exists
    await ParentTable.update(
      { is_current: false },
      { 
        where: {
          [Op.or]: [
            { husband_id: marriage.husband_id, is_current: true, status: 'confirmed' },
            { wife_id: marriage.wife_id, is_current: true, status: 'confirmed' }
          ]
        },
        transaction: t 
      }
    );

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

// Decline a marriage request
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
          // {id : id}
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
    console.log(pendingRequests,'pendingRequests')
    
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

// Add route to get member with all marriage history
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
    
    // Get current marriage
    const currentMarriage = marriages.find(m => m.is_current) || null;
    
    res.status(200).json({
      success: true,
      data: {
        member,
        marriages,
        current_marriage: currentMarriage
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
