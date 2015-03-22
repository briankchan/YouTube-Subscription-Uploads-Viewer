
//var API_KEY = "AIzaSyClOj2RmQTkYbfqL4o8mBhzx8Jwo-mNhpo"; //not actually needed with auth tokens
var BASE_URL = "https://www.googleapis.com/youtube/v3/";

var authToken;

module.exports = YoutubeResource;
function YoutubeResource(resource) {
	this.resource = resource;
}

module.exports.setAuthToken = function(token) {
	authToken = token; //TODO put in prototype?
};
YoutubeResource.prototype.get    = function(options) { return this.ajax("GET", options); };
YoutubeResource.prototype.post   = function(options) { return this.ajax("POST", options); };
YoutubeResource.prototype.put    = function(options) { return this.ajax("PUT", options); };
YoutubeResource.prototype.delete = function(options) { return this.ajax("DELETE", options); };
YoutubeResource.prototype.ajax = function(method, options) {
	return sendRequest(this.resource, method, options);
};

function sendRequest(resource, method, options) {
	var deferred = $.Deferred();
	
	$.ajax({
		url: BASE_URL + resource,
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
