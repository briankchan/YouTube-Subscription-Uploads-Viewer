window.$ = window.jquery = require("jquery");
var htmlLinkify = require("html-linkify");

window.YoutubeApi = require("./youtube-api.js");

var apiKey = 'AIzaSyClOj2RmQTkYbfqL4o8mBhzx8Jwo-mNhpo';

var ytapiLoaded = false;

var subscriptions = {};

//var initedGapi;

$(function() {
	$('#nav').bind('mousewheel', function(e) {
		var t = $(this);
		if (e.originalEvent.wheelDelta > 0 && t.scrollTop() == 0) {
			e.preventDefault();
		} else if (e.originalEvent.wheelDelta < 0 && (t.scrollTop() == t.get(0).scrollHeight - t.innerHeight())) {
			e.preventDefault();
		}
	});
	
	//console.log(initedGapi);
	//console.log(gapi.client.getApiKey());
	
	$("#authorize-button").click(function() {
		authorize(true, populateSubscriptions);
	}); //log in with UI when button is clicked
	setTimeout(function() { authorize(false, populateSubscriptions); }, 1); //attempt to log in without UI
});

//window.initGapi = function() {
//	initedGapi = true;
//	console.log("init gapi");
//	gapi.client.setApiKey(apiKey);
//
//	$("#authorize-button").click(function() {
//		console.log("asdf");
//		authorize(true, populateSubscriptions);
//	}); //log in with UI when button is clicked
//	setTimeout(function() { authorize(false, populateSubscriptions); }, 1); //attempt to log in without UI
//}

function authorize(interactive, callback) {
	console.log("authorizing");
	//gapi.auth.init();
	chrome.identity.getAuthToken({ interactive: interactive, scopes: ["https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/youtube"] }, function(authResult) {
		window.authToken = authResult;
		if (authResult && !authResult.error) {
			
			//logged in
			$("#authorize-button").css("visibility", "hidden");
			YoutubeApi.setAuthToken(authResult);
			//loadYtapi(callback);
			callback();
		} else {
			//not logged in
			$("#authorize-button").css("visibility", "");
		}
	});
}


function loadYtapi(callback) {
	gapi.client.load('youtube', 'v3', function() {
		ytapiLoaded = true;
		callback();
	});
}

function ytapi(resource, method, params, callback) {
	//if (!ytapiLoaded)
	//	setTimeout(function() { ytapi(resource, method, params, callback); }, 250);
	//else
	//	gapi.client.youtube[resource][method](params).execute(function(response) {
	//		if (response.error)
	//			if (response.code == 401 && response.message == "Invalid Credentials")
	//				authorize(false, function() { ytapi(resource, method, params, callback); });
	//			else
	//				console.error("Error " + response.code + ": " + response.message);
	//		else
	//			callback(response);
	//	}); //create and execute request to google api
}

/**
 * Gets subscriptions
 */
function populateSubscriptions() {
	//ytapi("subscriptions", "list", {
	YoutubeApi.subscriptions.get({
		"mine": true,
		"part": "id,snippet",
		//"fields": "nextPageToken,items(id,snippet(title,resourceId/channelId,thumbnails))",
		"maxResults": 50,
		"order": "alphabetical"
	}, populateSubscriptionsHelper);
}

function populateSubscriptionsHelper(response) {
	console.log(response);
	var subs = response.items;
	$.each(subs, function(i, sub) {
		subscriptions[sub.snippet.resourceId.channelId] = {
			"name": sub.snippet.title,
			"thumb": sub.snippet.thumbnails.default.url
		};
	});
	
	if (response.nextPageToken) {
		//ytapi("subscriptions", "list", {
		YoutubeApi.subscriptions.get({
			"mine": true,
			"part": "snippet",
			"fields": "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
			"maxResults": 50,
			"order": "alphabetical",
			"pageToken": response.nextPageToken
		}, populateSubscriptionsHelper);
	} else
	//done loading
		$.each(subscriptions, function(id, sub) { //first loop to populate list of subscriptions
			$("#subscriptions").append($("<li>").text(sub.name).click(function() {
				//on click, load uploads for this subscription
				clearUploads();
				loadUploads(id);
			}));
		});
	
	$.each(subscriptions, function(id, name) { //second loop to get uploads from subscriptions
		
	});
}

function clearUploads() {
	$("#videos").empty();
}

function loadUploads(channelId) {
	//get id of uploads playlist
	//ytapi("channels", "list", {
	YoutubeApi.channels.get({
		"id": channelId,
		"part": "contentDetails",
		"fields": "items/contentDetails/relatedPlaylists/uploads"
	}, function(channelJSON) {
		//get upload videos in playlist
		//ytapi("playlistItems", "list", {
		YoutubeApi.playlistItems.get({
			"playlistId": channelJSON.items[0].contentDetails.relatedPlaylists.uploads,
			"part": "contentDetails",
			"fields": "items/contentDetails/videoId",
			"maxResults": 50
		}, function(uploadsJSON) {
			//save id's of videos
			console.log(uploadsJSON);
			var subscription = subscriptions[channelId];
			var videoIds = "";
			$.each(uploadsJSON.items, function(i, video) {
				var videoId = video.contentDetails.videoId;
				subscription[videoId] = {};
				videoIds += videoId + ",";
			});
			
			//cut out last comma
			videoIds = videoIds.slice(0, -1);
			console.log(videoIds);
			//get details of videos
			//ytapi("videos", "list", {
			YoutubeApi.videos.get({
				"id": videoIds,
				"part": "id,snippet,contentDetails,statistics",
				"fields": "items(id,snippet(publishedAt,title,description,thumbnails/medium/url),contentDetails/duration,statistics(viewCount,likeCount,dislikeCount,commentCount))",
				"maxResults": 50
			}, function(videoJSON) {
				$.each(videoJSON.items, function(i, videoJSON) {
					//create video object
					var video = subscription[videoJSON.id];
					
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
					
					$("#videos").append(createVideoElement(video));
				});
			});
			
		});
	});
}

/**
 * creates html list item to represent given video object
 * @param {Object (video)} video video that list item will represent
 * @returns {jQuery} list item that was created
 */
function createVideoElement(video) {
	return $("<li>")
			.append($("<div>", { "class": "vid" })
				.append($("<div>", { "class": "vidUploader" })
					.append($("<a>", { "href": "https://www.youtube.com/watch?v="+video.id, "target": "_blank" })
						.append($("<img>", { "src": video.uploaderThumb, "width": "20", "class": "vidUploaderImg" }))
						.append($("<span>").text(video.uploader)))
				).append($("<div>", { "class": "vidContent" })
					.append($("<div>", { "class": "vidImg" })
						.append($("<a>", { "href": "https://www.youtube.com/watch?v="+video.id, "target": "_blank" })
							.append($("<img>", { "src": video.thumb, "width": "240" }))
						)
					).append($("<div>", { "class": "vidText" })
						.append($("<a>", { "href": "https://www.youtube.com/watch?v="+video.id, "target": "_blank" })
							.append($("<div>", { "class": "vidTitle" }).text(video.title))
						).append($("<div>", { "class": "vidTime" }).text(new Date(video.time).toLocaleString()))
						.append($("<div>", { "class": "vidDesc" }).html(linkify(video.desc.replace(/\n/g, "<br />"))))
								//replace line breaks with <br> tags; convert URLs to links
					)
				)
			);
}

function linkify(text) {
	return htmlLinkify(text, { escape: false });
}
