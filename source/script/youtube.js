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
	var deferred = $.Deferred();
	
	var auth = new OAuth2("google", {
		client_id: "285678490171-1v3db8vbi7108iukl35ojiub87ja50s7.apps.googleusercontent.com",
		client_secret: "m7ozSCV_hGNTXKwR_aW_7q5O",
		api_scope: "https://www.googleapis.com/auth/youtube.readonly"
	});
	console.log("has token: " + auth.hasAccessToken());
	console.log("is expired: " + auth.isAccessTokenExpired()); //debugging
	window.auth = auth; //debugging
	auth.authorize(function() {
		var token = auth.getAccessToken();
		YoutubeApi.setAuthToken(token);
		console.log(token);  //debugging
		deferred.resolve();
	});
	
	//chrome.identity.launchWebAuthFlow({
	//	url: "https://accounts.google.com/o/oauth2/auth?response_type=code" +
	//	"&scope=" + "https://www.googleapis.com/auth/youtube.readonly" + 
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

exports.loadVideos = function() {
	Storage.get("channels").done(function(storage) {
		console.log(storage);
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
