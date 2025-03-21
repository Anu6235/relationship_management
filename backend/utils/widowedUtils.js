const { Member, ParentTable } = require('../models');
const { Op } = require('sequelize');

// Utility function to update marriage status when a member is marked as deceased
exports.updateMarriageStatusOnDeath = async (memberId, deathDate, transaction) => {
  try {
    // Find all current marriages where this member is involved
    const currentMarriages = await ParentTable.findAll({
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
        ],
        status: 'confirmed',
        is_current: true
      },
      include: [
        {
          model: Member,
          as: 'husband',
          attributes: ['id', 'first_name', 'last_name', 'deceased']
        },
        {
          model: Member,
          as: 'wife',
          attributes: ['id', 'first_name', 'last_name', 'deceased']
        }
      ],
      transaction
    });

    // Process each marriage
    const updatedMarriages = [];
    
    for (const marriage of currentMarriages) {
      // If this marriage is in divorce status, skip it
      if (marriage.status === 'pending divorce' || marriage.status === 'divorced') {
        continue;
      }
      
      // Determine the alive spouse
let aliveSpouse = null;

if (marriage.husband_id === memberId && !marriage.wife.deceased) {
  aliveSpouse = marriage.wife;  // Use the already loaded wife model
} else if (marriage.wife_id === memberId && !marriage.husband.deceased) {
  aliveSpouse = marriage.husband;  // Use the already loaded husband model
}

// If there's an alive spouse, update their status to widowed
if (aliveSpouse) {
  // Update the marriage status to widowed
  await marriage.update({
    status: 'widowed',
    death_date: deathDate,
    deceased_spouse_id: memberId
  }, { transaction });
  
  // Update the alive spouse's status to widowed
  await aliveSpouse.update({
    marital_status: 'widowed'
  }, { transaction });
  
  updatedMarriages.push({
    marriageId: marriage.id,
    aliveSpouseId: aliveSpouse.id
  });
}
    }

    return updatedMarriages;
  } catch (error) {
    console.error('Error updating marriage status on death:', error);
    throw error;
  }
};

// Utility function to check if a member has any current marriages
exports.hasActiveMarriage = async (memberId) => {
  try {
    const count = await ParentTable.count({
      where: {
        [Op.or]: [
          { husband_id: memberId },
          { wife_id: memberId }
        ],
        status: 'confirmed',
        is_current: true
      }
    });
    
    return count > 0;
  } catch (error) {
    console.error('Error checking active marriages:', error);
    throw error;
  }
};