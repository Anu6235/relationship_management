const cron = require('node-cron');
const { LedgerType, Member, Ledger } = require('../models');
const { Op } = require('sequelize');

// Function to generate ledgers for a specific ledger type
async function generateLedgersForType(ledgerType) {
  try {
    if (!ledgerType.is_active) {
      console.log(`Ledger type ${ledgerType.name} is inactive, skipping generation`);
      return;
    }
    
   // Check if a ledger has been created recently for this type
   const lastLedger = await Ledger.findOne({
    where: { ledger_type_id: ledgerType.id },
    order: [['invoice_created_at', 'DESC']]
  });
  
  if (lastLedger) {
    const now = new Date();
    const lastCreationTime = new Date(lastLedger.invoice_created_at);
    
    // Calculate duration in milliseconds
    let durationMs = 0;
    switch (ledgerType.duration_unit) {
      case 'minute':
        durationMs = ledgerType.duration_value * 60 * 1000;
        break;
      case 'hour':
        durationMs = ledgerType.duration_value * 60 * 60 * 1000;
        break;
      case 'day':
        durationMs = ledgerType.duration_value * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        // Approximate a month as 30 days
        durationMs = ledgerType.duration_value * 30 * 24 * 60 * 60 * 1000;
        break;
    }
    
    const elapsedMs = now.getTime() - lastCreationTime.getTime();
    if (elapsedMs < durationMs) {
      console.log(`Skipping ledger generation for ${ledgerType.name} - Not enough time has passed`);
      return;
    }
  }
  
  // Build conditions from condition_config
  const conditions = ledgerType.condition_config || {};
  const whereClause = {};
  
  // Map the conditions from the config to the database fields
  Object.keys(conditions).forEach(key => {
    // Handle special case for 'deceased'
    if (key === 'deceased') {
      const boolValue = conditions[key].toLowerCase() === 'no' ? false : true;
      whereClause[key] = boolValue;
    } else {
      whereClause[key] = conditions[key];
    }
  });
  
  // Find members that match the conditions
  const members = await Member.findAll({ where: whereClause });
  
  if (members.length === 0) {
    console.log(`No eligible members found for ledger type: ${ledgerType.name}`);
    return;
  }
    
    // Generate ledgers for each eligible member using a for loop
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' }).toLowerCase();
    const year = now.getFullYear();
    const ledger_name = `${ledgerType.name.toLowerCase()}-${month}-${year}`;
    
    const createdLedgers = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      
      // Calculate due date based on the ledger type configuration
      const due_date = ledgerType.calculateDueDate ? 
        ledgerType.calculateDueDate(now) : 
        new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // Default to 30 days if calculateDueDate not implemented
      
      const ledger = await Ledger.create({
        ledger_type_id: ledgerType.id,
        ledger_name,
        member_id: member.id,
        invoice_created_at: now,
        due_date,
        amount: ledgerType.amount,
        fee: 0, // Initial fee is 0
        total_amount: ledgerType.amount,
        invoice_status: 1 // Pending
      });
      
      createdLedgers.push(ledger);
    }
    
    console.log(`Created ${createdLedgers.length} ledgers for ledger type: ${ledgerType.name}`);
    
    return createdLedgers.length;
  } catch (error) {
    console.error(`Error generating ledgers for type ${ledgerType.name}:`, error);
    throw error;
  }
}

// Function to check if a ledger should be generated based on its schedule
async function shouldGenerateLedger(ledgerType) {
  if (!ledgerType.auto_generate) {
    console.log(`Auto-generation disabled for ledger type: ${ledgerType.name}`);
    return false;
  }

  const now = new Date();
  const startDate = new Date(ledgerType.start_date);

  // Prevent ledger generation before the start date
  if (now < startDate) {
    console.log(`Skipping ledger generation for ${ledgerType.name} - Start date not reached`);
    return false;
  }

  // Check when the last ledger was created for this type
  const lastLedger = await Ledger.findOne({
    where: { ledger_type_id: ledgerType.id },
    order: [['invoice_created_at', 'DESC']]
  });

  if (!lastLedger) {
    return true; // No previous ledger exists, allow generation
  }

  // Calculate if enough time has passed based on duration settings
  const lastCreationTime = new Date(lastLedger.invoice_created_at);
  let durationMs = 0;

  switch (ledgerType.duration_unit) {
    case 'minute':
      durationMs = ledgerType.duration_value * 60 * 1000;
      break;
    case 'hour':
      durationMs = ledgerType.duration_value * 60 * 60 * 1000;
      break;
    case 'day':
      durationMs = ledgerType.duration_value * 24 * 60 * 60 * 1000;
      break;
    case 'month':
      durationMs = ledgerType.duration_value * 30 * 24 * 60 * 60 * 1000;
      break;
  }

  const elapsedMs = now.getTime() - lastCreationTime.getTime();
  return elapsedMs >= durationMs;
}


// Set up scheduler with toggle functionality
let schedulerJob = null;

function startScheduler(frequency = '*/5 * * * *') { // Default to every 5 minutes
  if (schedulerJob) {
    console.log('Scheduler already running, stopping current one before starting new');
    stopScheduler();
  }
  
  console.log(`Starting ledger scheduler with frequency: ${frequency}`);
  
  schedulerJob = cron.schedule(frequency, async () => {
    try {
      console.log('Running scheduled ledger generation check...');
      
      // Get all active ledger types with auto-generation enabled
      const ledgerTypes = await LedgerType.findAll({
        where: { 
          is_active: true,
          auto_generate: true
        }
      });
      
      for (const ledgerType of ledgerTypes) {
        const canGenerate = await shouldGenerateLedger(ledgerType);
        
        if (canGenerate) {
          console.log(`Generating ledgers for type: ${ledgerType.name}`);
          await generateLedgersForType(ledgerType);
        } else {
          console.log(`Skipping ledger generation for: ${ledgerType.name}`);
        }
      }
    } catch (error) {
      console.error('Error in ledger scheduler:', error);
    }
  });
  
  console.log('Ledger scheduler initialized and running');
  return true;
}

function stopScheduler() {
  if (schedulerJob) {
    schedulerJob.stop();
    schedulerJob = null;
    console.log('Ledger scheduler stopped');
    return true;
  }
  console.log('No scheduler running');
  return false;
}

function isSchedulerRunning() {
  return schedulerJob !== null;
}

// Initialize scheduler on startup with default frequency
function setupLedgerScheduler(autoStart = true, frequency = '*/5 * * * *') {
  if (autoStart) {
    startScheduler(frequency);
  }
  
  console.log('Ledger scheduler setup complete');
}

module.exports = {
  setupLedgerScheduler,
  generateLedgersForType,
  startScheduler,
  stopScheduler,
  isSchedulerRunning
};