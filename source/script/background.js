/**
 * Background script for the extension.
 * Handles opening/closing of the viewer tab and schedules fetching of upload videos.
 */

window.$ = window.jquery = require("jquery");

var Youtube = window.Youtube = require("./youtube.js");

setTimeout(function() { Youtube.authorize(false); }, 1); //attempt to log in without UI TODO library doesn't do this

window.loadVideosPromise = Youtube.loadVideos();
window.loadSubscriptionsListPromise = Youtube.loadSubscriptionsList();

chrome.browserAction.onClicked.addListener(function(tab) {
	var openTabs = chrome.extension.getViews({ type: "tab" });
	
	if(openTabs.length < 1) {
		chrome.tabs.create({ url: "viewer.html" });
	} else {
		openTabs[0].chrome.tabs.getCurrent(function(tab){
			chrome.tabs.update(tab.id, { highlighted: true });
			chrome.tabs.get(tab.id, function(tab) {
				chrome.windows.update(tab.windowId, { focused: true });
			});
		});
	}
});
