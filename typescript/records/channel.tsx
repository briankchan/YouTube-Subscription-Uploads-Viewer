import { Record, Map, List } from "immutable";
import RecordClass from "./record";
import { Video } from "./video";

class ChannelClass {
	uploads = List<Video>();
	uploadsPlaylist = "";
	name = "";
	thumb = "";
}
interface Channel extends Map<string, any>, ChannelClass {}
const Channel = Record(new ChannelClass(), "Channel") as RecordClass<Channel>;

export default Channel;
