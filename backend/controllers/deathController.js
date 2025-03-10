const { Member, ParentTable, sequelize, Op } = require('../models');

// Make marriage as widowed
exports.markMarriageWidowed = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { deceased_spouse_id, death_date } = req.body;
    
    // Find the confirmed marriage
    const marriage = await ParentTable.findOne({
      where: { 
        id,
        status: 'confirmed'
      },
      include: [
        { model: Member, as: 'husband' },
        { model: Member, as: 'wife' }
      ]
    });
    
    if (!marriage) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Confirmed marriage not found'
      });
    }
    
    // Validate that deceased_spouse_id is part of this marriage
    if (deceased_spouse_id != marriage.husband_id && deceased_spouse_id != marriage.wife_id) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Deceased spouse ID must match husband or wife in this marriage'
      });
    }
    
    // Get surviving spouse ID
    const survivingSpouseId = deceased_spouse_id == marriage.husband_id ? 
      marriage.wife_id : marriage.husband_id;
    
    // Update marriage status to widowed
    await marriage.update({
      status: 'widowed',
      death_date: death_date || new Date(),
      deceased_spouse_id,
      is_current: false
    }, { transaction: t });
    
    // Update deceased member status
    await Member.update(
      { 
        deceased: true,
        marital_status: 'widowed'
      },
      { 
        where: { id: deceased_spouse_id },
        transaction: t 
      }
    );
    
    // Update surviving spouse marital status
    await Member.update(
      { marital_status: 'widowed' },
      { 
        where: { id: survivingSpouseId },
        transaction: t 
      }
    );
    
    await t.commit();
    res.status(200).json({
      success: true,
      message: 'Widowed status recorded successfully',
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

// Update member as deceased
exports.markMemberDeceased = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { death_date } = req.body;
    
    const member = await Member.findByPk(id);
    
    if (!member) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Mark member as deceased
    await member.update({
      deceased: true,
      marital_status: member.marital_status === 'married' ? 'widowed' : member.marital_status
    }, { transaction: t });
    
    // Find all active marriages where this member is a spouse
    const marriages = await ParentTable.findAll({
      where: {
        [Op.or]: [
          { husband_id: id, status: 'confirmed' },
          { wife_id: id, status: 'confirmed' }
        ]
      }
    });
    
    // Update each marriage and surviving spouse
    for (const marriage of marriages) {
      // Determine surviving spouse
      const survivingSpouseId = marriage.husband_id == id ? 
        marriage.wife_id : marriage.husband_id;
      
      // Update marriage
      await marriage.update({
        status: 'widowed',
        death_date: death_date || new Date(),
        deceased_spouse_id: id,
        is_current: false
      }, { transaction: t });
      
      // Update surviving spouse status
      await Member.update(
        { marital_status: 'widowed' },
        { 
          where: { id: survivingSpouseId },
          transaction: t 
        }
      );
    }
    
    await t.commit();
    
    res.status(200).json({
      success: true,
      message: 'Member marked as deceased and all marriages updated',
      data: {
        member,
        affected_marriages: marriages.length
      }
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
