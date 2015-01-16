/**
 * Main script for viewer.html that connects everything to the UI
 */

window.$ = window.jquery = require("jquery");

var HtmlLinkify = require("html-linkify");
var Youtube = window.Youtube = require("./youtube.js");
var VideoManager = require("./video-object-manager.js");

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
	Youtube.loadSubscriptionsUploads().done(function(subscriptions) {
		if (localStorage.currentView)
			displayUploads(localStorage.currentView);
		$.each(subscriptions, function(id, sub) {
			$("#subscriptions").append($("<li>").text(sub.name).click(function() {
				displayUploads(id);
			}));
		});
	});
}

function displayUploads(id) {
	if (Youtube.isChannelLoaded(id)) {
		var uploads = Youtube.getChannelUploads(id);
		var thumb = Youtube.getChannelThumb(id);
		var name = Youtube.getChannelName(id);
		
		clearUploads();
		$(window).scrollTop(0);
		$.each(uploads, function(id, video) {
			$("#videos").append(createVideoElement(video, id, name, thumb));
		});
		localStorage.currentView = currentView = id;
	} else console.error(id + " is not a valid loaded channel ID.");
}

function clearUploads() {
	$("#videos").empty();
}

/**
 * creates html list item to represent given video object
 * @param {Object (video)} video video that list item will represent
 * @returns {jQuery} list item that was created
 */
function createVideoElement(video, id, uploaderName, uploaderThumb) {//TODO: move to new file
	return $("<li>")
			.append($("<div>", { class: "vid" })
				.append($("<div>", { class: "vidUploader" })
					.append($("<a>", { href: "https://www.youtube.com/watch?v="+id, target: "_blank" })
						.append($("<img>", { src: uploaderThumb, width: "20", class: "vidUploaderImg" }))
						.append($("<span>", { class: "vidUploaderName"}).text(uploaderName)))
				).append($("<div>", { class: "vidContent" })
					.append($("<div>", { class: "vidImg" })
						.append($("<a>", { href: "https://www.youtube.com/watch?v="+id, target: "_blank" })
							.append($("<img>", { src: VideoManager.getThumbnail(video), width: "240" }))
						)
					).append($("<div>", { class: "vidText" })
						.append($("<a>", { href: "https://www.youtube.com/watch?v="+id, target: "_blank" })
							.append($("<div>", { class: "vidTitle" }).text(VideoManager.getTitle(video)))
						).append($("<div>", { class: "vidTime" }).text(new Date(VideoManager.getUploadTime(video)).toLocaleString()))
							.append($("<div>", { class: "vidDesc" }).html(linkify(VideoManager.getDescription(video).replace(/\n/g, "<br />"))))
								//replace line breaks with <br> tags; convert URLs to links
					)
				)
			);
}

function linkify(text) {
	return HtmlLinkify(text, { escape: false });
}
