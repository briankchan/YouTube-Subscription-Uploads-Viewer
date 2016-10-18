import { Record, Map } from "immutable";
import RecordClass from "./record";

class VideoClass {
	id = "";
	title = "";
	channel = "";
	desc = "";
	upload = "";
	dur = "";
	views = 0;
	likes = 0;
	dislikes = 0;
	comments = 0;
}
export interface Video extends Map<string, any>, VideoClass {}
export const Video = Record(new VideoClass(), "Video") as RecordClass<Video>;

export default Video;
