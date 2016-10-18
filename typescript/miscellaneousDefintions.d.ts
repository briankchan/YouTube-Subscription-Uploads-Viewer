// allow importing css modules
declare module "*.css"

// add URL as a valid argument for fetch (works in chrome)
interface Window {
	fetch(url: string|Request|URL, init?: RequestInit): Promise<Response>;
}

// define URL.searchParams (exists in chrome)
interface URL {
	searchParams: URLSearchParams;
}
declare class URLSearchParams {
	constructor(init: USVString | URLSearchParams);
	append(name: USVString, value: USVString): void;
	delete(name: USVString): void;
	get(name: USVString): USVString;
	getAll(name: USVString): USVString[];
	has(name: USVString): boolean;
	set(name: USVString, value: USVString): void;
	toString(): string;
}

type USVString = string;
