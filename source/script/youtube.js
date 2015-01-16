/**
 * A wrapper for YouTube's data API and Chrome's Identity API.
 * authorize() needs to be called before anything else can be used.
 */

var YoutubeApi = require("./youtube-api.js");
var VideoManager = require("./video-object-manager.js");

var subscriptions = exports.subscriptions = {}; //TODO: stop exporting this (debug code)

exports.authorize = function(interactive) {
	var deferred = $.Deferred();
	
	chrome.identity.getAuthToken({ interactive: interactive }, function(authResult) {
		if (authResult) {
			if(!authResult.error) {
				YoutubeApi.setAuthToken(authResult);
				deferred.resolve();
			} else {
				deferred.reject(authResult.error);
			}
		} else {
			deferred.reject();
		}
	});
	
	return deferred.promise();
};

exports.loadSubscriptionsUploads = function() {
	var deferred = $.Deferred();
	
	if($.isEmptyObject(subscriptions)) {
		getSubscriptionsApiCall().done(function(response) {
			handleSubscriptionsResponse(response).done(function() {
				deferred.resolve(subscriptions);
			});
		});
	} else {
		var promises = $.map(subscriptions, function(sub, id) {
			return loadChannelUploads(id);
		});
		$.when.apply($, promises).done(function() {
			deferred.resolve(subscriptions);
		})
	}
	
	return deferred.promise();
};

function getSubscriptionsApiCall() {
	return YoutubeApi.subscriptions.get({
		mine: true,
		part: "id,snippet",
		fields: "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
		maxResults: 50,
		order: "alphabetical"
	});
}

function handleSubscriptionsResponse(response) {
	var channelIds = [];
	$.each(response.items, function(i, sub) {
		var id = sub.snippet.resourceId.channelId;
		channelIds.push(id);
		subscriptions[id] = {
			name: sub.snippet.title,
			thumb: sub.snippet.thumbnails.default.url,
			uploads: {}
		};
	});
	var loadUploadsPromise = loadChannelsUploads(channelIds);
	
	var loadSubscriptionsDeferred = $.Deferred();
	if (response.nextPageToken) {
		getSubscriptionsNextPageApiCall(response.nextPageToken).done(function(nextResponse) {
			var a = handleSubscriptionsResponse(nextResponse).done(function() {
				loadSubscriptionsDeferred.resolve();
			});
		});
	} else {
		loadSubscriptionsDeferred.resolve();
	}
	
	return $.when(loadUploadsPromise, loadSubscriptionsDeferred.promise());
}

function loadChannelsUploads(channelIds) {
	var promises = $.map(channelIds, function(id, i) {
		return loadChannelUploads(id);
	});
	return $.when.apply($, promises);
}

function getSubscriptionsNextPageApiCall(nextPageToken) {
	return YoutubeApi.subscriptions.get({
		mine: true,
		part: "snippet",
		fields: "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
		maxResults: 50,
		order: "alphabetical",
		pageToken: nextPageToken
	});
}

function loadChannelUploads(channelId) {
	var deferred = $.Deferred();
	
	var channel = subscriptions[channelId];
	
	loadChannelUploadsPlaylistId(channelId).done(function() {
		getPlaylistVideoIds(channel.uploadsPlaylist).done(function(videoIds) {
			loadChannelUploadsFromVideoIds(channel, videoIds).done(function() {
				deferred.resolve();
			});
		});
	});
	
	return deferred.promise();
}

function loadChannelUploadsPlaylistId(channelId) {
	var channel = subscriptions[channelId];
	
	//if uploads playlist id is not saved, get and save it; else, we're already done
	return channel.uploadsPlaylist ?
			$.Deferred().resolve().promise() :
			getChannelUploadsPlaylistApiCall(channelId).done(function(response) {
				channel.uploadsPlaylist = response.items[0].contentDetails.relatedPlaylists.uploads;
			});
}

function getChannelUploadsPlaylistApiCall(channelId) {
	return YoutubeApi.channels.get({
		id: channelId,
		part: "contentDetails",
		fields: "items/contentDetails/relatedPlaylists/uploads"
	});
}

function getPlaylistVideoIds(playlistId) {
	var deferred = $.Deferred();
	
	getPlaylistItemsApiCall(playlistId).done(function(response) {
		var videoIds = $.map(response.items, function(video, i) {
			return video.contentDetails.videoId;
		});
		
		deferred.resolve(videoIds);
	});
	
	return deferred;
}

function loadChannelUploadsFromVideoIds(channel, videoIds) {
	var deferred = $.Deferred();
	
	var videoIdsString = "";
	$.each(videoIds, function(i, id) {
		if(!channel.uploads[id])
			videoIdsString += id + ",";
	});
	//cut out last comma
	videoIdsString = videoIdsString.slice(0, -1);
	
	if(videoIdsString != "") {
		getVideoDetailsApiCall(videoIdsString).done(function(response) {
			$.each(response.items, function(i, videoJSON) {
				var video = VideoManager.createNewVideo();
				VideoManager.setTitle(video, videoJSON.snippet.title);
				VideoManager.setDescription(video, videoJSON.snippet.description);
				VideoManager.setThumbnail(video, videoJSON.snippet.thumbnails.medium.url);
				VideoManager.setUploadTime(video, videoJSON.snippet.publishedAt);
				VideoManager.setDuration(video, videoJSON.contentDetails.duration);
				VideoManager.setViewCount(video, parseInt(videoJSON.statistics.viewCount));
				VideoManager.setLikesCount(video, parseInt(videoJSON.statistics.likeCount));
				VideoManager.setDislikesCount(video, parseInt(videoJSON.statistics.dislikeCount));
				VideoManager.setCommentsCount(video, parseInt(videoJSON.statistics.commentCount));
				
				channel.uploads[videoJSON.id] = video;
			});
			
			deferred.resolve();
		});
	} else {
		deferred.resolve();
	}
	
	return deferred.promise();
}

function getPlaylistItemsApiCall(playlistId) {
	return YoutubeApi.playlistItems.get({
		playlistId: playlistId,
		part: "contentDetails",
		fields: "items/contentDetails/videoId",
		maxResults: 50
	});
}

function getVideoDetailsApiCall(videoIds) {
	return YoutubeApi.videos.get({
		id: videoIds,
		part: "id,snippet,contentDetails,statistics",
		fields: "items(id,snippet(publishedAt,title,description,thumbnails/medium/url),contentDetails/duration,statistics(viewCount,likeCount,dislikeCount,commentCount))",
		maxResults: 50
	});
}

exports.isChannelLoaded = function(channelId) {
	return subscriptions[channelId] != undefined;
};

exports.getChannelName = function(channelId) {
	return subscriptions[channelId].name;
};

exports.getChannelThumb = function(channelId) {
	return subscriptions[channelId].thumb;
};

exports.getChannelUploads = function(channelId) {
	return subscriptions[channelId].uploads;
};
