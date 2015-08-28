/**
 * Background script for the extension.
 * Handles opening/closing of the viewer tab and schedules fetching of upload videos.
 */

window.$ = window.jquery = require("jquery");

var Youtube = window.Youtube = require("./Youtube.js"); //debugging
var User = require("./User.js");

var authorizeDeferred = $.Deferred();
var updateSubscriptionsDeferred = $.Deferred();
var updateUploadsDeferred = $.Deferred();

var loadVideosPromise = Youtube.loadUploads(); //TODO do these actually need to be exposed
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
				}).progress(function(channelId, uploads) {
					User.updateWatchedCount(channelId, uploads);
				});
			});
		});
	});
});

chrome.browserAction.onClicked.addListener(function(tab) {
	var viewers = chrome.extension.getViews({ type: "tab" });
	
	if(viewers.length < 1) {
		chrome.tabs.create({ url: "viewer.html" });
	} else {
		viewers[0].chrome.tabs.getCurrent(function(tab){
			chrome.tabs.update(tab.id, { highlighted: true });
			chrome.tabs.get(tab.id, function(tab) {
				chrome.windows.update(tab.windowId, { focused: true });
			});
		});
	}
});

window.authorize = function() { 
	return Youtube.authorize().done(function() {
		authorizeDeferred.resolve();
	});
};
window.isLoggedIn = function() { return Youtube.isLoggedIn() };
window.updateUploads = function() {
	return Youtube.updateChannelsUploads(User.getSubscriptionIds()).progress(function(channelId, uploads) {
		User.updateWatchedCount(channelId, uploads);
	});
};
window.getChannelName = function(channelId) { return Youtube.getChannelName(channelId) };
window.getChannelThumb = function(channelId) { return Youtube.getChannelThumb(channelId) };
window.getChannelUploads = function(channelId) { return Youtube.getChannelUploads(channelId) };

window.getSubscriptionIds = function() { return User.getSubscriptionIds() };
window.setWatched = function(channelId, videoId) { User.setWatched(channelId, videoId) };
window.setUnwatched = function(channelId, videoId) { User.setUnwatched(channelId, videoId) };
window.isWatched = function(channelId, videoId) { return User.isWatched(channelId, videoId) };
window.getWatchedVideos = function(channelId) { return User.getWatchedVideos(channelId) };
window.getUnwatchedCount = User.getUnwatchedCount;

function IllegalArgumentError(message) {
	Error.captureStackTrace(this);
	this.message = message;
}
IllegalArgumentError.prototype = Object.create(Error.prototype);
IllegalArgumentError.prototype.name = "IllegalArgumentError";
window.IllegalArgumentError = IllegalArgumentError;
