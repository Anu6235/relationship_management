const { Member, sequelize, ParentTable } = require('../models');
const { Op } = require('sequelize');

// Create divorce request for existing marriage
exports.createDivorceExisting = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { marriage_id, divorce_date, requested_by } = req.body;

    // Find the existing marriage
    const existingMarriage = await ParentTable.findOne({
      where: {
        id: marriage_id,
        status: 'confirmed'
      },
      transaction: t
    });

    if (!existingMarriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Confirmed marriage record not found'
      });
    }

    // Update to pending divorce
    const divorce = await existingMarriage.update({
      status: 'pending divorce',
      divorce_date,
      requested_by
    }, { transaction: t });

    await t.commit();
    res.status(200).json({
      success: true,
      data: divorce
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

// Create divorce request for marriage not in system
exports.createDivorceNew = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { husband_id, wife_id, marriage_date, divorce_date, requested_by } = req.body;

    if (!marriage_date) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Marriage date is required for new divorce entries'
      });
    }

    // Verify both members exist
    const [husband, wife] = await Promise.all([
      Member.findByPk(husband_id, { transaction: t }),
      Member.findByPk(wife_id, { transaction: t })
    ]);

    if (!husband || !wife) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'One or both members not found'
      });
    }

    // Verify gender - keeping consistent with marriage route
    if (husband.gender !== 'male' || wife.gender !== 'female') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid gender combination'
      });
    }

    // Check if any marriage record exists between these members
    const existingMarriage = await ParentTable.findOne({
      where: {
        husband_id,
        wife_id
      },
      transaction: t
    });

    if (existingMarriage) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'A marriage record already exists for this couple. Use /divorce/existing endpoint instead.'
      });
    }

    // Create new parent table entry with pending divorce status
    const divorce = await ParentTable.create(
      {
        husband_id,
        wife_id,
        marriage_date,
        divorce_date,
        status: 'pending divorce',
        requested_by,
        is_current: true
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({
      success: true,
      data: divorce
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

// Confirm divorce request
exports.confirmDivorce = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { responding_member_id, marriage_date } = req.body;

    // Find the pending divorce
    const divorce = await ParentTable.findOne({
      where: {
        id,
        status: 'pending divorce'
      },
      transaction: t
    });

    if (!divorce) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending divorce request not found'
      });
    }

    // Ensure the responding member is part of this marriage but not the initiator
    if (
      (responding_member_id != divorce.husband_id && responding_member_id != divorce.wife_id) ||
      responding_member_id != divorce.requested_by
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to confirm this divorce request'
      });
    }

    // If this is a new entry without marriage date, update it
    if (!divorce.marriage_date && marriage_date) {
      await divorce.update({ marriage_date }, { transaction: t });
    } else if (!divorce.marriage_date && !marriage_date) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Marriage date is required to confirm this divorce'
      });
    }

    // Confirm the divorce
    await divorce.update(
      {
        status: 'divorced',
        is_current: false
      },
      { transaction: t }
    );

    // Get the husband and wife members
    const [husband, wife] = await Promise.all([
      Member.findByPk(divorce.husband_id, { transaction: t }),
      Member.findByPk(divorce.wife_id, { transaction: t })
    ]);

    if (!husband || !wife) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'One or both members of this marriage could not be found'
      });
    }

    // Update parent_id for both members
    husband.addParentId(id);
    wife.addParentId(id);

    // Update marital status
    await Promise.all([
      husband.update({
        parent_id: husband.parent_id,
        marital_status: 'divorced'
      }, { transaction: t }),
      wife.update({
        parent_id: wife.parent_id,
        marital_status: 'divorced'
      }, { transaction: t })
    ]);

    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Divorce confirmed successfully, marital status updated for both members',
      data: divorce
    });

  } catch (error) {
    await t.rollback();
    console.error('Divorce confirmation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while confirming the divorce'
    });
  }
};

// Decline divorce request
exports.declineDivorce = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { responding_member_id } = req.body;

    // Find the pending divorce
    const divorceRequest = await ParentTable.findOne({
      where: {
        id,
        status: 'pending divorce'
      },
      transaction: t
    });

    if (!divorceRequest) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending divorce request not found'
      });
    }

    // Verify that the responding member is part of this marriage and not the initiator
    if (
      (responding_member_id != divorceRequest.husband_id && responding_member_id != divorceRequest.wife_id) ||
      responding_member_id != divorceRequest.requested_by
    ) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this divorce request'
      });
    }

    // Check if this was a modification to an existing marriage or a new entry
    const wasExistingRecord = await ParentTable.findOne({
      where: {
        id: divorceRequest.id,
        status: { [Op.ne]: 'pending divorce' }
      },
      paranoid: true,
      transaction: t
    });

    if (wasExistingRecord) {
      // This was an update to an existing marriage, revert to 'confirmed'
      await divorceRequest.update({
        status: 'confirmed',
        divorce_date: null
      }, { transaction: t });
    } else {
      // This was a new entry, delete it
      await divorceRequest.destroy({ transaction: t });
    }

    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Divorce request declined successfully'
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

// Get pending divorce requests for a specific member
exports.getDivorceRequests = async (req, res) => {
    try {
      const memberId = req.params.memberId;
      
      // Find pending divorce requests where the member is either husband or wife
      const pendingRequests = await ParentTable.findAll({
        where: {
          [Op.or]: [
            { husband_id: memberId },
            { wife_id: memberId }
          ],
          status: 'pending divorce'
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
      console.error('Error fetching divorce requests:', error);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  };