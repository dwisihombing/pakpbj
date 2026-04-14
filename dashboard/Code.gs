function doGet() {
  try {
    return HtmlService.createHtmlOutputFromFile('Index');
  } catch (e) {
    return HtmlService.createHtmlOutput('Error: ' + e.message);
  }
}

function getData() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return data;
}