
var BASE_URL = "https://www.googleapis.com/youtube/v3/";
var API_KEY = "AIzaSyClOj2RmQTkYbfqL4o8mBhzx8Jwo-mNhpo";

module.exports = YoutubeResource;

function YoutubeResource(resource, authenticated) {
	this.resource = resource;
	this.authenticated = (authenticated == true);
}

YoutubeResource.setAuthToken = function(token) {
	YoutubeResource.authToken = token;
};

YoutubeResource.prototype.get    = function(options) { return this.ajax("GET", options); };
YoutubeResource.prototype.post   = function(options) { return this.ajax("POST", options); };
YoutubeResource.prototype.put    = function(options) { return this.ajax("PUT", options); };
YoutubeResource.prototype.delete = function(options) { return this.ajax("DELETE", options); };
YoutubeResource.prototype.ajax   = function(method, options) {
	return sendRequest(this.resource, method, options, this.authenticated);
};

function sendRequest(resource, method, options, authenticated) {
	var deferred = $.Deferred();
	
	var settings = {
		url: BASE_URL + resource,
		type: method,
		data: options
	};
	
	if(authenticated) {
		settings.headers = { authorization: "Bearer " + YoutubeResource.authToken }
	} else {
		settings.data.key = API_KEY;
	}
	
	$.ajax(settings).fail(function(jqXHR, textStatus, errorThrown) {
		
		if(jqXHR.status == 500 && errorThrown == "OK") { //try again for 500 OK errors
			$.ajax(settings).fail(function(jqXHR, textStatus, errorThrown) {
				deferred.reject(textStatus, errorThrown);
				window.jqXHR = jqXHR; //debugging
			}).done(function(data, textStatus, jqXHR) {
				deferred.resolve(data);
				console.debug("second attempt succeeded"); //debugging
			});
		} else {
			deferred.reject(textStatus, errorThrown);
			window.jqXHR = jqXHR; //debugging
		}
	}).done(function(data, textStatus, jqXHR) {
		deferred.resolve(data);
	});
	
	return deferred.promise();
}
