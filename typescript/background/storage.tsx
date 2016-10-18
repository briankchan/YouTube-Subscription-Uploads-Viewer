/**
 * A wrapper for Chrome's extension local storage API.
 */

export function get<T>(key: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		chrome.storage.local.get(key, function(value) {
			if (chrome.runtime.lastError)
				reject(chrome.runtime.lastError.message);
			else
				resolve(value[key] as T);
		});
	});
}

export function set(key: string, value: any): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		chrome.storage.local.set({ [key]: value }, function() {
			if (chrome.runtime.lastError)
				reject(chrome.runtime.lastError.message);
			else
				resolve();
		});
	});
}

export function clear(): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		chrome.storage.local.clear(function() {
			if (chrome.runtime.lastError)
				reject(chrome.runtime.lastError.message);
			else
				resolve();
		});
	});
}
