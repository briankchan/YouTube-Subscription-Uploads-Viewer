import { Record, Map } from "immutable";
import RecordClass from "./record";
import User from "./user";

class UsersClass {
	currentUser = "";
	userMap = Map<string, User>();
}
interface Users extends Map<string, any>, UsersClass {}
const Users = Record(new UsersClass(), "User") as RecordClass<Users>;

export default Users;
