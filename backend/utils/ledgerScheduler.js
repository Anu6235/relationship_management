const cron = require('node-cron');
const { LedgerType, Member, Ledger } = require('../models');
const { Op } = require('sequelize');

// Function to generate ledgers for a specific ledger type
async function generateLedgersForType(ledgerType) {
  try {
    console.log(`Attempting to generate ledgers for ${ledgerType.name}`);
    
    if (!ledgerType.is_active) {
      console.log(`Ledger type ${ledgerType.name} is inactive, skipping generation`);
      return 0;
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
      return 0;
    }
      
    // Generate ledgers for each eligible member
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' }).toLowerCase();
    const year = now.getFullYear();
    const ledger_name = `${ledgerType.name.toLowerCase()}-${month}-${year}`;
    
    // Find the current period start time
    const lastGenerationTime = await getLastGenerationTime(ledgerType.id);
    const currentPeriodStartTime = calculateCurrentPeriodStartTime(lastGenerationTime, ledgerType);
    
    // Skip if it's not time to generate a new ledger yet
    if (now < currentPeriodStartTime) {
      console.log(`Not time to generate new ledgers for ${ledgerType.name} yet`);
      return 0;
    }
    
    // Use a more specific name that includes the time period
    const periodIdentifier = formatPeriodIdentifier(currentPeriodStartTime, ledgerType);
    const specific_ledger_name = `${ledgerType.name.toLowerCase()}-${periodIdentifier}`;
    
    const createdLedgers = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      
      // Check if this member already has a ledger for this specific period
      const existingLedger = await Ledger.findOne({
        where: {
          ledger_type_id: ledgerType.id,
          member_id: member.id,
          ledger_name: specific_ledger_name
        }
      });
      
      if (existingLedger) {
        console.log(`Skipping ledger creation for member ${member.id} - already has ledger for ${specific_ledger_name}`);
        continue;
      }
      
      // Calculate due date based on the ledger type configuration
      const due_date = ledgerType.calculateDueDate ? 
        ledgerType.calculateDueDate(now) : 
        new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // Default to 30 days
      
      const ledger = await Ledger.create({
        ledger_type_id: ledgerType.id,
        ledger_name: specific_ledger_name,
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

// Function to get the last generation time for a ledger type
async function getLastGenerationTime(ledgerTypeId) {
  try {
    const lastLedger = await Ledger.findOne({
      where: { ledger_type_id: ledgerTypeId },
      order: [['invoice_created_at', 'DESC']]
    });
    
    if (!lastLedger) {
      return null;
    }
    
    return new Date(lastLedger.invoice_created_at);
  } catch (error) {
    console.error(`Error getting last generation time for ledger type ${ledgerTypeId}:`, error);
    return null;
  }
}

// Function to calculate the start time of the current period
function calculateCurrentPeriodStartTime(lastGenerationTime, ledgerType) {
  const now = new Date();
  
  if (!lastGenerationTime) {
    // If there's no previous generation, use the ledger type's start date or current time
    return ledgerType.start_date || now;
  }
  
  // Calculate the time interval in milliseconds
  let intervalMs = 0;
  switch (ledgerType.duration_unit) {
    case 'minute':
      intervalMs = ledgerType.duration_value * 60 * 1000;
      break;
    case 'hour':
      intervalMs = ledgerType.duration_value * 60 * 60 * 1000;
      break;
    case 'day':
      intervalMs = ledgerType.duration_value * 24 * 60 * 60 * 1000;
      break;
    case 'month':
      // Approximate a month as 30 days
      intervalMs = ledgerType.duration_value * 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      intervalMs = 0;
  }
  
  if (intervalMs === 0) {
    return now;
  }
  
  // Calculate how many intervals have passed since the last generation
  const timeSinceLastGeneration = now.getTime() - lastGenerationTime.getTime();
  const intervalsPassed = Math.floor(timeSinceLastGeneration / intervalMs);
  
  if (intervalsPassed < 1) {
    // Not enough time has passed for a new interval
    return new Date(lastGenerationTime.getTime() + intervalMs);
  }
  
  // Calculate the start of the next interval
  return new Date(lastGenerationTime.getTime() + (intervalsPassed * intervalMs));
}

// Function to format period identifier based on the start time and ledger type
function formatPeriodIdentifier(startTime, ledgerType) {
  const date = startTime.toISOString().split('T')[0];
  const time = startTime.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  switch (ledgerType.duration_unit) {
    case 'minute':
      return `${date}-${time}-${ledgerType.duration_value}min`;
    case 'hour':
      return `${date}-${time.split(':')[0]}h-${ledgerType.duration_value}hr`;
    case 'day':
      return `${date}-${ledgerType.duration_value}day`;
    case 'month':
      return `${startTime.getFullYear()}-${(startTime.getMonth() + 1).toString().padStart(2, '0')}-${ledgerType.duration_value}mon`;
    default:
      return `${date}-${time}`;
  }
}

// Function to check if we should generate a ledger based on duration settings
async function shouldGenerateLedger(ledgerType) {
  try {
    // If ledger type is not active, don't generate
    if (!ledgerType.is_active) {
      return false;
    }
    
    // Get the last generation time
    const lastGenerationTime = await getLastGenerationTime(ledgerType.id);
    
    // If no ledgers exist yet, should generate
    if (!lastGenerationTime) {
      return true;
    }
    
    const now = new Date();
    
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
    
    // Check if enough time has passed since the last generation
    const nextGenerationTime = new Date(lastGenerationTime.getTime() + durationMs);
    return now >= nextGenerationTime;
  } catch (error) {
    console.error(`Error checking if should generate ledger for type ${ledgerType.name}:`, error);
    return false;
  }
}

// Maintain scheduler job reference
let schedulerJob = null;

// Function to start the scheduler
function startScheduler(frequency = '*/1 * * * *') {
  console.log('📌 startScheduler function is called');
  
  if (schedulerJob) {
    console.log('⚠️ Scheduler is already running');
    return;
  }

  schedulerJob = cron.schedule(frequency, async () => {
    console.log(`🕒 Running scheduled job at ${new Date().toISOString()}`);

    try {
      console.log('🔄 Running ledger generation job...');
      const ledgerTypes = await LedgerType.findAll({ where: { is_active: true } });

      console.log(`✅ Found ${ledgerTypes.length} active ledger types`);

      for (const ledgerType of ledgerTypes) {
        const shouldGenerate = await shouldGenerateLedger(ledgerType);
        console.log(`🔎 Checking ledger type: ${ledgerType.name}, should run: ${shouldGenerate}`);

        if (shouldGenerate) {
          console.log(`⏳ Creating ledger for type: ${ledgerType.name}`);
          await generateLedgersForType(ledgerType);
          console.log(`✅ Ledger generated for: ${ledgerType.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in ledger scheduler:', error);
    }
  });

  console.log('📢 Scheduler is now running...');
}

// Function to stop the scheduler
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

// Function to check if scheduler is running
function isSchedulerRunning() {
  return schedulerJob !== null;
}

// Initialize scheduler on startup
function setupLedgerScheduler(autoStart = true, frequency = '*/1 * * * *') {
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
  isSchedulerRunning,
  shouldGenerateLedger
};