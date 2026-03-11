/**
 * Borussia Minerals — Google Apps Script Automation
 *
 * Deployed in Google Sheet: 1hjnbb4tvyZCfrOyo2puVMxYWfUlI2NGgc_Z3Ew7dWB8
 *
 * Script Properties required:
 *   DISCORD_WEBHOOK_URL  — Discord channel webhook
 *   VERCEL_DEPLOY_HOOK   — Vercel deploy hook URL
 *   MAKE_WEBHOOK_URL     — Make.com webhook for Instagram posting
 *   DRIVE_ROOT_FOLDER    — Root Drive folder ID (1V-y4KOhhG8K3Z5Ppz-maPPmAEZYMCae1)
 *   LAST_DRIVE_CHECK     — ISO timestamp of last Drive scan (auto-managed)
 *
 * Triggers (created via setupTriggers):
 *   1. onSheetEdit       — installable onEdit, every edit
 *   2. watchDriveFolders — time-driven, every 15 minutes
 *   3. publishScheduledContent — time-driven, daily at 9 AM
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var SHEET_ID = '1hjnbb4tvyZCfrOyo2puVMxYWfUlI2NGgc_Z3Ew7dWB8';

/** Maps specimen IDs to their Drive folder names. */
var SPECIMEN_FOLDERS = {
  'cupr-001': 'cupr-001_Cuprite-on-Copper',
  'cupr-002': 'cupr-002_Cuprite-w-Copper',
  'chry-001': 'chry-001_Chrysocolla',
  'wulf-003': 'wulf-003_Wulfenite-Rowley',
  'azur-003': 'azur-003_Azurite-Selenite',
  'azur-004': 'azur-004_Azurite-Carlota',
  'azur-005': 'azur-005_Azurite-Morenci',
  'mala-002': 'mala-002_Malachite-Ajo',
  'azur-006': 'azur-006_Azurite-Metcalf',
  'wulf-004': 'wulf-004_Wulfenite-Congo'
};

/** Human-readable column names for the Inventory sheet (B=2 through J=10). */
var COLUMN_NAMES = {
  2:  'Name',
  3:  'Mineral',
  4:  'Locality',
  5:  'Size',
  6:  'Weight',
  7:  'Price',
  8:  'Description',
  9:  'Availability',
  10: 'Tags'
};

// Column indices (1-based)
var COL_ID              = 1;  // A — specimen ID
var COL_NAME            = 2;  // B — specimen name
var COL_AVAILABILITY    = 9;  // I — availability
var COL_IMAGE_IDS       = 11; // K — Drive file IDs (comma-separated)
var COL_PUBLISH_STATUS  = 13; // M — publish_status

// ---------------------------------------------------------------------------
// 1. onEdit Trigger
// ---------------------------------------------------------------------------

/**
 * Installable onEdit handler. Dispatches to inventory or copy-tab logic.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function onSheetEdit(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();

  if (sheetName === 'Sheet1') {
    handleInventoryEdit_(e);
  } else if (sheetName === 'Copy') {
    handleCopyEdit_(e);
  }
}

/**
 * Handles edits on the Inventory (Sheet1) tab.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function handleInventoryEdit_(e) {
  var range = e.range;
  var row   = range.getRow();
  var col   = range.getColumn();
  var sheet = range.getSheet();

  // Skip header row
  if (row < 2) return;

  var specimenName = sheet.getRange(row, COL_NAME).getValue();
  if (!specimenName) return;

  var newValue = String(e.value || range.getValue()).toLowerCase().trim();

  // Column I (availability) → sold / reserved notification
  if (col === COL_AVAILABILITY) {
    if (newValue === 'sold' || newValue === 'reserved') {
      postToDiscord('\uD83D\uDD34 ' + specimenName + ' marked as ' + newValue);
    }
    return;
  }

  // Column M (publish_status) → deploy + notification
  if (col === COL_PUBLISH_STATUS) {
    if (newValue === 'published') {
      triggerVercelRebuild();
      postToDiscord('\u2705 ' + specimenName + ' is now live on the store');
    }
    return;
  }

  // Columns B-J on a published specimen → ISR handles refresh, just notify
  if (col >= 2 && col <= 10) {
    var publishStatus = String(sheet.getRange(row, COL_PUBLISH_STATUS).getValue()).toLowerCase().trim();
    if (publishStatus === 'published') {
      var colName = getColumnName(col);
      postToDiscord('\uD83D\uDCDD ' + specimenName + ' updated: ' + colName + ' changed');
    }
  }
}

/**
 * Handles edits on the Copy tab. Triggers a rebuild and notifies Discord.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function handleCopyEdit_(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var row   = range.getRow();

  // Attempt to read key (col A) and page (col B) for context
  var key  = sheet.getRange(row, 1).getValue() || 'unknown';
  var page = sheet.getRange(row, 2).getValue() || 'unknown';

  triggerVercelRebuild();
  postToDiscord('\uD83D\uDCDD Site copy updated: ' + key + ' on ' + page);
}

// ---------------------------------------------------------------------------
// 2. Drive Watcher (every 15 min)
// ---------------------------------------------------------------------------

/**
 * Scans specimen Drive folders for new images since the last check.
 * Updates the sheet and notifies Discord.
 */
function watchDriveFolders() {
  var props       = PropertiesService.getScriptProperties();
  var rootId      = props.getProperty('DRIVE_ROOT_FOLDER');
  var lastCheckTs = props.getProperty('LAST_DRIVE_CHECK');
  var lastCheck   = lastCheckTs ? new Date(lastCheckTs) : new Date(0);

  if (!rootId) {
    Logger.log('DRIVE_ROOT_FOLDER not set — skipping Drive watch.');
    return;
  }

  var rootFolder = DriveApp.getFolderById(rootId);
  var ss         = SpreadsheetApp.openById(SHEET_ID);
  var sheet      = ss.getSheetByName('Sheet1');

  var specimenIds = Object.keys(SPECIMEN_FOLDERS);

  for (var i = 0; i < specimenIds.length; i++) {
    var specId     = specimenIds[i];
    var folderName = SPECIMEN_FOLDERS[specId];

    var folders = rootFolder.getFoldersByName(folderName);
    if (!folders.hasNext()) continue;

    var folder   = folders.next();
    var files    = folder.getFiles();
    var newFiles = [];

    while (files.hasNext()) {
      var file = files.next();
      if (file.getDateCreated() > lastCheck && isImageFile_(file)) {
        // Make publicly viewable
        file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
        newFiles.push(file.getId());
      }
    }

    if (newFiles.length === 0) continue;

    // Find the specimen row in the sheet
    var row = getSpecimenRow(sheet, specId);
    if (!row) {
      Logger.log('Specimen ' + specId + ' not found in sheet — skipping.');
      continue;
    }

    // Append new file IDs to column K
    var existing = String(sheet.getRange(row, COL_IMAGE_IDS).getValue() || '').trim();
    var merged   = existing ? existing + ',' + newFiles.join(',') : newFiles.join(',');
    sheet.getRange(row, COL_IMAGE_IDS).setValue(merged);

    // Move publish_status from draft → review
    var currentStatus = String(sheet.getRange(row, COL_PUBLISH_STATUS).getValue()).toLowerCase().trim();
    if (currentStatus === 'draft') {
      sheet.getRange(row, COL_PUBLISH_STATUS).setValue('review');
    }

    var specimenName = sheet.getRange(row, COL_NAME).getValue() || specId;
    postToDiscord('\uD83D\uDCF8 New photo uploaded for ' + specimenName + ' \u2014 needs review');
  }

  // Update last check timestamp
  props.setProperty('LAST_DRIVE_CHECK', new Date().toISOString());
}

/**
 * Returns true if the file has an image MIME type.
 * @param {GoogleAppsScript.Drive.File} file
 * @return {boolean}
 */
function isImageFile_(file) {
  var mime = file.getMimeType();
  return mime.indexOf('image/') === 0;
}

// ---------------------------------------------------------------------------
// 3. Content Calendar Publisher (daily at 9 AM)
// ---------------------------------------------------------------------------

/**
 * Publishes scheduled content from the Content Calendar tab.
 * Posts to Make.com webhook for Instagram, updates status, notifies Discord.
 */
function publishScheduledContent() {
  var props      = PropertiesService.getScriptProperties();
  var makeUrl    = props.getProperty('MAKE_WEBHOOK_URL');
  var ss         = SpreadsheetApp.openById(SHEET_ID);
  var calSheet   = ss.getSheetByName('Content Calendar');

  if (!calSheet) {
    Logger.log('Content Calendar tab not found.');
    return;
  }

  if (!makeUrl) {
    Logger.log('MAKE_WEBHOOK_URL not set — skipping content publish.');
    return;
  }

  var data     = calSheet.getDataRange().getValues();
  var today    = new Date();
  var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Column layout: A=date, B=type, C=title, D=caption, E=image_file_id, F=status, G=posted_at
  for (var i = 1; i < data.length; i++) { // skip header
    var rowDate = data[i][0];
    var status  = String(data[i][5] || '').toLowerCase().trim();

    if (status !== 'scheduled') continue;

    // Normalize date comparison
    var dateStr;
    if (rowDate instanceof Date) {
      dateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      dateStr = String(rowDate).trim();
    }

    if (dateStr !== todayStr) continue;

    var contentType  = data[i][1] || '';
    var title        = data[i][2] || '';
    var caption      = data[i][3] || '';
    var imageFileId  = String(data[i][4] || '').trim();
    var imageUrl     = imageFileId
      ? 'https://drive.google.com/uc?export=view&id=' + imageFileId
      : '';

    var row = i + 1; // 1-based sheet row

    // POST to Make.com
    var payload = {
      caption:   caption,
      image_url: imageUrl,
      type:      contentType
    };

    try {
      UrlFetchApp.fetch(makeUrl, {
        method:      'post',
        contentType: 'application/json',
        payload:     JSON.stringify(payload),
        muteHttpExceptions: true
      });
    } catch (err) {
      Logger.log('Make.com webhook failed for row ' + row + ': ' + err);
      continue;
    }

    // Update status and timestamp
    calSheet.getRange(row, 6).setValue('posted');   // Column F
    calSheet.getRange(row, 7).setValue(new Date()); // Column G

    postToDiscord('\uD83D\uDCF1 Instagram post sent: ' + (title || caption.substring(0, 60)));
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Creates all installable triggers. Run once from the script editor.
 * Safe to re-run — deletes existing project triggers first.
 */
function setupTriggers() {
  // Clear existing triggers to avoid duplicates
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    ScriptApp.deleteTrigger(existing[i]);
  }

  // 1. Installable onEdit
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SHEET_ID)
    .onEdit()
    .create();

  // 2. Drive watcher — every 15 minutes
  ScriptApp.newTrigger('watchDriveFolders')
    .timeBased()
    .everyMinutes(15)
    .create();

  // 3. Content calendar — daily at 9 AM
  ScriptApp.newTrigger('publishScheduledContent')
    .timeBased()
    .atHour(9)
    .nearMinute(0)
    .everyDays(1)
    .create();

  Logger.log('Triggers created: onSheetEdit, watchDriveFolders (15m), publishScheduledContent (daily 9AM)');
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Posts a message to the configured Discord webhook.
 * @param {string} message
 */
function postToDiscord(message) {
  var url = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
  if (!url) {
    Logger.log('DISCORD_WEBHOOK_URL not set. Message: ' + message);
    return;
  }

  try {
    UrlFetchApp.fetch(url, {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify({ content: message }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Discord webhook failed: ' + err);
  }
}

/**
 * Triggers a Vercel rebuild via the configured deploy hook.
 */
function triggerVercelRebuild() {
  var url = PropertiesService.getScriptProperties().getProperty('VERCEL_DEPLOY_HOOK');
  if (!url) {
    Logger.log('VERCEL_DEPLOY_HOOK not set — skipping rebuild.');
    return;
  }

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Vercel deploy hook failed: ' + err);
  }
}

/**
 * Maps a 1-based column index to a human-readable name.
 * @param {number} colIndex
 * @return {string}
 */
function getColumnName(colIndex) {
  return COLUMN_NAMES[colIndex] || ('Column ' + String.fromCharCode(64 + colIndex));
}

/**
 * Finds the row number of a specimen by ID (column A) in the given sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} id — specimen ID (e.g. "cupr-001")
 * @return {number|null} 1-based row number, or null if not found
 */
function getSpecimenRow(sheet, id) {
  var data = sheet.getRange(1, COL_ID, sheet.getLastRow(), 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      return i + 1; // 1-based
    }
  }
  return null;
}
