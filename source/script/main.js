window.$ = window.jquery = require("jquery");

var htmlLinkify = require("html-linkify");
var Youtube = window.Youtube = require("./youtube.js");

$(function() {
	//keep scrolling from bubbling to outer window
	$('#nav').bind('mousewheel', function(e) {
		var t = $(this);
		if (e.originalEvent.wheelDelta > 0 && t.scrollTop() == 0) {
			e.preventDefault();
		} else if (e.originalEvent.wheelDelta < 0 && (t.scrollTop() == t.get(0).scrollHeight - t.innerHeight())) {
			e.preventDefault();
		}
	});
	
	//log in with UI when button is clicked
	$("#authorize-button").click(function() { authorize(true); });
	setTimeout(function() { authorize(false); }, 1); //attempt to log in without UI
});

function authorize(interactive) {
	Youtube.authorize(interactive).done(function() {
		$("#authorize-button").css("visibility", "hidden");
		loadSubscriptions();
	}).fail(function() {
		$("#authorize-button").css("visibility", "");
	});
}

function loadSubscriptions() {
	console.log("loading subs");
	Youtube.loadSubscriptionsVideos().done(function(subscriptions) {
		console.log(subscriptions);
		$.each(subscriptions, function(id, sub) {
			$("#subscriptions").append($("<li>").text(sub.name).click(function() {
				//on click, load uploads for this subscription
				clearUploads();
				var uploads = Youtube.getChannelUploads(id);
				$.each(uploads, function(id, video) {
					$("#videos").append(createVideoElement(video));
				})
			}));
		});
	});
}

function clearUploads() {
	$("#videos").empty();
}

/**
 * creates html list item to represent given video object
 * @param {Object (video)} video video that list item will represent
 * @returns {jQuery} list item that was created
 */
function createVideoElement(video) {
	return $("<li>")
			.append($("<div>", { "class": "vid" })
				.append($("<div>", { "class": "vidUploader" })
					.append($("<a>", { "href": "https://www.youtube.com/watch?v="+video.id, "target": "_blank" })
						.append($("<img>", { "src": video.uploaderThumb, "width": "20", "class": "vidUploaderImg" }))
						.append($("<span>").text(video.uploader)))
				).append($("<div>", { "class": "vidContent" })
					.append($("<div>", { "class": "vidImg" })
						.append($("<a>", { "href": "https://www.youtube.com/watch?v="+video.id, "target": "_blank" })
							.append($("<img>", { "src": video.thumb, "width": "240" }))
						)
					).append($("<div>", { "class": "vidText" })
						.append($("<a>", { "href": "https://www.youtube.com/watch?v="+video.id, "target": "_blank" })
							.append($("<div>", { "class": "vidTitle" }).text(video.title))
						).append($("<div>", { "class": "vidTime" }).text(new Date(video.time).toLocaleString()))
							.append($("<div>", { "class": "vidDesc" }).html(linkify(video.desc.replace(/\n/g, "<br />"))))
								//replace line breaks with <br> tags; convert URLs to links
					)
				)
			);
}

function linkify(text) {
	return htmlLinkify(text, { escape: false });
}
