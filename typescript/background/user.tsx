import * as Storage from "./storage";
import { StorageError } from "./errors";
import { List, Map, Seq } from "immutable";
import User from "../records/user";
import Subscription from "../records/subscription";

export let users: Map<string, User>;
let currentUserId: string;

export function init(): Promise<void> {
	return Storage.get("users").then((value) => {
		if (value === undefined) {
			users = Map<string, User>();
		} else if (typeof value === "object") {
			users = parseObj(value);
			console.log("users");
			console.log(users);
		} else throw new StorageError("users is the wrong type: " + typeof value + ": " + value);
	})
}

function parseObj(usersObj: {[key: string]: any}): Map<string, User> {
	let users = Map(usersObj);
	return users.map((userObj) => {
		let user = User(userObj);
		return user.set("subscriptions",
				Map(user.subscriptions).map((subscriptionObj) => {
					let subscription = Subscription(subscriptionObj);
					return subscription.set("watched", List(subscription.watched));
				})
		);
	}) as Map<string, User>;
}

export function setUser(id: string): void {
	if(!users.has(id)) {
		users = users.set(id, User());
	}
	currentUserId = id;
}

export function setSubscriptions(channelIds: Seq.Indexed<string>): Promise<void> {
	//TODO filter + handle deleted subs
	
	users = users.setIn([currentUserId, "subscriptions"],
	                    users.get(currentUserId).subscriptions.withMutations((subs) => {
		                    channelIds.forEach((id) => {
			                    if (!subs.has(id))
				                    subs.set(id, Subscription());
		                    });
	                    }));
	return save();
}

export function getSubscriptions(): Seq.Indexed<string> {
	return users.get(currentUserId).subscriptions.keySeq();
}

export function setWatched(channelId: string, videoId: string): Promise<void> {
	if(!isWatched(channelId, videoId)) {
		let channel = users.get(currentUserId).subscriptions.get(channelId);
		let watched = channel.watched.push(videoId).take(100);
		
		users = users.setIn([currentUserId, "subscriptions", channelId],
		                    channel.set("watched", watched)
		                           .set("unwatchedCount", channel.get("unwatchedCount") - 1));
		return save();
	} else return Promise.resolve();
}

export function setUnwatched(channelId: string, videoId: string): Promise<void> {
	let channel = users.get(currentUserId).subscriptions.get(channelId);
	let watched = channel.watched;
	
	if(watched.includes(videoId)) {
		users = users.setIn([currentUserId, "subscriptions", channelId],
		                    channel.set("watched", watched.filterNot((id) => id === videoId))
		                           .set("unwatchedCount", channel.get("unwatchedCount") + 1));
		return save();
	} else return Promise.resolve();
}

export function isWatched(channelId: string, videoId: string): boolean {
	let watched = getWatchedVideos(channelId);
	return watched.includes(videoId);
}

export function getWatchedVideos(channelId: string): List<string> {
	return users.get(currentUserId).subscriptions.get(channelId).watched;
}

export function updateWatchedCount(channelId: string, uploadIds: List<string>): Promise<void> {//todo just pass in strings
	let watched = getWatchedVideos(channelId);
	let count = uploadIds.count((id) => !watched.includes(id));
	
	users = users.setIn([currentUserId, "subscriptions", channelId, "unwatchedCount"], count);
	
	return save();
}

export function getUnwatchedCount(channelId: string): number {
	return users.get(currentUserId).subscriptions.get(channelId).unwatchedCount;
}

function save(): Promise<void> {
	return Storage.set("users", users.toJS());
}
