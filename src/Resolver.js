"use strict";

var when = require("when");
var whenKeys = require("when/keys");
var _ = require("lodash");

class Resolver {
	constructor(containerConfig) {
		this._containerConfig = containerConfig;
		this._deferredServices = {};
	}

	resolve() {
		const serviceDefinitions = this._containerConfig.services || {};
		Object.keys(serviceDefinitions).forEach((serviceName) => {
			this._deferredServices[serviceName] = when.defer();
		});

		return whenKeys.map(serviceDefinitions, (serviceDefinition, serviceName) => {
			let service = this._resolveService(serviceDefinition, serviceName).tap(this._deferredServices[serviceName].resolve);

			return service;
		}).then((resolvedServices) => {
			return Object.keys(serviceDefinitions)
				.filter((serviceName) => serviceDefinitions[serviceName].public)
				.reduce((res, key) => (res[key] = resolvedServices[key], res), {});
		});
	}

	_resolveService(serviceDefinition, serviceName) {
		return this._resolveServiceRequirements(serviceDefinition, serviceName)
			.then((resolvedServiceDefinition) => {
				let service = this._instantiateService(resolvedServiceDefinition, serviceName);

				(resolvedServiceDefinition.calls || []).forEach(function(call) {
					service[call.method](...(call.arguments || []));
				});

				return service;
			});
	}

	_instantiateService(serviceDefinition, serviceName) {
		let args = serviceDefinition.arguments || [];
		let service = null;

		if(serviceDefinition.class) {
			service = new (serviceDefinition.class)(...args);
		} else if (serviceDefinition.factory) {
			if (serviceDefinition.method) {
				service = serviceDefinition.factory[serviceDefinition.method](...args);
			} else {
				service = serviceDefinition.factory(...args);
			}
		} else if (serviceDefinition.plainObject) {
			service = serviceDefinition.plainObject;
		} else {
			throw new Error(`Service »${serviceName}«, is invalid: no way to instantiate it.`);
		}

		return service;
	}

	_resolveServiceRequirements(serviceDefinition, serviceName) {
		let requirementPromises = {};

		this.constructor._mapAllReferences(serviceDefinition, (ref) => {
			if ( !(ref.$ref in this._deferredServices) ) {
				throw new Error(`Service »${serviceName}« depends on unknown service »${ref.$ref}«`);
			}
			requirementPromises[ref.$ref] = this._deferredServices[ref.$ref].promise;
		});

		return whenKeys.all(requirementPromises)
			.then((resolvedRequirements) => {
				return this.constructor._mapAllReferences(serviceDefinition, (ref) => {
					return resolvedRequirements[ref.$ref];
				});
			});
	}

	static _mapAllReferences(_object, operation) {
		let object = _.cloneDeep(_object);
		let toVisit = [object];

		let checkChild = function (child, key, arr){
			if(child && child.$ref) {
				arr[key] = operation(child);
			} else {
				toVisit.push(child);
			}
		};

		while(toVisit.length) {
			const visiting = toVisit.shift();

			if(Array.isArray(visiting)) {
				visiting.forEach(checkChild);
			} else if(typeof visiting === "object") {
				for(let key in visiting) {
					checkChild(visiting[key], key, visiting);
				}
			}
		}

		return object;
	}
}

module.exports = Resolver;
