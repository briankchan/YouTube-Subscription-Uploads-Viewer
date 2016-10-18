
export class IllegalArgumentError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "IllegalArgumentError";
	}
}

export class StorageError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "StorageError";
	}
}

export class XHRError extends Error {
	status?: number;
	statusText?: string;
	
	constructor(status?: number, statusText?: string) {
		super(status + ":" + statusText);
		this.name = "XHRError";
		this.status = status;
		this.statusText = statusText;
	}
}

export class AuthorizationError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = "AuthenticationError";
	}
}
