import { Record, Map, Iterable } from "immutable";
interface RecordClass<T extends Map<string, any>> extends Record.Class {
	new (values?: {[key: string]: any}): T;
	new (values?: Iterable<string, any>): T; // deprecated
	(values?: {[key: string]: any}): T;
	(values?: Iterable<string, any>): T; // deprecated
}
export default RecordClass;
