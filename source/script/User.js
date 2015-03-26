
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
			watched: {}
		};
	}
	user = users[id];
};

exports.setWatched = function(channelId, videoId) {
	if(!user.watched[channelId]) {
		user.watched[channelId] = [];
	}
	var videos = user.watched[channelId];
	videos.push(videoId);
	if(videos.length > 100)
		videos.shift();
	
	Storage.set("users", users);
};

exports.setUnwatched = function(channelId, videoId) {
	var videos = user.watched[channelId];
	if(videos) {
		var i = videos.indexOf(videoId);
		if(i >= 0) {
			videos.splice(i, 1);
			Storage.set("users", users);
		}
	}
};

exports.getWatched = function(channelId, videoId) {
	var videos = user.watched[channelId];
	return videos && videos.indexOf(videoId) >= 0;
};

exports.getWatchedVideos = function(channelId) {
	var videos = user.watched[channelId];
	return (videos) ? videos : [];
};
