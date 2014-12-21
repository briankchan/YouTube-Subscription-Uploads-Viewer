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

exports.saveSubscriptionsUploads = function() {
	var deferred = $.Deferred();
	
	if(subscriptions.length > 0) {
		var promises = [];
		$.each(subscriptions, function(id, sub) {
			promises.push(saveChannelUploads(id));
		});
		$.when.apply($, promises).done(function() {
			deferred.resolve(subscriptions);
		})
	} else {
		getSubscriptionsApiCall().done(function(response) {
			handleSubscriptionsResponse(response).done(function() {
				deferred.resolve(subscriptions);
			});
		});
	}
	
	return deferred.promise();
};

function getSubscriptionsApiCall() {
	return YoutubeApi.subscriptions.get({
		"mine": true,
		"part": "id,snippet",
		"fields": "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
		"maxResults": 50,
		"order": "alphabetical"
	});
}

function handleSubscriptionsResponse(response) {
	var loadUploadsPromise = saveChannelsUploads(response);
	
	var loadSubscriptionsPromise;
	if (response.nextPageToken) {
		getSubscriptionsNextPageApiCall(response.nextPageToken).done(function(nextResponse) {
			loadSubscriptionsPromise = handleSubscriptionsResponse(nextResponse);
		});
	}
	
	return $.when(loadUploadsPromise, loadSubscriptionsPromise);
}

function saveChannelsUploads(response) {
	var promises = [];
	$.each(response.items, function(i, sub) {
		var id = sub.snippet.resourceId.channelId;
		
		subscriptions[id] = {
			name: sub.snippet.title,
			thumb: sub.snippet.thumbnails.default.url
		};
		
		promises.push(saveChannelUploads(id));
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
		"pageToken": nextPageToken
	});
}

function saveChannelUploads(channelId) {
	var deferred = $.Deferred();
	
	var channel = subscriptions[channelId];
	
	//if uploads playlist id is not saved, get/save it first
	var playlistIdDeferred = (channel.uploadsPlaylist
			? $.Deferred().resolve().promise()
			: getChannelUploadsPlaylistApiCall(channelId).done(function(channelJSON) {
					channel.uploadsPlaylist = channelJSON.items[0].contentDetails.relatedPlaylists.uploads;
				})
	);
	
	playlistIdDeferred.done(function() {
		getPlaylistVideos(channel.uploadsPlaylist).done(function(videos) {
			channel.uploads = videos;
			deferred.resolve();
		});
	});
	
	return deferred.promise();
}

function getChannelUploadsPlaylistApiCall(channelId) {
	return YoutubeApi.channels.get({
		"id": channelId,
		"part": "contentDetails",
		"fields": "items/contentDetails/relatedPlaylists/uploads"
	});
}

function getPlaylistVideos(playlistId) {
	var deferred = $.Deferred();
	
	getPlaylistItemsApiCall(playlistId).done(function(playlistVideosJSON) {
		//save IDs of videos
		var videoIds = "";
		$.each(playlistVideosJSON.items, function(i, video) {
			videoIds += video.contentDetails.videoId + ",";
		});
		//cut out last comma
		videoIds = videoIds.slice(0, -1);
		
		getVideoDetailsApiCall(videoIds).done(function(videoJSON) {
			var videos = {};
			
			$.each(videoJSON.items, function(i, videoJSON) {
				var video = VideoManager.createNewVideo();
				VideoManager.setTitle(video, videoJSON.snippet.title);
				VideoManager.setDescription(video, videoJSON.snippet.description);
				VideoManager.setThumbnail(video, videoJSON.snippet.thumbnails.medium.url);
				VideoManager.setUploadTime(video, new Date(videoJSON.snippet.publishedAt));
				VideoManager.setDuration(video, videoJSON.contentDetails.duration);
				VideoManager.setViewCount(video, parseInt(videoJSON.statistics.viewCount));
				VideoManager.setLikesCount(video, parseInt(videoJSON.statistics.likeCount));
				VideoManager.setDislikesCount(video, parseInt(videoJSON.statistics.dislikeCount));
				VideoManager.setCommentsCount(video, parseInt(videoJSON.statistics.commentCount));
				
				videos[videoJSON.id] = video;
			});
			
			deferred.resolve(videos);
		});
	});
	
	return deferred.promise();
}

function getPlaylistItemsApiCall(playlistId) {
	return YoutubeApi.playlistItems.get({
		"playlistId": playlistId,
		"part": "contentDetails",
		"fields": "items/contentDetails/videoId",
		"maxResults": 50
	});
}

function getVideoDetailsApiCall(videoIds) {
	return YoutubeApi.videos.get({
		"id": videoIds,
		"part": "id,snippet,contentDetails,statistics",
		"fields": "items(id,snippet(publishedAt,title,description,thumbnails/medium/url),contentDetails/duration,statistics(viewCount,likeCount,dislikeCount,commentCount))",
		"maxResults": 50
	});
}

exports.isChannelLoaded = function(channelId) {
	return subscriptions[channelId] != undefined;
}

exports.getChannelName = function(channelId) {
	return subscriptions[channelId].name;
};

exports.getChannelThumb = function(channelId) {
	return subscriptions[channelId].thumb;
};

exports.getChannelUploads = function(channelId) {
	return subscriptions[channelId].uploads;
};
