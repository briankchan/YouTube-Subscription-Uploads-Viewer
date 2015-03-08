/**
 * Main script for viewer.html that connects everything to the UI
 */

window.$ = window.jquery = require("jquery");

var HtmlLinkify = require("html-linkify");
var Youtube = window.Youtube = require("./youtube.js");
var VideoManager = require("./video-object-manager.js");
var Storage = require("./storage.js");

var currentView;

$(function() {
	//keep scrolling from bubbling to outer window
	$('#nav').bind('mousewheel', function(e) {//TODO: move all event handlers to another module?
		var t = $(this);
		if (e.originalEvent.wheelDelta > 0 && t.scrollTop() == 0) {
			e.preventDefault();
		} else if (e.originalEvent.wheelDelta < 0 && (t.scrollTop() == t.get(0).scrollHeight - t.innerHeight())) {
			e.preventDefault();
		}
	});
	
	Storage.get("subscriptions").done(function(storage) {
		Youtube.setSubscriptions((typeof storage.subscriptions === "object") ? storage.subscriptions : {});
	});
	
	//log in with UI when button is clicked
	$("#authorize-button").click(function() { authorizeAndLoad(true); });
	setTimeout(function() { authorizeAndLoad(false); }, 1); //attempt to log in without UI
	
	$("#refresh-button").click(function() { loadSubscriptionsUploads(); });
	
	
	$("#reload-extension-button").click(function() { chrome.runtime.reload(); });
});

function authorizeAndLoad(interactive) {
	Youtube.authorize(interactive).done(function() {
		$("#authorize-button").css("visibility", "hidden");
		loadSubscriptionsUploads();
	}).fail(function() {
		$("#authorize-button").css("visibility", "");
	});
}

function loadSubscriptionsUploads() {
	console.log("loading subs"); //TODO remove debug code
	var start = new Date();
	Youtube.loadSubscriptionsUploads().done(function(subscriptions) {
		var elapsed = new Date()-start;
		console.log(elapsed + "ms");
		
		if (localStorage.currentView)
			displayUploads(localStorage.currentView);
		$.each(subscriptions, function(id, sub) {
			$("#subscriptions").append($("<li>").text(sub.name).click(function() {
				displayUploads(id);
			}));
		});
		
		Storage.set("subscriptions", subscriptions);
	});
}

function displayUploads(id) {
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
				.append(createVideoLink(id).click(clickEvent)
					.append($("<div>", { class: "vidTitle" }).text(VideoManager.getTitle(video)))
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
