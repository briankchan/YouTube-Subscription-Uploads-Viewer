/**
 * Main script for viewer.html that connects everything to the UI
 */

window.$ = window.jquery = require("jquery");

var backgroundPage = chrome.extension.getBackgroundPage();

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
	
	backgroundPage.updateSubscriptionsPromise.done(function() {
			displaySubscriptions();
			backgroundPage.updateUploadsPromise.done(displayCurrentView);
	});
	
	backgroundPage.authorizePromise.done(hideLogin).fail(showLogin); //TODO use events
	
	$("#authorize-button").click(backgroundPage.authorize);
	
	$("#refresh-button").click(updateUploads);
	
	$("#reload-extension-button").click(function() { chrome.runtime.reload() }); //debugging (reload ext. button)
});

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
	
	backgroundPage.updateSubscriptionsPromise.done(function() {
		$.each(backgroundPage.getSubscriptions(), function(i, id) {
			
			var label = $("<div>", { class: "channelLabel" })
					.append($("<img>", { src: backgroundPage.getChannelThumb(id), width: "20", class: "channelThumb" }))
					.append($("<span>", { class: "channelName"}).text(backgroundPage.getChannelName(id)));
			var counter = $("<div>", { class: "channelUnwatched" });
			
			var updateCounter = function(event, amount) {
				if(amount) {
					var text = counter.text();
					if(text == "") {
						counter.text(amount);
					} else {
						counter.text(parseInt(counter.text(), 10) + amount);
					}
				} else {
					var watched = backgroundPage.getWatchedVideos(id);
					
					counter.text($.grep(backgroundPage.getChannelUploads(id), function(vid, i) {
						return watched.indexOf(VideoManager.getId(vid)) < 0;
					}).length);
				}
			};
			
			$(window).on("channelUpdate" + id, updateCounter);
			$(backgroundPage).on("channelUpdate" + id, updateCounter);
			
			if(backgroundPage.isLoggedIn()) updateCounter();
			
			$("#subscriptions").append($("<li>")
					.append($("<div>", { class: "channel" })
							.append(counter) //order flipped for css reasons
							.append(label)
							.click(function() {
								displayUploads(id);
							})
					)
			);
		});
	});
}

function displayCurrentView() {
	if (currentView)
		displayUploads(currentView);
}

function updateUploads() {
	console.log("loading videos"); //debugging
	var start = new Date();
	
	$("#refresh-button").prop("disabled", true);
	
	backgroundPage.updateUploads().done(function() {
		var elapsed = new Date()-start;
		console.log(elapsed + "ms");
		
		$("#refresh-button").prop("disabled", false);
		displayCurrentView();
	});
}

function displayUploads(id) {
	backgroundPage.updateSubscriptionsPromise.done(function(loaded) {
		if (backgroundPage.isChannelLoaded(id)) {
			var uploads = getChronologicalOrder(backgroundPage.getChannelUploads(id));
			var thumb = backgroundPage.getChannelThumb(id);
			var name = backgroundPage.getChannelName(id);
			
			clearVideosPanel();
			$(window).scrollTop(0);
			$.each(uploads, function(i, video) {
				$("#videos").append($("<li>").append(createVideoElement(video, name, thumb, id)));
			});
			localStorage.currentView = currentView = id;
		} else console.error(id + " is not a valid loaded channel ID.");
	});
}

function clearVideosPanel() {
	$("#videos").empty();
}

function createVideoElement(video, channelName, channelThumb, channelId) {//TODO: move to new file
	var id = VideoManager.getId(video);
	
	var videoElement = $("<div>", { class: "vid" });
	var markWatched = function() {
		$(window).trigger("channelUpdate" + channelId, -1);
		
		videoElement.addClass("watched");
		backgroundPage.setWatched(channelId, id);
	};
	var markUnwatched = function() {
		$(window).trigger("channelUpdate" + channelId, 1); //TODO move to background page for other viewers
		
		videoElement.removeClass("watched");
		backgroundPage.setUnwatched(channelId, id);
	};
	
	if (backgroundPage.getWatched(channelId, id))
		videoElement.addClass("watched");
	
	videoElement.append($("<div>", { class: "vidUploader" })
		.append(createChannelLink(channelId)
			.append($("<img>", { src: channelThumb, width: "20", class: "vidUploaderImg" }))
			.append($("<span>", { class: "vidUploaderName"}).text(channelName))
		)
	).append($("<div>", { class: "vidImg" })
		.append(createVideoLink(id).click(markWatched)
			.append($("<img>", { src: VideoManager.getThumbnail(video), width: "240" }))
		)
	).append($("<div>", { class: "vidText" })
		.append($("<div>", { class: "vidTitle" })
			.append(createVideoLink(id).click(markWatched).text(VideoManager.getTitle(video)))
		).append($("<div>", { class: "vidTime" }).text(new Date(VideoManager.getUploadTime(video)).toLocaleString()))
		.append($("<div>", { class: "vidDesc" }).html(parseDescription(VideoManager.getDescription(video))))
	).append($("<div>", { class: "vidMarkWatched" }).text("Mark watched").click(markWatched))
	.append($("<div>", { class: "vidMarkUnwatched" }).text("Mark unwatched").click(markUnwatched));
	return videoElement;
}

function parseDescription(text) {
	return HtmlLinkify(text.replace(/\n/g, "<br />"), { escape: false });
}

function createVideoLink(videoId) {
	return $("<a>", { href: "https://www.youtube.com/watch?v="+videoId, target: "_blank" });
}

function createChannelLink(channelId) {
	return $("<a>", { href: "https://www.youtube.com/channel/"+channelId, target: "_blank" });
}

function getChronologicalOrder(videos) {
	var output = $.extend([], videos);
	
	output.sort(function(a, b) {
		//newest videos first
		return new Date(VideoManager.getUploadTime(b)) - new Date(VideoManager.getUploadTime(a)); 
	});
	
	return output;
}
