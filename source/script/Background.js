/**
 * Background script for the extension.
 * Handles opening/closing of the viewer tab and schedules fetching of upload videos.
 */

window.$ = window.jquery = require("jquery");

var Youtube = window.Youtube = require("./Youtube.js");
var User = window.User = require("./User.js");

var authorizeDeferred = $.Deferred();
var updateSubscriptionsDeferred = $.Deferred();
var updateUploadsDeferred = $.Deferred();

window.authorizePromise = authorizeDeferred.promise();
window.loadVideosPromise = Youtube.loadVideos(); //TODO do these actually need to be exposed
window.loadSubscriptionsListPromise = Youtube.loadSubscriptionsList();
window.loadUsersPromise = User.loadUsers();
window.updateSubscriptionsPromise = updateSubscriptionsDeferred.promise();
window.updateUploadsPromise = updateUploadsDeferred.promise();

if(Youtube.isLoggedIn()) {
	console.log("logged in");
	authorizeDeferred.resolve();
} else console.log("not logged in");

authorizeDeferred.done(function() {
	loadUsersPromise.done(function() {
		Youtube.getUserId().done(function(userId) {
			User.setUser(userId);
		});
	});
	
	loadSubscriptionsListPromise.done(function() {
		Youtube.updateSubscriptions().done(function() {
			updateSubscriptionsDeferred.resolve();
			
			loadVideosPromise.done(function() {
				Youtube.updateSubscriptionsUploads().done(function() {
					updateUploadsDeferred.resolve();
				});
			});
		});
	});
});

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

window.authorize = function(interactive) { 
	return Youtube.authorize(interactive).done(function() {
		authorizeDeferred.resolve();
	});
};
window.isLoggedIn = function() { return Youtube.isLoggedIn() };
window.getUserId = function() { return Youtube.getUserId() };
window.loadVideos = function() { return Youtube.loadVideos() };
window.loadSubscriptionsList = function() { return Youtube.loadSubscriptionsList() };
window.getSubscriptions = function() { return Youtube.getSubscriptions() };
window.updateSubscriptions = function() { return Youtube.updateSubscriptions() };
window.updateSubscriptionsUploads = function() { return Youtube.updateSubscriptionsUploads() };
window.isChannelLoaded = function(channelId) { return Youtube.isChannelLoaded(channelId) };
window.getChannelName = function(channelId) { return Youtube.getChannelName(channelId) };
window.getChannelThumb = function(channelId) { return Youtube.getChannelThumb(channelId) };
window.getChannelUploads = function(channelId) { return Youtube.getChannelUploads(channelId) };
