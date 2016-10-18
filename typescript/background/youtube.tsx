/**
 * Fetches and saves a user's subscriptions and their uploads.
 */

import * as YoutubeApi from "./youtubeApi";
import * as User from "./user";
import * as Storage from "./storage";
import { IllegalArgumentError, StorageError } from "./errors";
import { List, Map, Seq } from "immutable";
import Channel from "../records/channel";
import { Video } from "../records/video";

export { isAuthorized } from "./youtubeApi";
export { getSubscriptions, isWatched, setWatched, setUnwatched, getWatchedVideos, getUnwatchedCount } from "./user"

let MAX_VIDEOS_PER_CHANNEL = 50;


export let channels: Map<string, Channel>; //debugging (exporting subs)
export let user = User;

export function init(): Promise<boolean> {
	return Promise.all(
			[
				User.init(),
				YoutubeApi.init().then((authorized) => {
					if(authorized)
						return initCurrentUser().then(() => true);
					else return false;
				}),
				Storage.get("channels").then((value) => {
					if (value === undefined) {
						channels = Map<string, Channel>();
					} else if (typeof value === "object") {
						channels = parseObj(value);
						console.log("channels");
						console.log(channels);
					} else throw new StorageError("channels is the wrong type: " + typeof value + ": " + value);
				})
			]).then(([, authorized]) => authorized);
}

function parseObj(channelsObj: {[key: string]: any}): Map<string, Channel> {
	let channels = Map(channelsObj);
	return channels.map((channelObj) => {
		let channel = Channel(channelObj);
		return channel.set("uploads",
				List(channel.uploads).map((videoObj) => Video(videoObj)));
	}) as Map<string, Channel>;
}

export function authorize(): Promise<void> {
	return YoutubeApi.authorize().then((isAuthorized) => {
		if (isAuthorized)
			initCurrentUser();
	});
}

function initCurrentUser(): Promise<void> {
	return YoutubeApi.fetchUserId().then(User.setUser);
}

export function updateSubscriptions(): Promise<void> {
	return fetchSubscriptions().then(User.setSubscriptions);
}

function fetchSubscriptions(): Promise<Seq.Indexed<string>> {
	return YoutubeApi.fetchSubscriptions().then((subs) => {
		let getChannelUploadsPlaylistPromises = [] as Array<Promise<void>>;
		
		let channelsMutable = channels.asMutable();
		subs.forEach((sub, id) => {
			if (!channelsMutable.has(id)) {
				channelsMutable.set(id, Channel(sub));
				getChannelUploadsPlaylistPromises.push(
						YoutubeApi.fetchChannelUploadsPlaylist(id).then((playlistId) => {
							channelsMutable.setIn([id, "uploadsPlaylist"], playlistId);
						}));
			} else {
				channelsMutable.setIn([id, "name"], sub.name);
				channelsMutable.setIn([id, "thumb"], sub.thumb);
			}
		});
		
		return Promise.all(getChannelUploadsPlaylistPromises).then(() => {
			channels = channelsMutable.asImmutable();
			return subs.keySeq();
		});
	});
}

export function updateSubscriptionsUploads(): Promise<void> {
	return updateChannelsUploads(User.getSubscriptions());
}

function updateChannelsUploads(channelIds: Seq.Indexed<string>): Promise<void> {
	let promises = channelIds.map((id) => {
		return fetchChannelUploads(id).then((uploads) => {//TODO: include whether there are new videos?
			if(uploads)
				User.updateWatchedCount(id, uploads.map((video) => video.id) as List<string>); //immutable types please
		});
	});
	
	return Promise.all(promises.toJS()).then(() => {
		Storage.set("channels", channels.toJS());
	});
}

function fetchChannelUploads(channelId: string): Promise<List<Video> | null> {
	let channel = channels.get(channelId);
	
	return YoutubeApi.fetchPlaylistItems(channel.uploadsPlaylist).then<List<Video> | null>((videoIds) => {
		let uploads = channel.uploads.filter((video) => videoIds.includes(video.id)); //remove deleted videos
		
		let uploadsIds = uploads.map((video) => video.id);
		let newVideoIds = videoIds.filterNot((videoId) => uploadsIds.includes(videoId)); // only get new videos
		
		if(newVideoIds.size) {
			return fetchVideosData(newVideoIds as List<string>).then((videos) => {
				uploads = videos.sort(sortVideosByUploadTime).concat(uploads).take(MAX_VIDEOS_PER_CHANNEL);
				channels = channels.setIn([channelId, "uploads"], uploads);
				return uploads;
			});
		} else return null;
	});
}

function sortVideosByUploadTime(a: Video, b: Video): number {
	return Date.parse(a.upload) - Date.parse(b.upload);
}

function fetchVideosData(videoIds: List<string>): Promise<List<Video>> {
	let videoIdsString = videoIds.reduce((str, id) => str + id + ",", "");
	
	if(videoIdsString != "") {
		console.log(videoIdsString); //debugging
		return YoutubeApi.fetchVideoDetails(videoIdsString.slice(0, -1)); //cut out last comma
	} else {
		return Promise.resolve(List<Video>());
	}
}

export function getChannelName(channelId: string): string {
	checkChannelLoaded(channelId);
	return channels.get(channelId).name;
}

export function getChannelThumb(channelId: string): string {
	checkChannelLoaded(channelId);
	return channels.get(channelId).thumb;
}

export function getChannelUploads(channelId: string): List<Video> {
	checkChannelLoaded(channelId);
	return channels.getIn([channelId, "uploads"]);
}

function checkChannelLoaded(channelId: string): void {
	if (!channels.has(channelId))
		throw new IllegalArgumentError(channelId + " is not a loaded channel");
}
