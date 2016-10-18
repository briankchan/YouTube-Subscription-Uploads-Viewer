import { Action } from "redux";
//import { createActions } from "redux-actions";

//export const MARK_WATCHED = "MARK_WATCHED";

const enum types {
	MARK_WATCHED,
	MARK_UNWATCHED
}

export type AllActions = MarkWatched | MarkUnwatched;

//interface MarkWatchedAction extends Action {
//	type: "MARK_WATCHED",
//	id: string
//}

//export function markWatched(id: string): MarkWatchedAction {
//	return {
//		type: MarkWatchedAction.type,
//		id
//	}
//}

//interface Payload {
//	videoId: string,
//	channelId: string
//}

//export const { markWatched, markUnwatched } = createActions({
//	MARK_WATCHED: (videoId: string, channelId: string) => ({ videoId, channelId }),
//	MARK_UNWATCHED: (videoId: string, channelId: string) => ({ videoId, channelId })
//});

//export const markUnwatched = createAction<string, Payload>("MARK_UNWATCHED",
//		(videoId: string, channelId: string) => ({ videoId, channelId }));

export class MarkWatched implements Action {
	static readonly type: types.MARK_WATCHED;
	readonly type: types.MARK_WATCHED;
	readonly videoId: string;
	readonly channelId: string;
	
	constructor(videoId: string, channelId: string) {
		return { type: this.type, channelId, videoId }
	}
}


export class MarkUnwatched implements Action {
	static readonly type: types.MARK_UNWATCHED;
	readonly type: types.MARK_UNWATCHED;
	readonly videoId: string;
	readonly channelId: string;
	
	constructor(videoId: string, channelId: string) {
		return { type: this.type, channelId, videoId }
	}
}

function testfunc(action: AllActions): any {
	switch (action.type) {
		case MarkWatched.type:
			return action.videoId;
		case MarkUnwatched.type:
			return action.videoId;
		
	}
}


//class MarkWatchedAction implements Action {
//	readonly type: "MARK_WATCHED";
//	readonly videoId: string;
//	readonly channelId: string;
//}
//export const test = new class extends MarkWatchedAction {
//	create(videoId: string, channelId: string): MarkWatchedAction {
//		return {type: this.type, videoId, channelId};
//	}
//};


