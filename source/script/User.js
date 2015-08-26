
var Storage = require("./Storage.js");

var users;

var user;

exports.loadUsers = function() {
	return Storage.get("users").done(function(value) {
		users = (typeof value === "object") ? value : {};
	})
};

exports.setUser = function(id) {
	if(!users[id]) {
		users[id] = {
			subscriptions: {}
		};
	}
	user = users[id];
};

exports.setSubscriptions = function(subs) {
	//TODO filter + handle deleted subs
	
	$.each(subs, function(i, id) {
		if(!$.isPlainObject(user.subscriptions[id])) {
			user.subscriptions[id] = {
				watched: [],
				unwatchedCount: 0
			}
		}
	});
	
	Storage.set("users", users);
};

exports.getSubscriptionIds = function() {
	return Object.keys(user.subscriptions);
};

exports.setWatched = function(channelId, videoId) {
	if(!exports.isWatched(channelId, videoId)) {
		var channel = user.subscriptions[channelId];
		var watched = channel.watched;
		watched.push(videoId);
		if (watched.length > 100)
			watched.shift();
		
		channel.unwatchedCount--;
		
		Storage.set("users", users);
	}
};

exports.setUnwatched = function(channelId, videoId) {
	var channel = user.subscriptions[channelId];
	var watched = channel.watched;
	var i = watched.indexOf(videoId);
	if(i >= 0) {
		watched.splice(i, 1);
		channel.unwatchedCount++;
		Storage.set("users", users);
	}
};

exports.isWatched = function(channelId, videoId) {
	var watched = user.subscriptions[channelId].watched;
	return watched.indexOf(videoId) >= 0;
};

exports.getWatchedVideos = function(channelId) {
	var watched = user.subscriptions[channelId].watched;
	return $.merge([], watched);
};

exports.updateWatchedCount = function(channelId, uploads) {
	var watched = exports.getWatchedVideos(channelId);
	var unwatched = $.grep(uploads, function(video, i) {
		return watched.indexOf(video.id) < 0;
	});
	user.subscriptions[channelId].unwatchedCount = unwatched.length;
	
	Storage.set("users", users);
};

exports.getUnwatchedCount = function(channelId) {
	return user.subscriptions[channelId].unwatchedCount;
};
