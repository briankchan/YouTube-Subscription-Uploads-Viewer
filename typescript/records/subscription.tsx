import { Record, Map, OrderedSet } from "immutable";
import RecordClass from "./record";

class SubscriptionClass {
	watched = OrderedSet<string>();
	unwatchedCount = 0;
}
interface Subscription extends Map<string, any>, SubscriptionClass {}
const Subscription = Record(new SubscriptionClass(), "Subscription") as RecordClass<Subscription>;

export default Subscription;
