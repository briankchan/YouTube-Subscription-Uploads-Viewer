/**
 * Background script for the extension.
 * Handles opening/closing of the viewer tab and schedules fetching of upload videos.
 */

window.$ = window.jquery = require("jquery");

var Youtube = require("./Youtube.js");
var User = require("./User.js");

var authorizeDeferred = $.Deferred();
var updateSubscriptionsDeferred = $.Deferred();
var updateUploadsDeferred = $.Deferred();

var loadVideosPromise = Youtube.loadVideos(); //TODO do these actually need to be exposed
var loadUsersPromise = User.loadUsers();

window.authorizePromise = authorizeDeferred.promise();
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
		
		Youtube.getSubscriptions().done(function(subsList) {
			User.setSubscriptions(subsList);
			
			updateSubscriptionsDeferred.resolve();
			
			loadVideosPromise.done(function() {
				Youtube.updateChannelsUploads(subsList).done(function() {
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
window.updateSubscriptionsUploads = function() {
	return Youtube.updateChannelsUploads(User.getSubscriptions());
};
window.isChannelLoaded = function(channelId) { return Youtube.isChannelLoaded(channelId) };
window.getChannelName = function(channelId) { return Youtube.getChannelName(channelId) };
window.getChannelThumb = function(channelId) { return Youtube.getChannelThumb(channelId) };
window.getChannelUploads = function(channelId) { return Youtube.getChannelUploads(channelId) };

window.getSubscriptions = function() { return User.getSubscriptions() };
window.setWatched = function(channelId, videoId) { User.setWatched(channelId, videoId) };
window.setUnwatched = function(channelId, videoId) { User.setUnwatched(channelId, videoId) };
window.getWatched = function(channelId, videoId) { return User.getWatched(channelId, videoId) };
