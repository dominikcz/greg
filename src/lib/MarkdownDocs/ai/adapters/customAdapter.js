export class CustomAdapter {
	constructor(fn) {
		this.name = 'custom';
		this.fn = fn;
	}

	chat(messages, options) {
		return this.fn(messages, options);
	}

	async isAvailable() {
		return true;
	}
}
