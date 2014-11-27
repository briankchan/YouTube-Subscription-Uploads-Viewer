
var tabID;

chrome.browserAction.onClicked.addListener(function(tab) {
	if(tabID == null) {
		chrome.tabs.create({url:"viewer.html"}, function(tab) {
			tabID = tab.id;
		});
	} else {
		chrome.tabs.update(tabID, {selected : true});
	}
});
