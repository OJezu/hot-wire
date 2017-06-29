"use strict";

var Resolver = require("./Resolver");
var _ = require("lodash");

class HotWire {
	constructor() {
		this._passes = [this._addCalls.bind(this)];
	}

	wire(_containerConfig) {
		let containerConfig = _.cloneDeep(_containerConfig);

		this._passes.forEach((pass) => {
			pass(containerConfig);
		});

		return this._resolve(containerConfig);
	}

	_resolve(containerConfig) {
		return (new Resolver(containerConfig)).resolve();
	}

	_addCalls (containerConfig) {
		if(containerConfig.calls) {
			containerConfig.calls.forEach((call) => {
				if(!containerConfig.services[call.service].calls) {
					containerConfig.services[call.service].calls = [];
				}

				containerConfig.services[call.service].calls.push({"method": call.method, "arguments": call.arguments || []});
			});
		}
	}
}

module.exports = HotWire;
