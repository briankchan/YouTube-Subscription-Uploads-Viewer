/**
 * A wrapper for YouTube's data API and Chrome's Identity API.
 * authorize() needs to be called before anything else can be used.
 */

var YoutubeApi = require("./YoutubeApi.js");
var VideoManager = require("./VideoObjectManager.js");
var Storage = require("./Storage.js");

var channels;
var subscriptionsList;

exports.authorize = function(interactive) {
	return YoutubeApi.authorize(interactive);
};

exports.isLoggedIn = function() {
	return YoutubeApi.isLoggedIn();
};

exports.loadVideos = function() {
	return Storage.get("channels").done(function(value) {
		channels = exports.channels = (typeof value === "object") ? value : {}; //debugging (exporting subs)
	});
};

exports.loadSubscriptionsList = function() {
	return Storage.get("subscriptionsList").done(function(value) {
		subscriptionsList = ($.isArray(value)) ? value : [];
	});
};

exports.getSubscriptions = function() {
	return subscriptionsList;
};

exports.updateSubscriptions = function() {
	var deferred = $.Deferred();
	
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
	
	return deferred.promise();
};

exports.updateSubscriptionsUploads = function() {
	var deferred = $.Deferred();
	
	var promises = $.map(subscriptionsList, function(id, i) {
		return updateChannelUploads(id);
	});
	
	$.when.apply($, promises).done(function() {
		deferred.resolve();
		Storage.set("channels", channels);
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
	return channels[channelId] != undefined
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
