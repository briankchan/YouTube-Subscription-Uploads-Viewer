var API_KEY = "AIzaSyClOj2RmQTkYbfqL4o8mBhzx8Jwo-mNhpo";
var URL = "https://www.googleapis.com/youtube/v3/";

var authToken;

exports.channels = new YoutubeResource("channels");
exports.playlistItems = new YoutubeResource("playlistItems");
exports.subscriptions = new YoutubeResource("subscriptions");
exports.videos = new YoutubeResource("videos");

exports.setAuthToken = function(token) {
	authToken = token;
}

//function setAuthToken(token) {
//	authToken = token;
//}

function sendRequest(resource, method, options, callback) {
	if(options===undefined && typeof method === "object") {
		options = $.extend({}, method);
		method = undefined;
	} else {
		options = $.extend({}, options);
	}
	options.key = API_KEY;
	
	$.ajax({
		url: URL + resource,
		type: method,
		headers: { authorization: "Bearer " + authToken },
		data: options
	}).fail(function(xhr,statusCode,errorMessage) {
		console.error(status + " " + error + " trying to access YouTube Data API");
	}).done(callback);
}

function YoutubeResource(resource) {
	this.resource = resource;
}
YoutubeResource.prototype.ajax = function(method, options, callback) {
	sendRequest(this.resource, method, options, callback);
}
YoutubeResource.prototype.get = function(options, callback) { this.ajax("GET", options, callback); }
YoutubeResource.prototype.post = function(options, callback) { this.ajax("POST", options, callback); }
YoutubeResource.prototype.put = function(options, callback) { this.ajax("PUT", options, callback); }
YoutubeResource.prototype.delete = function(options, callback) { this.ajax("DELETE", options, callback); }
