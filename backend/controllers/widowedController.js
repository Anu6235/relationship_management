const { Member, sequelize, ParentTable } = require('../models');
const { Op } = require('sequelize');

// Create a single widowed record
exports.createWidowed = async (req, res) => {
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

    // Check if the opposite member is alive
    const requestingMember = requested_by === husband_id ? husband : wife;
    const oppositeMember = requested_by === husband_id ? wife : husband;

    if (!oppositeMember.deceased) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot create widowed request when the spouse is still alive'
      });
    }

    // Create a new widowed record with pending status
    const widowedRecord = await ParentTable.create(
      { 
        husband_id, 
        wife_id, 
        marriage_date, 
        status: 'pending widowed', 
        requested_by 
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({
      success: true,
      data: widowedRecord
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

// Create multiple widowed records at once
exports.createMultipleWidowed = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { widowed_records, member_id, gender } = req.body;
    
    if (!widowed_records || !Array.isArray(widowed_records) || widowed_records.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No widowed records provided'
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

    const createdRecords = [];

    // Process each widowed record in the array
    for (const record of widowed_records) {
      const { spouse_id, marriage_date } = record;
      
      const spouse = await Member.findByPk(spouse_id);
      if (!spouse) {
        continue; // Skip this record if spouse not found
      }
      
      // Check if the spouse is alive
      if (!spouse.deceased) {
        continue; // Skip this record if spouse is alive
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
        continue; // Skip this record if gender combination is invalid
      }
      
      // Create a new widowed record in pending state
      const newWidowedRecord = await ParentTable.create(
        { 
          husband_id, 
          wife_id, 
          marriage_date,
          status: 'pending widowed',
          requested_by: member_id 
        },
        { transaction: t }
      );
      
      createdRecords.push(newWidowedRecord);
    }
    
    // If no records were created successfully, rollback
    if (createdRecords.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'None of the widowed records could be created'
      });
    }

    await t.commit();
    res.status(201).json({
      success: true,
      message: `${createdRecords.length} widowed requests created successfully`,
      data: createdRecords
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

// Confirm a widowed record
exports.confirmWidowed = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params; // Widowed record ID (ParentTable ID)
    const { responding_member_id } = req.body;

    // Find the pending widowed record in the ParentTable
    const widowedRecord = await ParentTable.findOne({
      where: {
        id,
        status: "pending widowed",
      },
      transaction: t
    });

    if (!widowedRecord) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Pending widowed request not found",
      });
    }

    // Authorization check
    if (
      (responding_member_id != widowedRecord.husband_id && responding_member_id != widowedRecord.wife_id) || 
      (widowedRecord.requested_by && responding_member_id == widowedRecord.requested_by)
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "You are not authorized to confirm this widowed request",
      });
    }

    // Confirm the widowed record: update ParentTable
    await widowedRecord.update(
      {
        status: "widowed",
        is_current: false
      },
      { transaction: t }
    );

    // Get the husband and wife members
    const husband = await Member.findByPk(widowedRecord.husband_id, { transaction: t });
    const wife = await Member.findByPk(widowedRecord.wife_id, { transaction: t });

    if (!husband || !wife) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "One or both members of this marriage could not be found",
      });
    }

    // Determine who is the requester and who is the responder
    const requester = widowedRecord.requested_by;
    const responder = responding_member_id;

    // Update marital status - requester should be widowed, responder should be married
    if (husband.id === requester) {
      await husband.update({ marital_status: 'widowed' }, { transaction: t });
      await wife.update({ marital_status: 'married' }, { transaction: t });
    } else if (wife.id === requester) {
      await wife.update({ marital_status: 'widowed' }, { transaction: t });
      await husband.update({ marital_status: 'married' }, { transaction: t });
    } else {
      // Fallback - if for some reason the requester is neither husband nor wife
      await husband.update({ marital_status: 'widowed' }, { transaction: t });
      await wife.update({ marital_status: 'widowed' }, { transaction: t });
    }

    // Add this widowed record ID to both members' parent_id array
    husband.addParentId(id);
    await husband.update({ parent_id: husband.parent_id }, { transaction: t });

    wife.addParentId(id);
    await wife.update({ parent_id: wife.parent_id }, { transaction: t });

    await t.commit();
    res.status(200).json({
      success: true,
      message: "Widowed status confirmed successfully",
      data: widowedRecord,
    });

  } catch (error) {
    await t.rollback();
    console.error("Widowed confirmation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred while confirming the widowed status",
    });
  }
};

// Decline a widowed record
exports.declineWidowed = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { responding_member_id } = req.body;
    
    // Find the pending widowed record
    const widowedRecord = await ParentTable.findOne({
      where: { 
        id,
        status: 'pending widowed'
      }
    });
    
    if (!widowedRecord) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending widowed request not found'
      });
    }
    
    // Authorization check
    if (
      (responding_member_id != widowedRecord.husband_id && responding_member_id != widowedRecord.wife_id) ||
      (widowedRecord.requested_by && responding_member_id == widowedRecord.requested_by)
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this widowed request'
      });
    }
    
    // Delete the widowed record
    await widowedRecord.destroy({ transaction: t });
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Widowed request declined successfully'
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

// Get pending widowed requests for a specific member
exports.getWidowedRequests = async (req, res) => {
  try {
    const memberId = req.params.memberId;
    
    // Find pending widowed requests where the member is either husband or wife
    const pendingRequests = await ParentTable.findAll({
      attributes: ['id', 'status', 'husband_id', 'wife_id', 'requested_by', 'marriage_date'],
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId },
        ],
        status: 'pending widowed'
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
    console.error('Error fetching widowed requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get member with all widowed history
exports.getMemberWidowedHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const member = await Member.findByPk(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Get all widowed records from parent_id array
    const parentIds = member.parent_id;
    
    let widowedRecords = [];
    if (parentIds && parentIds.length > 0) {
      widowedRecords = await ParentTable.findAll({
        where: { 
          id: {
            [Op.in]: parentIds
          },
          status: 'confirmed widowed'
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
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        member,
        widowed_history: widowedRecords
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