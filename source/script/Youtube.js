/**
 * A wrapper for YouTube's data API and Chrome's Identity API.
 * authorize() needs to be called before anything else can be used.
 */

var YoutubeApi = require("./YoutubeApi.js");
var Storage = require("./Storage.js");

var channels;

exports.authorize = function() {
	return YoutubeApi.authorize();
};

exports.isLoggedIn = function() {
	return YoutubeApi.isLoggedIn();
};

exports.getUserId = function() {
	var deferred = $.Deferred();
	
	YoutubeApi.authorize().done(function() {
		YoutubeApi.getUserId().done(function(userId) {
			deferred.resolve(userId);
		});
	});
	
	return deferred;
};

exports.loadUploads = function() {
	return Storage.get("channels").done(function(value) {
		channels = exports.channels = (typeof value === "object") ? value : {}; //debugging (exporting subs)
	});
};

exports.getSubscriptions = function() {
	var deferred = $.Deferred();
	
	YoutubeApi.authorize().done(function() {
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
			
			$.when.apply($, getChannelUploadsPlaylistDeferreds).done(function() {
				deferred.resolve(newSubsOrder);
			});
		});
	});
	
	return deferred.promise();
};

exports.updateChannelsUploads = function(channelIds) {
	var deferred = $.Deferred();
	
	var promises = $.map(channelIds, function(id, i) {
		return updateChannelUploads(id).done(function() {
			deferred.notify(id);
		});
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
		channel.uploads = $.grep(channel.uploads, function(video) { //remove deleted videos
			return videoIds.indexOf(video.id) >= 0;
		});
		
		var currentVideoIds = $.map(channel.uploads, function(video) {
			return video.id;
		});
		var newVideoIds = $.grep(videoIds, function(videoId) { //only get new videos
			return currentVideoIds.indexOf(videoId) < 0;
		});
		
		getVideosData(newVideoIds).done(function(videos) {
			if(videos)
				channel.uploads = $.merge(videos, channel.uploads);
			
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
	return $.merge([], channels[channelId].uploads);
};

exports.getChannels = function() {
	return channels;
};
