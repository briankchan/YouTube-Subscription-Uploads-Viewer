import { AllActions, MarkWatched, MarkUnwatched } from "../actions/index";
import Users from "../../records/users";


export default function videos(state = Users(), action: AllActions) {
	switch (action.type) {
		case MarkWatched.type: {
			let currentUserId = state.currentUser;
			let watched = state.userMap.get(currentUserId).subscriptions.get(action.channelId).watched;
			
			return state.setIn(["userMap", currentUserId, "subscriptions", action.channelId, "watched"],
					watched.add(action.videoId).take(100));
		}
		case MarkUnwatched.type: {
			let currentUserId = state.currentUser;
			let watched = state.userMap.get(currentUserId).subscriptions.get(action.channelId).watched;
			
			return state.setIn(["userMap", currentUserId, "subscriptions", action.channelId, "watched"],
					watched.remove(action.videoId));
		}
		default:
			return state;
	}
};
