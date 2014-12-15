/**
 * A wrapper for YouTube's data API and Chrome's Identity API.
 * authorize() needs to be called before anything else can be used.
 */

var YoutubeApi = require("./youtube-api.js");

var subscriptions = exports.subscriptions = {}; //TODO: stop exporting this (debug code)

function setAuthToken(authResult) {
	YoutubeApi.setAuthToken(authResult);
};

exports.authorize = function(interactive) {
	var deferred = $.Deferred();
	
	chrome.identity.getAuthToken({ interactive: interactive }, function(authResult) {
		if (authResult) {
			if(!authResult.error) {
				setAuthToken(authResult);
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

exports.loadSubscriptionsVideos = function() {
	var deferred = $.Deferred();
	
	if(subscriptions.length > 0) {
		$.each(subscriptions, function(id, sub) {
			loadChannelUploads(id);
		});
		deferred.resolve(subscriptions);
	} else {
		loadSubscriptions().done(function(response) {
			handleSubscriptionsResponse(response).done(function() {
				deferred.resolve(subscriptions);
			});
		});
	}
	
	return deferred.promise();
};

function loadSubscriptions() {
	return YoutubeApi.subscriptions.get({
		"mine": true,
		"part": "id,snippet",
		"fields": "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
		"maxResults": 50,
		"order": "alphabetical"
	});
}

function handleSubscriptionsResponse(response) {
	$.each(response.items, function(i, sub) {
		var id = sub.snippet.resourceId.channelId;
		
		subscriptions[id] = {
			name: sub.snippet.title,
			thumb: sub.snippet.thumbnails.default.url
		};
		
		loadChannelUploads(id);
	});
	
	var deferred  = $.Deferred();
	if (response.nextPageToken) {
		loadSubscriptionsNextPage(response.nextPageToken).done(function(nextResponse) {
			handleSubscriptionsResponse(nextResponse).done(function() {
				deferred.resolve();
			});
		});
	}
	else deferred.resolve();
	return deferred.promise();
}

function loadSubscriptionsNextPage(nextPageToken) {
	return YoutubeApi.subscriptions.get({
		mine: true,
		part: "snippet",
		fields: "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
		maxResults: 50,
		order: "alphabetical",
		"pageToken": nextPageToken
	});
}

function loadChannelUploads(channelId) {
	//get id of uploads playlist
	YoutubeApi.channels.get({
		"id": channelId,
		"part": "contentDetails",
		"fields": "items/contentDetails/relatedPlaylists/uploads"
	}).done(function(channelJSON) {
		//get upload videos in playlist
		YoutubeApi.playlistItems.get({
			"playlistId": channelJSON.items[0].contentDetails.relatedPlaylists.uploads,
			"part": "contentDetails",
			"fields": "items/contentDetails/videoId",
			"maxResults": 50
		}).done(function(uploadsJSON) {
			//save id's of videos
			var subscription = subscriptions[channelId];
			subscription.videos = {};
			var videoIds = "";
			$.each(uploadsJSON.items, function(i, video) {
				var videoId = video.contentDetails.videoId;
				subscription.videos[videoId] = {};
				videoIds += videoId + ",";
			});
			//cut out last comma
			videoIds = videoIds.slice(0, -1);
			
			//get details of videos
			YoutubeApi.videos.get({
				"id": videoIds,
				"part": "id,snippet,contentDetails,statistics",
				"fields": "items(id,snippet(publishedAt,title,description,thumbnails/medium/url),contentDetails/duration,statistics(viewCount,likeCount,dislikeCount,commentCount))",
				"maxResults": 50
			}).done(function(videoJSON) {
				$.each(videoJSON.items, function(i, videoJSON) {
					var video = subscription.videos[videoJSON.id];
					
					video.uploader = subscription.name;
					video.uploaderThumb = subscription.thumb;
					video.title = videoJSON.snippet.title;
					video.desc = videoJSON.snippet.description;
					video.thumb = videoJSON.snippet.thumbnails.medium.url;
					video.time = videoJSON.snippet.publishedAt;
					video.dur = videoJSON.contentDetails.duration;
					video.views = videoJSON.statistics.viewCount;
					video.likes = videoJSON.statistics.likeCount;
					video.dislikes = videoJSON.statistics.dislikeCount;
					video.comments = videoJSON.statistics.commentCount;
				});
			});
		});
	});
}

exports.getChannelUploads = function(channelId) {
	return subscriptions[channelId].videos;
};
