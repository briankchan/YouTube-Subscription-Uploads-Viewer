/**
 * A wrapper for YouTube's data API and Chrome's Identity API.
 * authorize() needs to be called before anything else can be used.
 */

var YoutubeApi = require("./youtube-api.js");
var VideoManager = require("./video-object-manager.js");
var Storage = require("./storage.js");

var channels;
var channelsInitDeferred = $.Deferred();
var subscriptionsList;
var subscriptionsListInitDeferred = $.Deferred();

exports.authorize = function(interactive) {
	return YoutubeApi.authorize(interactive);
};

exports.isLoggedIn = function() {
	return YoutubeApi.isLoggedIn();
};

exports.loadVideos = function() {
	Storage.get("channels").done(function(storage) {
		channels = exports.channels = (typeof storage.channels === "object") ? storage.channels : {}; //debugging (exporting subs)
		channelsInitDeferred.resolve();
	});
	Storage.get("subscriptionsList").done(function(storage) {
		subscriptionsList = ($.isArray(storage.subscriptionsList)) ? storage.subscriptionsList : [];
		subscriptionsListInitDeferred.resolve();
	});
};

exports.getSubscriptions = function() {
	var deferred = $.Deferred();
	
	subscriptionsListInitDeferred.done(function() {
		deferred.resolve(subscriptionsList);
	});
	
	return deferred.promise();
};

exports.updateSubscriptions = function() {
	var deferred = $.Deferred();
	
	channelsInitDeferred.done(function() { //TODO move checks to main.js
		YoutubeApi.getSubscriptions().done(function(subs) {
			var newSubsOrder = [];
			var getChannelUploadsPlaylistDeferreds = [];
			
			$.each(subs, function(id, sub) { //assumes chrome gets keys in order added to object
				newSubsOrder.push(id);
				
				if (!channels[id]) {
					channels[id] = {
						name: sub.name,
						thumb: sub.thumb,
						uploads: []
					};
					getChannelUploadsPlaylistDeferreds.push(YoutubeApi.getChannelUploadsPlaylist(id).done(function(playlistId) {
						channels[id].uploadsPlaylist = playlistId;
					}));
				} else {
					channels[id].name = sub.name;
					channels[id].thumb = sub.thumb;
				}
			});
			
			subscriptionsList = newSubsOrder; //TODO filter + handle deleted subs
			
			Storage.set("subscriptionsList", newSubsOrder);
			
			$.when.apply($, getChannelUploadsPlaylistDeferreds).done(function() {
				deferred.resolve(newSubsOrder);
			});
		});
	});
	
	return deferred.promise();
};

exports.updateSubscriptionsUploads = function() {
	var deferred = $.Deferred();
	
	$.when(channelsInitDeferred, subscriptionsListInitDeferred).done(function() { //TODO should i really be checking here
		var promises = $.map(subscriptionsList, function(id, i) {
			return updateChannelUploads(id);
		});
		
		$.when.apply($, promises).done(function() {
			deferred.resolve();
			Storage.set("channels", channels);
		});
	});
	
	return deferred.promise();
};

function updateChannelUploads(channelId) {
	var deferred = $.Deferred();
	
	var channel = channels[channelId];
	
	YoutubeApi.getPlaylistItems(channel.uploadsPlaylist).done(function(videoIds) {
		//only get new videos
		var currentVideoIds = $.map(channel.uploads, function(video) {
			return VideoManager.getId(video);
		});
		var newVideoIds = $.grep(videoIds, function(videoId) {
			return currentVideoIds.indexOf(videoId) < 0;
		});
		
		getVideosData(newVideoIds).done(function(videos) {
			if(videos)
				$.merge(channel.uploads, videos);
			deferred.resolve();
		});
	});
	
	return deferred.promise();
}

function getVideosData(videoIds) {
	var deferred = $.Deferred();
	
	var videoIdsString = "";
	$.each(videoIds, function(i, id) {
		videoIdsString += id + ",";
	});
	videoIdsString = videoIdsString.slice(0, -1); //cut out last comma
	
	if(videoIdsString != "") {
		console.log(videoIdsString); //debugging
		YoutubeApi.getVideoDetails(videoIdsString).done(function(videos) {
			deferred.resolve(videos);
		});
	} else {
		deferred.resolve(null);
	}
	
	return deferred.promise();
}

exports.isChannelLoaded = function(channelId) {
	var deferred = $.Deferred();
	
	channelsInitDeferred.done(function() {
		deferred.resolve(channels[channelId] != undefined); //TODO just use done/fail?
	});
	
	return deferred.promise(); 
};

exports.getChannelName = function(channelId) {
	return channels[channelId].name;
};

exports.getChannelThumb = function(channelId) {
	return channels[channelId].thumb;
};

exports.getChannelUploads = function(channelId) {
	return channels[channelId].uploads;
};
