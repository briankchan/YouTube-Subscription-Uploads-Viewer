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
	//Storage.get("groups").done(function(storage) {
	
	//});
};

exports.loadSubscriptions = function() {
	return YoutubeApi.getSubscriptions().done(function(subs) {
		var newSubsOrder = [];
		
		$.each(subs, function(id, sub) {
			newSubsOrder.push(id);
			
			if(!channels[id]) {
				channels[id] = {
					uploads: []
				};
			}
			channels[id].name = sub.name;
			channels[id].thumb = sub.thumb;
		});
		
		subscriptionsList = newSubsOrder; //TODO filter + handle deleted subs
		
		subscriptionsListInitDeferred.resolve();
	})
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

//function loadChannelsUploads(responseItemsJSON) {
//	var loadChannelUploadsPromises = [];
//	$.each(responseItemsJSON, function(i, sub) {
//		var id = sub.snippet.resourceId.channelId;
//		
//		channels[id] = {
//			name: sub.snippet.title,
//			thumb: sub.snippet.thumbnails.default.url,
//			uploads: []
//		};
//		
//		loadChannelUploadsPromises.push(loadChannelUploads(id));
//	});
//	return $.when.apply($, loadChannelUploadsPromises);
//}

function loadChannelUploads(channelId) {
	var deferred = $.Deferred();
	
	var channel = channels[channelId];
	
	loadChannelUploadsPlaylistId(channelId).done(function() {
		YoutubeApi.getPlaylistItems(channel.uploadsPlaylist).done(function(videoIds) {
			loadChannelUploadsFromVideoIds(channel, videoIds).done(function() {
				deferred.resolve();
			});
		});
	});
	
	return deferred.promise();
}

function loadChannelUploadsPlaylistId(channelId) { //assumes uploads playlist never changes
	var channel = channels[channelId];
	
	//if uploads playlist id is not saved, get and save it; else, we're already done
	return channel.uploadsPlaylist ? //TODO move to channel init
			$.Deferred().resolve().promise() :
			YoutubeApi.getChannelUploadsPlaylist(channelId).done(function(id) {
				channel.uploadsPlaylist = id;
			});
}

function loadChannelUploadsFromVideoIds(channel, videoIds) {
	var deferred = $.Deferred();
	
	var videoIdsString = "";
	var currentVideoIds = $.map(channel.uploads, function(video) {
		return VideoManager.getId(video);
	});
	var newVideoIds = $.grep(videoIds, function(videoId) {
		return currentVideoIds.indexOf(videoId) < 0;
	});
	$.each(newVideoIds, function(i, id) {
		videoIdsString += id + ",";
	});
	videoIdsString = videoIdsString.slice(0, -1); //cut out last comma
	
	if(videoIdsString)
		console.log(videoIdsString); //debugging
	
	if(videoIdsString != "") {
		YoutubeApi.getVideoDetails(videoIdsString).done(function(videos) {
			$.merge(channel.uploads,videos); //TODO pass upwards
			deferred.resolve();
		});
	} else {
		deferred.resolve();
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
