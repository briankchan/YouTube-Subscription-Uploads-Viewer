/**
 * Main script for viewer.html that connects everything to the UI
 */

window.$ = window.jquery = require("jquery");

var backgroundPage = chrome.extension.getBackgroundPage();

var Youtube = window.Youtube = backgroundPage.Youtube;

var HtmlLinkify = require("html-linkify");
var VideoManager = require("./VideoObjectManager.js");

var currentView = localStorage.currentView;

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
	
	
	
	if(Youtube.isLoggedIn()) {
		hideLogin();
		displaySubscriptions();
		displayCurrentView();
	} else showLogin();
	
	//log in with UI when button is clicked
	$("#authorize-button").click(function() { authorize(); });
	
	$("#refresh-button").click(function() { loadSubscriptionsUploads(); });
	
	$("#reload-extension-button").click(function() { chrome.runtime.reload(); }); //debugging (reload ext. button)
});

function authorize() {
	Youtube.authorize(true).done(function() {
		hideLogin();
		backgroundPage.loadSubscriptionsListPromise.done(function() {
			Youtube.updateSubscriptions().done(function() {
				displaySubscriptions();
				backgroundPage.loadVideosPromise.done(loadSubscriptionsUploads);
			});
		});
	}).fail(showLogin);
}

function hideLogin() {
	$("#authorize-button").hide();
	$("#refresh-button").show();
}

function showLogin() {
	$("#authorize-button").show();
	$("#refresh-button").hide();
}

function displaySubscriptions() {
	console.log("drawing subs"); //debugging
	
	backgroundPage.loadSubscriptionsListPromise.done(function() {
		$.each(Youtube.getSubscriptions(), function(i, id) {
			var name = Youtube.getChannelName(id);
			$("#subscriptions").append($("<li>").text(name).click(function() {
				displayUploads(id);
			}));
		});
	});
}

function displayCurrentView() {
	if (currentView)
		displayUploads(currentView);
}

function loadSubscriptionsUploads() {
	console.log("loading videos"); //debugging
	var start = new Date();
	
	$("#refresh-button").prop("disabled", true);
	
	Youtube.updateSubscriptionsUploads().done(function() {
		var elapsed = new Date()-start;
		console.log(elapsed + "ms");
		
		$("#refresh-button").prop("disabled", false);
		displayCurrentView();
	});
}

function displayUploads(id) {
	backgroundPage.loadVideosPromise.done(function(loaded) {
		if (Youtube.isChannelLoaded(id)) {
			var uploads = getChronologicalOrder(Youtube.getChannelUploads(id));
			var thumb = Youtube.getChannelThumb(id);
			var name = Youtube.getChannelName(id);
			
			clearVideosPanel();
			$(window).scrollTop(0);
			$.each(uploads, function(i, video) {
				$("#videos").append($("<li>").append(createVideoElement(video, name, thumb)));
			});
			localStorage.currentView = currentView = id;
		} else console.error(id + " is not a valid loaded channel ID.");
	});
}

function clearVideosPanel() {
	$("#videos").empty();
}

function createVideoElement(video, uploaderName, uploaderThumb) {//TODO: move to new file
	var id = VideoManager.getId(video);
	
	var videoElement = $("<div>", { class: "vid" });
	var clickEvent = function() {
		VideoManager.setWatched(video, true);
		videoElement.addClass("watched");
	};
	if (VideoManager.getWatched(video))
		videoElement.addClass("watched");
	
	videoElement.append($("<div>", { class: "vidUploader" })
			.append(createVideoLink(id).click(clickEvent)
				.append($("<img>", { src: uploaderThumb, width: "20", class: "vidUploaderImg" }))
				.append($("<span>", { class: "vidUploaderName"}).text(uploaderName))
			)
		).append($("<div>", { class: "vidContent" })
			.append($("<div>", { class: "vidImg" })
				.append(createVideoLink(id).click(clickEvent)
					.append($("<img>", { src: VideoManager.getThumbnail(video), width: "240" }))
				)
			).append($("<div>", { class: "vidText" })
				.append($("<div>", { class: "vidTitle" })
					.append(createVideoLink(id).click(clickEvent).text(VideoManager.getTitle(video)))
				).append($("<div>", { class: "vidTime" }).text(new Date(VideoManager.getUploadTime(video)).toLocaleString()))
				.append($("<div>", { class: "vidDesc" }).html(parseDescription(VideoManager.getDescription(video))))
			)
		);
	return videoElement;
}

function parseDescription(text) {
	return HtmlLinkify(text.replace(/\n/g, "<br />"), { escape: false });
}

function createVideoLink(videoId) {
	return $("<a>", { href: "https://www.youtube.com/watch?v="+videoId, target: "_blank" });
}

function getChronologicalOrder(videos) {
	var output = $.extend([], videos);
	
	output.sort(function(a, b) {
		//newest videos first
		return new Date(VideoManager.getUploadTime(b)) - new Date(VideoManager.getUploadTime(a)); 
	});
	
	return output;
}
