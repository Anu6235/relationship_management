const { Member, sequelize, ParentTable } = require('../models');
const { Op } = require('sequelize');

// Hybrid controller for creating multiple relationship records of different types
exports.createHybridRelationships = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { marriages, divorces, widowed_records, member_id, gender } = req.body;
    
    if ((!marriages || !marriages.length) && 
        (!divorces || !divorces.length) && 
        (!widowed_records || !widowed_records.length)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No relationship records provided'
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

    const results = {
      marriages: [],
      divorces: [],
      widowed: []
    };
    
    const errors = {
      marriages: [],
      divorces: [],
      widowed: []
    };

    // Process marriages
    if (marriages && marriages.length > 0) {
      for (const marriage of marriages) {
        try {
          const { spouse_id, marriage_date } = marriage;
          
          const spouse = await Member.findByPk(spouse_id);
          if (!spouse) {
            errors.marriages.push({ spouse_id, message: 'Spouse not found' });
            continue;
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
            errors.marriages.push({ spouse_id, message: 'Invalid gender combination' });
            continue;
          }
          
          // Check if the same husband and wife have already married before
          const existingMarriage = await ParentTable.findOne({
            where: {
              husband_id,
              wife_id
            }
          });
          
          if (existingMarriage) {
            errors.marriages.push({ spouse_id, message: 'This couple is already married' });
            continue;
          }
          
          // Determine status based on whether the requesting member is deceased
          const status = mainMember.deceased ? 'pending widowed' : 'pending';
          
          // Create a new marriage record in pending state
          const newMarriage = await ParentTable.create(
            { 
              husband_id, 
              wife_id, 
              marriage_date, 
              status,
              requested_by: member_id 
            },
            { transaction: t }
          );
          
          results.marriages.push(newMarriage);
        } catch (error) {
          errors.marriages.push({ spouse_id: marriage.spouse_id, message: error.message });
        }
      }
    }

    // Process divorces (new divorces, not existing ones)
    if (divorces && divorces.length > 0) {
      for (const divorce of divorces) {
        try {
          const { spouse_id, marriage_date, divorce_date } = divorce;
          
          const spouse = await Member.findByPk(spouse_id);
          if (!spouse) {
            errors.divorces.push({ spouse_id, message: 'Spouse not found' });
            continue;
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
            errors.divorces.push({ spouse_id, message: 'Invalid gender combination' });
            continue;
          }

          // Check if any marriage record exists between these members
          const existingMarriage = await ParentTable.findOne({
            where: { husband_id, wife_id }
          });

          let divorcedRecord;
          if (existingMarriage) {
            // If marriage exists, check if it can be divorced
            if (existingMarriage.status === 'pending' || 
                existingMarriage.status === 'pending divorce' || 
                existingMarriage.status === 'divorced' ||
                existingMarriage.status === 'widowed') {
              errors.divorces.push({ 
                spouse_id, 
                message: `Cannot request divorce for marriage with status: ${existingMarriage.status}` 
              });
              continue;
            }
            
            // Update to pending divorce and store the original status
            divorcedRecord = await existingMarriage.update({
              status: 'pending divorce',
              original_status: existingMarriage.status,
              divorce_date,
              requested_by: member_id
            }, { transaction: t });
          } else {
            // Create new parent table entry with pending divorce status
            divorcedRecord = await ParentTable.create(
              {
                husband_id,
                wife_id,
                marriage_date,
                divorce_date,
                status: 'pending divorce',
                original_status: 'new',
                requested_by: member_id,
                is_current: true
              },
              { transaction: t }
            );
          }

          results.divorces.push(divorcedRecord);
        } catch (error) {
          errors.divorces.push({ spouse_id: divorce.spouse_id, message: error.message });
        }
      }
    }

    // Process widowed records
    if (widowed_records && widowed_records.length > 0) {
      for (const record of widowed_records) {
        try {
          const { spouse_id, marriage_date } = record;
          
          const spouse = await Member.findByPk(spouse_id);
          if (!spouse) {
            errors.widowed.push({ spouse_id, message: 'Spouse not found' });
            continue;
          }
          
          // Check if the spouse is deceased
          if (!spouse.deceased) {
            errors.widowed.push({ spouse_id, message: 'Cannot create widowed request when the spouse is still alive' });
            continue;
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
            errors.widowed.push({ spouse_id, message: 'Invalid gender combination' });
            continue;
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
          
          results.widowed.push(newWidowedRecord);
        } catch (error) {
          errors.widowed.push({ spouse_id: record.spouse_id, message: error.message });
        }
      }
    }
    
    // Check if any records were successfully created
    const totalSuccessful = results.marriages.length + results.divorces.length + results.widowed.length;
    if (totalSuccessful === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'None of the relationship records could be created',
        errors
      });
    }

    await t.commit();
    res.status(201).json({
      success: true,
      message: `Created ${results.marriages.length} marriages, ${results.divorces.length} divorces, and ${results.widowed.length} widowed records successfully`,
      data: results,
      errors: (errors.marriages.length || errors.divorces.length || errors.widowed.length) ? errors : undefined
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

// Process a life story with marriage, divorce, and widowed events all at once
exports.processLifeStory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { member_id, gender, life_events } = req.body;
    
    if (!life_events || !Array.isArray(life_events) || life_events.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No life events provided'
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

    const results = [];
    const errors = [];
    
    // Sort life events by date to process them chronologically
    const sortedEvents = [...life_events].sort((a, b) => {
      const dateA = new Date(a.event_date);
      const dateB = new Date(b.event_date);
      return dateA - dateB;
    });

    // Keep track of current spouses to handle sequential events properly
    const currentSpouses = new Map();
    
    for (const event of sortedEvents) {
      try {
        const { event_type, spouse_id, event_date, event_details } = event;
        
        if (!['marriage', 'divorce', 'widowed'].includes(event_type)) {
          errors.push({ event, message: 'Invalid event type. Must be marriage, divorce, or widowed.' });
          continue;
        }
        
        const spouse = await Member.findByPk(spouse_id);
        if (!spouse) {
          errors.push({ event, message: 'Spouse not found' });
          continue;
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
          errors.push({ event, message: 'Invalid gender combination' });
          continue;
        }
        
        let createdRecord;
        
        // Handle each event type
        switch (event_type) {
          case 'marriage':
            // Check if already married to this person
            if (currentSpouses.has(spouse_id)) {
              errors.push({ event, message: 'Already have an active marriage with this spouse' });
              continue;
            }
            
            // Check for existing records in the database
            const existingMarriage = await ParentTable.findOne({
              where: {
                husband_id,
                wife_id,
                status: { [Op.in]: ['pending', 'confirmed', 'pending widowed'] }
              }
            });
            
            if (existingMarriage) {
              errors.push({ event, message: 'A marriage record already exists for this couple' });
              continue;
            }
            
            // Create marriage record
            createdRecord = await ParentTable.create({
              husband_id,
              wife_id,
              marriage_date: event_date,
              status: 'pending',
              requested_by: member_id,
              is_current: true
            }, { transaction: t });
            
            // Add to current spouses
            currentSpouses.set(spouse_id, createdRecord.id);
            break;
            
          case 'divorce':
            // Check if married to this person
            if (!currentSpouses.has(spouse_id)) {
              // Check if there's a marriage record in the database
              const marriageToUpdate = await ParentTable.findOne({
                where: {
                  husband_id,
                  wife_id,
                  status: 'confirmed'
                }
              });
              
              if (marriageToUpdate) {
                // Divorce existing marriage
                createdRecord = await marriageToUpdate.update({
                  status: 'pending divorce',
                  original_status: marriageToUpdate.status,
                  divorce_date: event_date,
                  requested_by: member_id
                }, { transaction: t });
              } else {
                // Create new divorce record if no existing marriage
                createdRecord = await ParentTable.create({
                  husband_id,
                  wife_id,
                  marriage_date: event_date, // Using same date as placeholder
                  divorce_date: event_date,
                  status: 'pending divorce',
                  original_status: 'new',
                  requested_by: member_id,
                  is_current: true
                }, { transaction: t });
              }
            } else {
              // Get the marriage ID from current spouses map
              const marriageId = currentSpouses.get(spouse_id);
              
              // Find the marriage record
              const marriageRecord = await ParentTable.findByPk(marriageId);
              
              if (marriageRecord) {
                // Update to pending divorce
                createdRecord = await marriageRecord.update({
                  status: 'pending divorce',
                  original_status: marriageRecord.status,
                  divorce_date: event_date,
                  requested_by: member_id
                }, { transaction: t });
              }
              
              // Remove from current spouses
              currentSpouses.delete(spouse_id);
            }
            break;
            
          case 'widowed':
            // Check if spouse is deceased
            if (!spouse.deceased) {
              errors.push({ event, message: 'Cannot create widowed request when the spouse is still alive' });
              continue;
            }
            
            // Check if married to this person
            if (!currentSpouses.has(spouse_id)) {
              // Check if there's a marriage record in the database
              const existingRelation = await ParentTable.findOne({
                where: {
                  husband_id,
                  wife_id
                }
              });
              
              if (existingRelation && existingRelation.status === 'confirmed') {
                // Update existing marriage to widowed
                createdRecord = await existingRelation.update({
                  status: 'pending widowed',
                  requested_by: member_id
                }, { transaction: t });
              } else {
                // Create new widowed record
                createdRecord = await ParentTable.create({
                  husband_id,
                  wife_id,
                  marriage_date: event_date, // Using event date as marriage date too
                  status: 'pending widowed',
                  requested_by: member_id,
                  is_current: true
                }, { transaction: t });
              }
            } else {
              // Get the marriage ID from current spouses map
              const marriageId = currentSpouses.get(spouse_id);
              
              // Find the marriage record
              const marriageRecord = await ParentTable.findByPk(marriageId);
              
              if (marriageRecord) {
                // Update to pending widowed
                createdRecord = await marriageRecord.update({
                  status: 'pending widowed',
                  requested_by: member_id
                }, { transaction: t });
              }
              
              // Remove from current spouses
              currentSpouses.delete(spouse_id);
            }
            break;
        }
        
        if (createdRecord) {
          results.push({
            event_type,
            spouse_id,
            event_date,
            record: createdRecord
          });
        }
        
      } catch (error) {
        errors.push({ 
          event: event,
          message: error.message 
        });
      }
    }
    
    // Check if any records were successfully created
    if (results.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'None of the life events could be processed',
        errors
      });
    }

    await t.commit();
    res.status(201).json({
      success: true,
      message: `Successfully processed ${results.length} life events`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
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