// -------------------------------------------------
// Server Offline Notifier
// https://github.com/tylermammone/Server-Offline-Notifier
// -------------------------------------------------

// -------------------------------------------------
// SETTINGS
// -------------------------------------------------
var minutesBetweenServerChecks = 1;
var minutesBetweenNotifications = 2;

// -------------------------------------------------
// UTILITIES
// -------------------------------------------------
var date = new Date();
var activeSheet = SpreadsheetApp.getActiveSpreadsheet();
var serversSheet = activeSheet.getSheetByName('Servers');

function addMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Server Status')
  .addItem('Add server', 'addNewServer')
  .addSeparator()
  .addItem('Check servers', 'checkServers')
  .addSeparator()
  .addItem('Install', 'install')
  .addItem('Turn off', 'stopTrigger')
  .addToUi();
}

function addNewServer() {
  var ui = SpreadsheetApp.getUi();
  var newServerUrl = ui.prompt('Enter the URL', 'Example\n\- URL: https://www.google.com/', ui.ButtonSet.OK_CANCEL);
  if (newServerUrl.getSelectedButton() == ui.Button.OK && newServerUrl.getResponseText().length) {
    var notificationEmail = ui.prompt('What email address should receive any offline notifications?', 'Example: ' + Session.getActiveUser().getEmail(), ui.ButtonSet.OK_CANCEL);
    if (notificationEmail.getSelectedButton() == ui.Button.OK && notificationEmail.getResponseText().length) {
      serversSheet.appendRow([newServerUrl.getResponseText(), date, notificationEmail.getResponseText(), date]);
    } else {
      ui.alert('You forgot to enter the notification email address!');
    }
  } else {
    ui.alert('You forgot to enter the server URL!');
  }
}

function checkServers() {
  if (serversSheet.getRange(2,1).getValue().length) {
    var myServers = serversSheet.getRange(2, 1, serversSheet.getLastRow() - 1, 4).getValues();
    var thisRow = 2;
    myServers.forEach(function(serverRow) {
      if (serverRow[2]!="me@example.com") {
        try {
          serversSheet.getRange(thisRow, 2).setValue(date);
          var nextNotificationDate = new Date(serverRow[3]);
          nextNotificationDate.setMinutes(nextNotificationDate.getMinutes() + minutesBetweenNotifications);
          currentStatus = getStatusCode(serverRow[0]);
          if (currentStatus!='200' && date.valueOf()>nextNotificationDate.valueOf()) {
            serversSheet.getRange(thisRow, 4).setValue(date);
            var subject = "#alarms - Server Offline!";
            var messageBody = serverRow[0] + " returned status " + currentStatus;
            GmailApp.sendEmail(serverRow[2], subject, "", {htmlBody: messageBody});
          }
        }
        catch(e) {
          Logger.log('Error: ' + e.message);
        }
        thisRow++;
      }
    });
  }
}

function getStatusCode(url) {
  var options = {
    'muteHttpExceptions': true,
    'followRedirects': false
  };
  var url_trimmed = url.trim();
  var response = UrlFetchApp.fetch(url_trimmed, options);
  return response.getResponseCode();
}

function install() {
  var ui = SpreadsheetApp.getUi();
  if (!serversSheet) {
    serversSheet = activeSheet.insertSheet('Servers');
    serversSheet.appendRow(['Server URL', 'Last Checked', 'Notification Email', 'Last Notification']);
    serversSheet.appendRow(['https://google.com', date, Session.getActiveUser().getEmail(), date]);
    serversSheet.deleteColumns(5, serversSheet.getMaxColumns() - 4);
    serversSheet.setFrozenRows(1);
    serversSheet.autoResizeColumns(1, 4);
  }
  activeSheet.setActiveSheet(serversSheet);
  var sheets = activeSheet.getSheets();
  for (i = 0; i < sheets.length; i++) {
    switch(sheets[i].getSheetName()) {
      case "Servers":
        break;
      default:
        activeSheet.deleteSheet(sheets[i]);
    }
  }
  stopTrigger();
  ScriptApp.newTrigger('checkServers')
  .timeBased()
  .everyMinutes(minutesBetweenServerChecks)
  .create();
  ui.alert('Installed! Use "Add server" to start checking a host...');
}

function onOpen(e) {
  addMenu();
}

function stopTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}
