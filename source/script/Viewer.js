/**
 * Main script for viewer.html that connects everything to the UI
 */

require ("angular");
var $ = require("jquery");

var backgroundPage = chrome.extension.getBackgroundPage();

var HtmlLinkify = require("html-linkify");
var VideoManager = require("./VideoObjectManager.js");

var currentView = localStorage.currentView;

var app = angular.module('ytUploadsViewer', []);

//angular.module('modelDemo', []).
//		config(function ($routeProvider) {
//			$routeProvider.
//					when('/', {
//						controller: 'AuthorListCtrl',
//						templateUrl: 'list.html'
//					}).
//					otherwise({
//						redirectTo: '/'
//					});
//		});

app.controller("channelsController", ['$scope', 'videosModel', function($scope, videosModel) {
	$scope.channels = videosModel.channels;
	
	$scope.select = function(channel) {
		videosModel.setSelected(channel);
	};
	
	$scope.isSelected = function(channel) {
		return channel === videosModel.selected;
	};
}]);

app.controller("videosController", ["$scope", "$sce", "videosModel", function($scope, $sce, videosModel) {
	$scope.videosModel = videosModel;
	
	$scope.getChannelId = VideoManager.getChannel;
	$scope.getChannelName = function(video) { return backgroundPage.getChannelName($scope.getChannelId(video)); };
	$scope.getChannelThumb = function(video) { return backgroundPage.getChannelThumb($scope.getChannelId(video)); };
	
	$scope.getId = VideoManager.getId;
	$scope.getThumbnail = VideoManager.getThumbnail;
	$scope.getDuration = VideoManager.getDuration;
	$scope.getTitle = VideoManager.getTitle;
	$scope.getRawUploadTime = VideoManager.getUploadTime;
	$scope.getUploadTime = function(video) {
		return new Date(VideoManager.getUploadTime(video)).toLocaleString();
	};
	$scope.getDescription = function(video) {
		return $sce.trustAsHtml(parseDescription(VideoManager.getDescription(video)));
	};
	function parseDescription(text) {
		return HtmlLinkify(text.replace(/\n/g, "<br />"), { attributes: { target: "_blank" }, escape: false });
	}
}]);
app.filter('orderObjectBy', function() {
	return function(items, field, reverse) {
		var filtered = [];
		angular.forEach(items, function(item) {
			filtered.push(item);
		});
		filtered.sort(function (a, b) {
			return (a[field] > b[field] ? 1 : -1);
		});
		if(reverse) filtered.reverse();
		return filtered;
	};
});
app.service("videosModel", [function() {
	this.channels = backgroundPage.getChannels();
	
	this.selected = null;
	this.uploads = null;
	this.setSelected = function(channel) {
		this.selected = channel;
		this.uploads = channel.uploads;
	};
	
}]);

$(function() {
	//keep scrolling in nav pane from bubbling to outer window
	$('#nav').bind('mousewheel', function(e) {//TODO: move all event handlers to another module?
		var t = $(this);
		if (e.originalEvent.wheelDelta > 0 && t.scrollTop() == 0) {
			e.preventDefault();
		} else if (e.originalEvent.wheelDelta < 0 && (t.scrollTop() == t.get(0).scrollHeight - t.innerHeight())) {
			e.preventDefault();
		}
	});
	
	//backgroundPage.updateSubscriptionsPromise.done(function() {
			//displaySubscriptions();
			//backgroundPage.updateUploadsPromise.done(displayCurrentView);
	//});
	
	backgroundPage.authorizePromise.done(hideLogin).fail(showLogin); //TODO use events
	
	$("#authorizeButton").click(backgroundPage.authorize);
	
	$("#refreshButton").click(updateUploads);
	
	$("#channelControls").click(markAllWatched);
	
	$("#reload-extension-button").click(function() { chrome.runtime.reload() }); //debugging (reload ext. button)
});

function hideLogin() {
	$("#authorizeButton").hide();
	$("#refreshButton").show();
}

function showLogin() {
	$("#authorizeButton").show();
	$("#refreshButton").hide();
}

function updateUploads() {
	console.log("loading videos"); //debugging
	var start = new Date();
	
	$("#refreshButton").prop("disabled", true);
	
	backgroundPage.updateUploads().done(function() {
		var elapsed = new Date()-start;
		console.log(elapsed + "ms");
		
		$("#refreshButton").prop("disabled", false);
		//displayCurrentView();
	});
}

function markAllWatched() {
	$.each(backgroundPage.getChannelUploads(currentView), function(i, video) {
		backgroundPage.setWatched(currentView, VideoManager.getId(video)); //TODO stop doing this individually
	});
	$(window).trigger("channelUpdate" + currentView);
	$(".vid").addClass("watched");
}
