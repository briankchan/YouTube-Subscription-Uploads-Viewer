/**
 * A bunch of wrappers for jQuery's ajax function for use with the YoutTube Data API.
 */

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

function sendRequest(resource, method, options) {
	var deferred = $.Deferred();
	
	options = $.extend({}, options);
	//options.key = API_KEY;
	
	$.ajax({
		url: URL + resource,
		type: method,
		headers: { authorization: "Bearer " + authToken },
		data: options
	}).fail(function(jqXHR, textStatus, errorThrown) {
		console.error(textStatus + " " + errorThrown + " trying to access YouTube Data API");
		deferred.reject(textStatus, errorThrown);
	}).done(function(data, textStatus, jqXHR) {
		deferred.resolve(data);
	});
	
	return deferred.promise();
}

function YoutubeResource(resource) {
	this.resource = resource;
}
YoutubeResource.prototype.ajax = function(method, options) {
	return sendRequest(this.resource, method, options);
}
YoutubeResource.prototype.get    = function(options) { return this.ajax("GET", options); }
YoutubeResource.prototype.post   = function(options) { return this.ajax("POST", options); }
YoutubeResource.prototype.put    = function(options) { return this.ajax("PUT", options); }
YoutubeResource.prototype.delete = function(options) { return this.ajax("DELETE", options); }
