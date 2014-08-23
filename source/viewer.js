// var clientId = '285678490171-jje98f1oqbu587msoegirdd7v6qjjtfq.apps.googleusercontent.com';

// var scopes = 'https://www.googleapis.com/auth/youtube.readonly';

var apiKey = 'AIzaSyClOj2RmQTkYbfqL4o8mBhzx8Jwo-mNhpo';

var ytapiLoaded = false;

var subscriptions = [];

$(function() {
    $('#nav').bind('mousewheel', function(e) {
		var t = $(this);
		if(e.originalEvent.wheelDelta > 0 && t.scrollTop() == 0) {
			e.preventDefault();
		} else if(e.originalEvent.wheelDelta < 0 && (t.scrollTop() == t.get(0).scrollHeight - t.innerHeight())) {
			e.preventDefault();
		}
	});
});

function initGapi() {
	gapi.client.setApiKey(apiKey);
	
	$("#authorize-button").click(function() { authorize(true) }); //log in with UI when button is clicked
	setTimeout(function() { authorize(false) }, 1); //attempt to log in without UI
	
	//gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);
}

function authorize(interactive) {
	//gapi.auth.init();
	chrome.identity.getAuthToken({ "interactive": interactive }, function(authResult) {
//	chrome.identity.launchWebAuthFlow({ "url": "https://accounts.google.com/o/oauth2/auth?client_id=285678490171-jje98f1oqbu587msoegirdd7v6qjjtfq.apps.googleusercontent.com&scope=https://www.googleapis.com/auth/youtube.readonly", "interactive": interactive }, function(authResult) {
		console.log(authResult);
		if (authResult && !authResult.error) {
			//logged in
			$("#authorize-button").css("visibility", "hidden");

			gapi.auth.setToken({ "access_token": authResult });
			loadYtapi();
		} else {
			//not logged in
			$("#authorize-button").css("visibility", "");
		}
	});
}


function loadYtapi() {
	gapi.client.load('youtube', 'v3', function() {
		ytapiLoaded = true;
		populateSubscriptions();
	});
}

function ytapi(resource, method, params, callback) {
	if(!ytapiLoaded)
		setTimeout(function() { ytapi(resource, method, params, callback) }, 250);
	else
		gapi.client.youtube[resource][method](params).execute(callback); //create and execute request to google api
}

/**
 * Gets subscriptions
 */
function populateSubscriptions() {
	ytapi("subscriptions", "list", {
		"mine": true,
		"part": "id,snippet",
		//"fields": "nextPageToken,items(id,snippet(title,resourceId/channelId,thumbnails))",
		"maxResults": 50,
		"order": "alphabetical"
	}, populateSubscriptionsHelper);
}

/**
 * 
 */
function populateSubscriptionsHelper(response) {
	console.log(response);
	var subs = response.result.items;
	$.each(subs, function(i, sub) {
		subscriptions.push({
			"name": sub.snippet.title,
			"id": sub.snippet.resourceId.channelId
		});
	});
	
	if(response.nextPageToken) {
		ytapi("subscriptions", "list", {
			"mine": true,
			"part": "snippet",
			"fields": "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
			"maxResults": 50,
			"order": "alphabetical",
			"pageToken": response.nextPageToken
		}, populateSubscriptionsHelper);
	} else
		//done loading
		$.each(subscriptions, function(i, subscription) { //first loop to populate list of subscriptions
			$("#subscriptions").append($("<li>").text(subscription.name).click(function() {
				//on click, load uploads for this subscription
				clearUploads();
				loadUploads(subscription.id);
			}));
		});
		
		$.each(subscriptions, function(i, val) { //second loop to get uploads from subscriptions
			
		});
}

function clearUploads() {
	$("#videos").empty();
}

function loadUploads(channelId) {
	ytapi("channels", "list", {
		"id": channelId,
		"part": "contentDetails",
		"fields": "items/contentDetails/relatedPlaylists/uploads"
	}, function(channel) {
		ytapi("playlistItems", "list", {
			"playlistId": channel.items[0].contentDetails.relatedPlaylists.uploads,
			"part": "snippet",
			"fields": "items/snippet(publishedAt,title,description,thumbnails/medium/url,resourceId/videoId)",
			"maxResults": 50
		}, function(uploads) {
			console.log(uploads);
			$.each(uploads.items, function(i, vid) {
				var details = vid.snippet;
				$("#videos").append(createVideo(details.title, details.description, details.thumbnails.medium.url, details.publishedAt, details.resourceId.videoId));
			});
		});
	});
}

function createVideo(title, desc, thumb, time, id) {
	//return $("<li>").html("<img src='"+ thumb + "' /><a href='https://www.youtube.com/watch?v=" + id + "'>" + title + "</a>");
	return $("<li>")
			.append($("<div>", { "class": "vid" })
				.append($("<div>", { "class": "vidTitle" })
					.append($("<a>", { "href": "https://www.youtube.com/watch?v="+id, "target": "_blank" }).text(title))
				).append($("<div>", { "class": "vidContent" })
					.append($("<div>", { "class": "vidImg" })
						.append($("<img>", { "src": thumb, "width": "240" }))
					).append($("<div>", { "class": "vidDesc" }).html(desc.replace(/\n/g, "<br />")).linkify())
							//replace line breaks with <br> tags; convert URLs to links
				)
			);
}
