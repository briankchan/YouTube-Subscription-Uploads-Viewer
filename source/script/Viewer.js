/**
 * Main script for viewer.html that connects everything to the UI
 */

require ("angular");
var $ = require("jquery");

var backgroundPage = chrome.extension.getBackgroundPage();

var HtmlLinkify = require("html-linkify");

var currentView = localStorage.currentView;

var app = angular.module('ytUploadsViewer', []);

//app.config(function ($routeProvider) {
//			$routeProvider.
//					when('/', {
//						controller: 'AuthorListCtrl',
//						templateUrl: 'list.html'
//					}).
//					otherwise({
//						redirectTo: '/'
//					});
//		});

app.controller("channelsController", ["$scope", "currentView", "background", function($scope, currentView, background) {
	$scope.subscriptions = background.getSubscriptionIds();
	
	$scope.getChannelName = background.getChannelName;
	$scope.getChannelThumb = background.getChannelThumb;
	$scope.getUnwatchedCount = function(channelId) {
		if(channelId)
			return background.getUnwatchedCount(channelId);
		else {
			var count = 0;
			$.each($scope.subscriptions, function(i, channelId) {
				count += background.getUnwatchedCount(channelId);
			});
			return count;
		}
	};
	
	$scope.select = currentView.setSelected;
	$scope.isSelected = currentView.isSelected;
}]);
app.controller("videosController", ["$scope", "$sce", "currentView", "background", function($scope, $sce, currentView, background) {
	$scope.getVideos = function() { return currentView.videos; };
	
	$scope.getChannelName = function(video) { return background.getChannelName(video.channel); };
	$scope.getChannelThumb = function(video) { return background.getChannelThumb(video.channel); };
	
	$scope.formatUploadTime = function(time) { return new Date(time).toLocaleString(); };//TODO: move to directives
	$scope.formatDescription = function(desc) { 
		return $sce.trustAsHtml(HtmlLinkify(desc.replace(/\n/g, "<br />"), {attributes:{target:"_blank"}, escape:false}));
	};
	
	$scope.markWatched = background.setWatched;
	$scope.markUnwatched = background.setUnwatched;
	$scope.isWatched = background.isWatched;
}]);
app.service("currentView", function() {
	var that = this;
	this.selected = null;
	this.videos = null;
	this.setSelected = function(channel) {
		if(channel) {
			that.selected = channel;
			that.videos = backgroundPage.getChannelUploads(channel);
		} else {
			that.selected = null;
			that.videos = [];
			$.each(backgroundPage.getSubscriptionIds(), function(i, channelId) {
				$.merge(that.videos, backgroundPage.getChannelUploads(channelId));
			});
		}
	};
	this.isSelected = function(channel) {
		return that.selected == channel;
	}
});
app.factory("background", function() {
	return backgroundPage;
});
app.filter('orderObjectBy', function() {
	return function(items, field, reverse) {
		var filtered = [];
		angular.forEach(items, function(item, key) {
			item.key = key;
			filtered.push(item);
		});
		filtered.sort(function (a, b) {
			return (a[field] > b[field] ? 1 : -1);
		});
		if(reverse) filtered.reverse();
		return filtered;
	};
});

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
		backgroundPage.setWatched(currentView, video.id); //TODO stop doing this individually
	});
	$(window).trigger("channelUpdate" + currentView);
	$(".vid").addClass("watched");
}
