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

exports.loadVideos = function() {
	Storage.get("channels").done(function(storage) {
		channels = exports.channels = (typeof storage.channels === "object") ? storage.channels : {}; //debugging (exporting subs)
		channelsInitDeferred.resolve();
	});
	//Storage.get("groups").done(function(storage) { TODO groups.
	
	//});
};

exports.loadSubscriptions = function() {
	return YoutubeApi.getSubscriptions().done(function(subs) {
		var newSubsOrder = [];
		
		$.each(subs, function(id, sub) {
			newSubsOrder.push(id);
			
			if(!channels[id]) {
				channels[id] = {
					name: sub.name,
					thumb: sub.thumb,
					uploads: []
				};
				YoutubeApi.getChannelUploadsPlaylist(id).done(function(playlistId) {
					channels[id].uploadsPlaylist = playlistId;
				});
			} else {
				channels[id].name = sub.name;
				channels[id].thumb = sub.thumb;
			}
			
		});
		
		subscriptionsList = newSubsOrder; //TODO filter + handle deleted subs
		
		subscriptionsListInitDeferred.resolve();
	});
};

exports.loadSubscriptionsUploads = function() {
	var deferred = $.Deferred();
	
	
	$.when(channelsInitDeferred, subscriptionsListInitDeferred).done(function() { //TODO should i really be checking here
		var promises = $.map(subscriptionsList, function(id, i) {
			return loadChannelUploads(id);
		});
		
		$.when.apply($, promises).done(function() {
			deferred.resolve(channels, subscriptionsList);
			Storage.set("channels", channels);
		});
	});
	
	
	
	return deferred.promise();
};

function loadChannelUploads(channelId) {
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
		
		loadVideos(newVideoIds).done(function(videos) {
			if(videos)
				$.merge(channel.uploads, videos);
			deferred.resolve();
		});
	});
	
	return deferred.promise();
}

function loadVideos(videoIds) {
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
	return channels[channelId] != undefined;
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
