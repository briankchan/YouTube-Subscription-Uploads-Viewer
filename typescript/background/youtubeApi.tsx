/**
 * Wrappers for YouTube's Data API.
 */

import { AuthorizationError, XHRError } from "./errors";
import { List, OrderedMap } from "immutable";
import { Video } from "../records/video";






const AUTH_URL_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const AUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const AUTH_REDIRECT_URI = "https://bnkljajjohbfpepdijbgcekohljdkfjj.chromiumapp.org";
const AUTH_CLIENT_ID = "285678490171-1v3db8vbi7108iukl35ojiub87ja50s7.apps.googleusercontent.com";
const AUTH_URL = `${AUTH_URL_BASE}?client_id=${AUTH_CLIENT_ID}` +
		`&scope=${AUTH_SCOPE}&redirect_uri=${AUTH_REDIRECT_URI}&response_type=token`;

let authorizationPromise = null as Promise<string> | null;

export let isAuthorized = false;
let isAccessTokenValid = false;
let accessTokenExpireTime = null as Date | null; // todo actually update this

let accessToken = null as string | null;

export function init(): Promise<boolean> {
	return reauthorize().then((accessToken) => accessToken != null);
	//                       .catch((error) => {
	//	if (error.name == "AuthorizationError" && error.message == "User interaction required")
	//		return false;
	//	throw error;
	//});
}

function getAuthorizationToken(): Promise<string> {
	if(!isAuthorized)
		return Promise.reject<string>(new AuthorizationError("Not authorized"));
	if (isAccessTokenValid)
		return Promise.resolve(accessToken);
	if (authorizationPromise)
		return authorizationPromise;
	
	return reauthorize();
}

function reauthorize(): Promise<string | null> {
	authorizationPromise = launchWebAuthFlow(AUTH_URL + "&prompt=none", false)
			.then(handleAuthorizationResult)
			.then((accessToken) => {
				authorizationPromise = null;
				return accessToken;
			}).catch((error) => {
				authorizationPromise = null;
				throw error;
			});
	/*.then((result) => {
	 if(result.get("error_subtype") == "access_denied" && result.get("error") == "interaction_required") {
	 return null;
	 }
	 return result;
	 })*/
	
	
	return authorizationPromise;
}

export function authorize(): Promise<boolean> {
	if (isAuthorized)
		return Promise.reject(new AuthorizationError("Already logged in"));
	
	return launchWebAuthFlow(AUTH_URL/* + "&prompt=select_account"*/, true)
			.then(handleAuthorizationResult)
			.then((accessToken) => {
				if (!accessToken)
					throw new AuthorizationError("No access token?");
				return true;
			}).catch((error) => {
				if (!(error instanceof AuthorizationError) || error.message != "The user did not approve access.")
					throw error;
				else return false;
			});
}

function handleAuthorizationResult(result: URLSearchParams): string | null {
	accessToken = result.get("access_token");
	isAuthorized = accessToken != null;
	isAccessTokenValid = isAuthorized;
	accessTokenExpireTime = isAuthorized ? new Date(Date.now() + Number(result.get("expires_in")) * 1000) : null;
	
	if (isAuthorized) {
		return accessToken;
	} else if(result.get("error_subtype") == "access_denied" && result.get("error") == "interaction_required") {
		return null;
	} else {
		console.error(result); //todo what to do with result
		throw new AuthorizationError("???");
	}
}

function launchWebAuthFlow(url: string, interactive: boolean): Promise<URLSearchParams> {
	return new Promise((resolve, reject) => {
		chrome.identity.launchWebAuthFlow({
			url: url,
			interactive: interactive
		}, (responseUrl) => {
			if(chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError); // debugging
				reject(new AuthorizationError(chrome.runtime.lastError.message));
			} else {
				console.log(responseUrl);
				if(responseUrl) {
					let params = responseUrl.split(/#(.+)?/)[1];
					resolve(new URLSearchParams(params));
				} else reject(new AuthorizationError("No response URL?"));
			}
		});
	});
}
//function parseParams(params: string): {[param: string]: string} {
//	// http://stackoverflow.com/questions/4197591/parsing-url-hash-fragment-identifier-with-javascript
//	let result: {[param: string]: string} = {};
//	let e: RegExpExecArray | null,
//	    a = /\+/g,  // Regex for replacing addition symbol with a space
//	    r = /([^&;=]+)=?([^&;]*)/g,
//	    d = (s: string) => decodeURIComponent(s.replace(a, " "));
//	
//	while (e = r.exec(params))
//		result[d(e[1])] = d(e[2]);
//	
//	return result;
//}

type ChannelResponse = {items: Array<{id: string}>};

export function fetchUserId(): Promise<string> {
	return channels.get<ChannelResponse>({
		mine: true,
		part: "id",
		fields: "items/id"
	}, true).then((response) => response.items[0].id);
}

interface SubscriptionResponse {
	nextPageToken?: string,
	items: Array<SubscriptionItem>
}

interface SubscriptionItem {
	snippet: {
		title: string,
		resourceId: {channelId: string},
		thumbnails: {default: {url: string}}
	}
}

interface Subscription {
	name: string,
	thumb: string
}

export function fetchSubscriptions(): Promise<OrderedMap<string, Subscription>> {
	return subscriptions.get<SubscriptionResponse>({
		mine: true,
		part: "id,snippet",
		fields: "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))", //TODO only use default thumb?
		maxResults: 50,
		order: "alphabetical"
	}, true).then(fetchSubscriptionsNextPage).then((items) =>
		OrderedMap(List(items).map((subscriptionItem) => 
			[subscriptionItem.snippet.resourceId.channelId, {
				name: subscriptionItem.snippet.title,
				thumb: subscriptionItem.snippet.thumbnails.default.url
			} as Subscription]
		))
	);
}

function fetchSubscriptionsNextPage(response: SubscriptionResponse): Promise<Array<SubscriptionItem>> | Array<SubscriptionItem> {
	if(response.nextPageToken) {
		return subscriptions.get<SubscriptionResponse>({
			mine: true,
			part: "snippet",
			fields: "nextPageToken,items(snippet(title,resourceId/channelId,thumbnails))",
			maxResults: 50,
			order: "alphabetical",
			pageToken: response.nextPageToken
		}, true).then(fetchSubscriptionsNextPage).then((items) => response.items.concat(items));
	} else return response.items;
}

interface ChannelUploadsResponse {items: Array<{contentDetails: {relatedPlaylists: {uploads: string}}}>}

export function fetchChannelUploadsPlaylist(channelId: string): Promise<string> {
	return channels.get<ChannelUploadsResponse>({
		id: channelId,
		part: "contentDetails",
		fields: "items/contentDetails/relatedPlaylists/uploads"
	}).then((response) => {
		return response.items[0].contentDetails.relatedPlaylists.uploads;
	});
}

interface PlaylistResponse {items: Array<{contentDetails: {videoId: string}}>}

export function fetchPlaylistItems(playlistId: string): Promise<List<string>> {
	return playlistItems.get<PlaylistResponse>({
		playlistId: playlistId,
		part: "contentDetails",
		fields: "items/contentDetails/videoId",
		maxResults: 50
	}).then((response) => {
		let items = List(response.items);
		return items.map((video) => video.contentDetails.videoId);
	});
}

interface VideoResponse {
	items: Array<{
		id: string,
		snippet: {
			title: string,
			channelId: string,
			description: string,
			thumbnails: {medium: {url: string}},
			publishedAt: string,
		},
		contentDetails: {duration: string},
		statistics: {
			viewCount: string,
			likeCount: string,
			dislikeCount: string,
			commentCount: string
		}
	}>
}

export function fetchVideoDetails(videoIds: string): Promise<List<Video>> {
	return videos.get<VideoResponse>({
		id: videoIds,
		part: "id,snippet,contentDetails,statistics",
		fields: "items(id,snippet(publishedAt,channelId,title,description,thumbnails/medium/url),contentDetails/duration,statistics(viewCount,likeCount,dislikeCount,commentCount))",
		maxResults: 50
	}).then((response) => {
		let items = List(response.items);
		
		return items.map((videoJSON) => {
			return Video({
				id: videoJSON.id,
				title: videoJSON.snippet.title,
				channel: videoJSON.snippet.channelId,
				desc: videoJSON.snippet.description,
				thumb: videoJSON.snippet.thumbnails.medium.url,
				upload: videoJSON.snippet.publishedAt,
				dur: parseVideoDuration(videoJSON.contentDetails.duration),
				views: parseInt(videoJSON.statistics.viewCount),
				likes: parseInt(videoJSON.statistics.likeCount),
				dislikes: parseInt(videoJSON.statistics.dislikeCount),
				comments: parseInt(videoJSON.statistics.commentCount)
			});
		});
	});
}

function parseVideoDuration(duration: string): string {
	let h = /(\d+)(?:H)/g.exec(duration);
	let m = /(\d+)(?:M)/g.exec(duration);
	let s = /(\d+)(?:S)/g.exec(duration);
	
	let result = "";
	
	if(h) {
		result += h[1] + ":";
		result += (m ? padTime(m[1]) : "00") + ":";
	} else {
		result += (m ? m[1] : "0") + ":";
	}
	result += (s ? padTime(s[1]) : "00");
	
	return result;
}
function padTime(n: string): string {
	return "00".substring(0, 2 - n.length) + n;
}


class YoutubeResource {
	static readonly BASE_URL = "https://www.googleapis.com/youtube/v3/";
	static readonly API_KEY = "AIzaSyClOj2RmQTkYbfqL4o8mBhzx8Jwo-mNhpo";
	
	resource: string;
	
	constructor(resource: string) { this.resource = resource; }
	
	get<T>(options: {[key: string]: any}, authorized?: boolean): Promise<T> {
		return YoutubeResource.ajax<T>(this.resource, "GET", options, authorized);
	}
	post<T>(options: {[key: string]: any}, authorized?: boolean): Promise<T> {
		return YoutubeResource.ajax<T>(this.resource, "POST", options, authorized);
	}
	put<T>(options: {[key: string]: any}, authorized?: boolean): Promise<T> {
		return YoutubeResource.ajax<T>(this.resource, "PUT", options, authorized);
	}
	del<T>(options: {[key: string]: any}, authorized?: boolean): Promise<T> {
		return YoutubeResource.ajax<T>(this.resource, "DELETE", options, authorized);
	}
	
	static ajax<T>(resource: string, method: string, params: {[key: string]: any}, authorized?: boolean): Promise<T> {
		let promise: Promise<void>;
		let url = new URL(YoutubeResource.BASE_URL + resource);
		let options = { method: method } as {[key: string]: any};
		
		if (authorized) {
			promise = getAuthorizationToken().then((token) => {
				options["headers"] = new Headers({"authorization": "Bearer " + token});
			});
		} else {
			promise = Promise.resolve();
			params["key"] = YoutubeResource.API_KEY;
		}
		
		let searchParams = url.searchParams;
		for (let key in params)
			searchParams.append(key, params[key]);
		
		return promise.then(() => {
			return YoutubeResource.fetchOK<T>(url, options);
		}).catch((error) => {
			if (error.name === "XHRError" && error.status === 500) {
				// try again for 500 OK errors; why does this happen anyway?
				console.error("500 OK error again; derp"); //debugging
				return YoutubeResource.fetchOK<T>(url, options);
			} else throw error;
		});
	}
	
	static fetchOK<T>(url: URL, options: {[key: string]: any}): Promise<T> {
		return fetch(url, options).then((response) => {
			if (response.ok)
				return response.json();
			else {
				console.error(response.json());
				throw new XHRError(response.status, response.statusText);
			}
		});
	}
}

export let channels = new YoutubeResource("channels");
export let playlistItems = new YoutubeResource("playlistItems");
export let subscriptions = new YoutubeResource("subscriptions");
export let videos = new YoutubeResource("videos");
