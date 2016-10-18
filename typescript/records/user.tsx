import { Record, Map } from "immutable";
import RecordClass from "./record";
import Subscription from "./subscription";

class UserClass {
	subscriptions = Map<string, Subscription>();
}
interface User extends Map<string, any>, UserClass {}
const User = Record(new UserClass(), "User") as RecordClass<User>;

export default User;
