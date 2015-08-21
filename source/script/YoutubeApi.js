/**
 * A bunch of wrappers for jQuery's ajax function for use with the YoutTube Data API.
 * Authentication token needs to be set using setAuthToken before functions can be used.
 */

var YoutubeResource = require("./YoutubeResource.js");
var VideoManager = require("./VideoObjectManager.js");

var channels = new YoutubeResource("channels");
var playlistItems = new YoutubeResource("playlistItems");
var subscriptions = new YoutubeResource("subscriptions");
var videos = new YoutubeResource("videos");

//debugging
var auth = window.auth = new OAuth2("google", {
	client_id: "285678490171-1v3db8vbi7108iukl35ojiub87ja50s7.apps.googleusercontent.com",
	client_secret: "m7ozSCV_hGNTXKwR_aW_7q5O",
	api_scope: "https://www.googleapis.com/auth/youtube.readonly"
});
updateAuthToken();

exports.authorize = function() {
	var deferred = $.Deferred();
	
	console.log("has token: " + auth.hasAccessToken());
	console.log("is expired: " + auth.isAccessTokenExpired()); //debugging
	if(!auth.hasAccessToken() || auth.isAccessTokenExpired()) {
		auth.authorize(function() {
			updateAuthToken();
			deferred.resolve();
		});
	} else {
		deferred.resolve();
	}
	
	//chrome.identity.launchWebAuthFlow({
	//	url: "https://accounts.google.com/o/oauth2/authentication?response_type=code" +
	//	"&scope=" + "https://www.googleapis.com/authentication/youtube.readonly" + 
	//	"&redirect_uri=" + "urn:ietf:wg:oauth:2.0:oob" + 
	//	"&client_id=285678490171-jje98f1oqbu587msoegirdd7v6qjjtfq.apps.googleusercontent.com",
	//	interactive: interactive
	//}, function(responseUrl) {
	//	console.log(chrome.runtime.lastError);
	//	console.log(responseUrl);
	//	deferred.reject();
	//});
	
	//chrome.identity.getAuthToken({ interactive: interactive }, function(authResult) {
	//	if(chrome.runtime.lastError) {
	//		deferred.reject(chrome.runtime.lastError.message);
	//		console.log(chrome.runtime.lastError.message)
	//	} else if (authResult) {
	//		if(!authResult.error) {
	//			YoutubeApi.setAuthToken(authResult);
	//			deferred.resolve();
	//		} else {
	//			deferred.reject(authResult.error);
	//		}
	//	} else {
	//		deferred.reject();
	//	}
	//});
	
	return deferred.promise();
};

function updateAuthToken() {
	var token = auth.getAccessToken();
	YoutubeResource.setAuthToken(token);
	console.log(token);  //debugging
}

exports.isLoggedIn = function() {
	return auth.hasAccessToken();
};

exports.getUserId = function() {
	var deferred = $.Deferred();
	
	channels.get({
		mine: true,
		part: "id",
		fields: "items/id"
	}).done(function(response) {
		deferred.resolve(response.items[0].id);
	});
	
	return deferred.promise();
};

exports.getSubscriptions = function() {
	var deferred = $.Deferred();
	
	subscriptions.get({
		mine: true,
		part: "id,snippet",
		fields: "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))", //TODO only use default thumb?
		maxResults: 50,
		order: "alphabetical"
	}).done(function(response) {
		getSubscriptionsNextPage(response).done(function(items) {
			var subscriptions = {};
			
			$.each(items, function(i, sub) {
				var id = sub.snippet.resourceId.channelId;
				subscriptions[id] = {
					name: sub.snippet.title,
					thumb: sub.snippet.thumbnails.default.url
				};
			});
			
			deferred.resolve(subscriptions);
		});
	});
	
	return deferred.promise();
};

function getSubscriptionsNextPage(response) {
	var deferred = $.Deferred();
	
	if(response.nextPageToken) {
		subscriptions.get({
			mine: true,
			part: "snippet",
			fields: "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
			maxResults: 50,
			order: "alphabetical",
			pageToken: response.nextPageToken
		}).done(function(newResponse) {
			getSubscriptionsNextPage(newResponse).done(function(items) {
				deferred.resolve(response.items.concat(items));
			});
		});
	} else deferred.resolve(response.items);
	
	return deferred.promise();
}

exports.getChannelUploadsPlaylist = function(channelId) {
	var deferred = $.Deferred();
	
	channels.get({
		id: channelId,
		part: "contentDetails",
		fields: "items/contentDetails/relatedPlaylists/uploads"
	}).done(function(response) {
		deferred.resolve(response.items[0].contentDetails.relatedPlaylists.uploads);
	});
	
	return deferred.promise();
};

exports.getPlaylistItems = function(playlistId) {
	var deferred = $.Deferred();
	
	playlistItems.get({
		playlistId: playlistId,
		part: "contentDetails",
		fields: "items/contentDetails/videoId",
		maxResults: 50
	}).done(function(response) {
		var videoIds = $.map(response.items, function(video, i) {
			return video.contentDetails.videoId;
		});
		
		deferred.resolve(videoIds);
	});
	
	return deferred;
};

exports.getVideoDetails = function(videoIds) {
	var deferred = $.Deferred();
	
	videos.get({
		id: videoIds,
		part: "id,snippet,contentDetails,statistics",
		fields: "items(id,snippet(publishedAt,channelId,title,description,thumbnails/medium/url),contentDetails/duration,statistics(viewCount,likeCount,dislikeCount,commentCount))",
		maxResults: 50
	}).done(function(response) {
		var videos = [];
		
		$.each(response.items, function(i, videoJSON) {
			var video = VideoManager.createNewVideo();
			VideoManager.setId(video, videoJSON.id);
			VideoManager.setTitle(video, videoJSON.snippet.title);
			VideoManager.setChannel(video, videoJSON.snippet.channelId);
			VideoManager.setDescription(video, videoJSON.snippet.description);
			VideoManager.setThumbnail(video, videoJSON.snippet.thumbnails.medium.url);
			VideoManager.setUploadTime(video, videoJSON.snippet.publishedAt);
			VideoManager.setDuration(video, parseVideoDuration(videoJSON.contentDetails.duration));
			VideoManager.setViewCount(video, parseInt(videoJSON.statistics.viewCount));
			VideoManager.setLikesCount(video, parseInt(videoJSON.statistics.likeCount));
			VideoManager.setDislikesCount(video, parseInt(videoJSON.statistics.dislikeCount));
			VideoManager.setCommentsCount(video, parseInt(videoJSON.statistics.commentCount));
			
			videos.push(video);
		});
		
		deferred.resolve(videos);
	});
	
	return deferred.promise();
};

function parseVideoDuration(duration) {
	var h = /(\d+)(?:H)/g.exec(duration);
	var m = /(\d+)(?:M)/g.exec(duration);
	var s = /(\d+)(?:S)/g.exec(duration);
	
	var result = "";
	
	if(h) {
		result += h[1] + ":";
		result += (m ? padTime(m[1]) : "00") + ":";
	} else {
		result += (m ? m[1] : "0") + ":";
	}
	result += (s ? padTime(s[1]) : "00");
	
	return result;
}

function padTime(n) {
	return "00".substring(0, 2 - n.length) + n;
}
