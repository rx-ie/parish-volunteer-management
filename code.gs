/**
 * FIAT Roster - Google Apps Script Backend Engine
 */

// ==========================================
// 1. WEB APP ROUTING HANDLERS
// ==========================================

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('FIAT Parish Rostering Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getAdminDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Roster_Entries');
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  // Remove header row and format as objects
  const headers = values.shift();
  return values.map(row => {
    let entry = {};
    headers.forEach((h, i) => entry[h] = row[i]);
    return entry;
  });
}

// ==========================================
// 2. CORE AUTO-ROSTERING OPTIMIZATION ENGINE
// ==========================================

function generateMonthlyRoster() {
  const slots = getUnfilledMassSlots();
  const volunteers = getActiveVolunteers();
  const availability = getAvailabilityMap();
  
  let rosterOutput = [];

  // Sort slots by hardest to fill first
  slots.sort((a, b) => a.availableCandidatesCount - b.availableCandidatesCount);

  for (let slot of slots) {
    let eligibleVolunteers = [];

    for (let vol of volunteers) {
      // 1. Evaluate Hard Constraints
      if (!vol.roles.includes(slot.requiredRole)) continue;
      if (vol.servesThisMonth >= vol.maxServesMonth) continue;
      if (hasTimeConflict(vol.id, slot.massDatetime, rosterOutput)) continue;
      if (!isAvailable(vol.id, slot.id, availability)) continue;

      // 2. Calculate Soft Constraint Score
      let score = 0;
      score += (10 - vol.servesThisMonth) * 5; // Fairness weight
      score += getDaysSinceLastServed(vol.lastServedDate, slot.massDatetime) * 2; // Recency weight
      if (availability[vol.id + '_' + slot.id] === 'PREFERRED') score += 10; // Preference weight

      eligibleVolunteers.push({ volunteer: vol, score: score });
    }

    // Sort eligible candidates by highest score
    eligibleVolunteers.sort((a, b) => b.score - a.score);

    // Assign top candidate(s) to fill the slot requirement
    if (eligibleVolunteers.length > 0) {
      let selected = eligibleVolunteers[0].volunteer;
      
      rosterOutput.push({
        slotId: slot.id,
        volunteerId: selected.id,
        status: 'ASSIGNED'
      });

      // Update state tracking in-memory
      selected.servesThisMonth += 1;
      selected.lastServedDate = slot.massDatetime;
    } else {
      // Flag unassigned slots for administrative review
      rosterOutput.push({
        slotId: slot.id,
        volunteerId: 'UNASSIGNED',
        status: 'UNFILLED_ALERT'
      });
    }
  }

  saveRosterToSheet(rosterOutput);
  return { success: true, count: rosterOutput.length };
}

// ==========================================
// 3. HELPER & DATA ACCESS FUNCTIONS
// ==========================================

function getUnfilledMassSlots() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Mass_Slots');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  rows.shift(); // Remove headers
  
  return rows.map(r => ({
    id: r[0],
    massDatetime: new Date(r[1]),
    requiredRole: r[2],
    availableCandidatesCount: r[3] || 0
  }));
}

function getActiveVolunteers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Volunteers');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  rows.shift();
  
  return rows.map(r => ({
    id: r[0],
    name: r[1],
    roles: String(r[2]).split(',').map(s => s.trim()),
    maxServesMonth: Number(r[3]),
    servesThisMonth: Number(r[4]) || 0,
    lastServedDate: r[5] ? new Date(r[5]) : new Date(0)
  }));
}

function getAvailabilityMap() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Availability');
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  rows.shift();
  
  let map = {};
  rows.forEach(r => {
    map[r[0] + '_' + r[1]] = r[2]; // Key: volunteerId_slotId -> Value: AVAILABLE/PREFERRED
  });
  return map;
}

function isAvailable(volId, slotId, availabilityMap) {
  const status = availabilityMap[volId + '_' + slotId];
  return status === 'AVAILABLE' || status === 'PREFERRED';
}

function hasTimeConflict(volId, massDatetime, currentRoster) {
  // Check if volunteer is already booked for another slot at the exact same time
  return currentRoster.some(entry => entry.volunteerId === volId && entry.slotDatetime === massDatetime);
}

function getDaysSinceLastServed(lastServedDate, currentSlotDate) {
  if (!lastServedDate || lastServedDate.getTime() === 0) return 30; // Default high priority if never served
  const diffTime = Math.abs(currentSlotDate - lastServedDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function saveRosterToSheet(rosterOutput) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Roster_Entries');
  if (!sheet) return;
  
  // Clear existing assignments except header
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  }
  
  // Prepare rows for bulk insert
  const rowsToInsert = rosterOutput.map(r => [r.slotId, r.volunteerId, r.status]);
  if (rowsToInsert.length > 0) {
    sheet.getRange(2, 1, rowsToInsert.length, 3).setValues(rowsToInsert);
  }
}
