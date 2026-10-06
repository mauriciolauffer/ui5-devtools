// devtools.js - Creates DevFrame panel in Chrome DevTools
if (chrome && chrome.devtools) {
  chrome.devtools.panels.create(
    "DevFrame UI5",
    "icons/icon16.png",
    "src/panel/panel.html",
    function(panel) {
      console.log("DevFrame UI5 DevTools panel created successfully.");
    }
  );
}
