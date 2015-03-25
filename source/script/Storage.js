/**
  * A wrapper for Chrome's extension local storage API.
  */

exports.get = function(key) {
	var deferred = $.Deferred();
	
	chrome.storage.local.get(key, function(value) {
		if(chrome.runtime.lastError)
			deferred.reject(chrome.runtime.lastError.string);
		else
			deferred.resolve(value[key]);
	});
	
	return deferred.promise();
};

exports.set = function(key, value) {
	var deferred = $.Deferred();
	
	var pair = {};
	pair[key] = value;
	
	chrome.storage.local.set(pair, function() {
		if(chrome.runtime.lastError)
			deferred.reject(chrome.runtime.lastError.string);
		else
			deferred.resolve();
	});
	
	return deferred.promise();
};

exports.clear = function() {
	var deferred = $.Deferred();
	
	chrome.storage.local.clear(function() {
		if(chrome.runtime.lastError)
			deferred.reject(chrome.runtime.lastError.string);
		else
			deferred.resolve();
	});
	
	return deferred.promise();
};
