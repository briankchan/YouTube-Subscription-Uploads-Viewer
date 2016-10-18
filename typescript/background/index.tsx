/**
 * Background script for the extension.
 * Handles opening the extension tab and schedules fetching upload videos.
 */

import * as Youtube from "./youtube";
import { OrderedSet } from "immutable";
import * as Immutable from "immutable";

(window as any).youtube = Youtube; //debugging
(window as any).immutable = Immutable; //debugging
(window as any).reload = chrome.runtime.reload;

let extensionTabs = OrderedSet<number>();
let isCreatingTab = false;

chrome.browserAction.onClicked.addListener((tab) => {
	if(!extensionTabs.size && !isCreatingTab) {
		isCreatingTab = true;
		chrome.tabs.create({ url: "main.html" }, (tab) => {
			isCreatingTab = false;
		});
	} else {
		chrome.tabs.get(extensionTabs.first(), (tab) => {//todo message to get tab id
			chrome.tabs.update(tab!.id!, { active: true });
			chrome.windows.update(tab!.windowId, { focused: true });
		});
	}
});

let isInitialized = false;

init();
function init(): Promise<void> {
	return Youtube.init().then((authorized) => {
		isInitialized = true;
		messageMainTabs({type: "init"});
		
		if (authorized) {
			console.log("logged in");//debugging
			messageMainTabs({type: "logIn"}); //todo include user info?
			updateSubscriptionsAndUploads();
		}
	});
}

function logIn(): Promise<void> {
	return Youtube.authorize().then(() => {
		messageMainTabs({type: "logIn"}); //todo include user info?
		updateSubscriptionsAndUploads()
	});
}

function updateSubscriptionsAndUploads(): Promise<void> {
	return Youtube.updateSubscriptions().then(Youtube.updateSubscriptionsUploads).then(() => {
		messageMainTabs({ type: "uploadsUpdated" });
	});
}

function messageMainTabs<T>(options: any): Promise<T> {
	return new Promise((resolve, reject) => {
		options["target"] = "main";
		chrome.runtime.sendMessage(options, resolve);
	})
}

chrome.runtime.onMessage.addListener((message, caller, sendResponse) => {
	if(message.target != "background")
		return;
	
	let response: any;
	switch(message.type) {
		case "registerTab":
			if (caller.tab && caller.tab.id != undefined && caller.tab.id != -1 ) {
				let id = caller.tab.id;
				extensionTabs = extensionTabs.add(id);
				response = extensionTabs.first() == id;
			} else
				response = false;
			break;
		case "unregisterTab":
			if (caller.tab && caller.tab.id != undefined && caller.tab.id != -1 ) {
				let id = caller.tab.id;
				extensionTabs = extensionTabs.remove(id);
			}
			break;
		case "logIn":
			response = logIn();
			break;
		case "isLoggedIn":
			response = Youtube.isAuthorized;
			break;
		case "updateSubscriptions":
			response = Youtube.updateSubscriptions();
			break;
		case "updateUploads":
			response = Youtube.updateSubscriptionsUploads().then(() => {
				messageMainTabs({ type: "uploadsUpdated" });
			});
			break;
		case "getChannelName":
			response = Youtube.getChannelName(message.channelId);
			break;
		case "getChannelThumb":
			response = Youtube.getChannelThumb(message.channelId);
			break;
		case "getChannelUploads":
			response = Youtube.getChannelUploads(message.channelId);
			break;
		case "getSubscriptionIds":
			response = Youtube.getSubscriptions();
			break;
		case "setWatched":
			response = Youtube.setWatched(message.channelId, message.videoId);
			break;
		case "setUnwatched":
			response = Youtube.setUnwatched(message.channelId, message.videoId);
			break;
		case "isWatched":
			response = Youtube.isWatched(message.channelId, message.videoId);
			break;
		case "getWatchedVideos":
			response = Youtube.getWatchedVideos(message.channelId);
			break;
		case "getUnwatchedCount":
			response = Youtube.getUnwatchedCount(message.channelId);
			break;
	}
	Promise.resolve(response).then(sendResponse);
});
