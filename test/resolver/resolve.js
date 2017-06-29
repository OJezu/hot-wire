/* jshint mocha: true */
"use strict";

var chai = require("chai");
chai.use(require("dirty-chai"));
var expect = chai.expect;
var Resolver = require("../../src/Resolver.js");

describe("hotwire/Resolver", function() {
	describe("~resolve", function(){
		it("returns empty object, when not given services", function() {
			var r = new Resolver({});

			return r.resolve().then((services) => {
				expect(services).to.be.deep.equal({});
			});
		});

		it("returns instantiated services", function() {
			function Foo(args){ this.foo = true; }

			var r = new Resolver({
				"services": {
					"fooClass": {
						"class": Foo,
						"public": true,
					},
					"fooFactory": {
						"factory": function() { return {"foo": true}; },
						"public": true,
					},
					"fooPlain": {
						"plainObject": {"foo": true},
						"public": true,
					},
				},
			});

			return r.resolve().then((services) => {
				expect(services.fooClass).to.be.instanceOf(Foo);
				expect(services.fooClass.foo).to.be.true();
				expect(services.fooFactory.foo).to.be.true();
				expect(services.fooPlain.foo).to.be.true();
			});
		});

		it("resolves services with additional calls", function() {
			function Foo(args){ this.setFoo = (foo) => this.foo = foo; }

			var r = new Resolver({
				"services": {
					"foo": {
						"class": Foo,
						"public": true,
						"calls": [{"method": "setFoo", "arguments": [true]}],
					},
				},
			});

			return r.resolve().then((services) => {
				expect(services.foo.foo).to.be.true();
			});
		});

		it("resolves services with additional calls (no arguments)", function() {
			function Foo(args){ this.setFoo = () => this.foo = true; }

			var r = new Resolver({
				"services": {
					"foo": {
						"class": Foo,
						"public": true,
						"calls": [{"method": "setFoo"}],
					},
				},
			});

			return r.resolve().then((services) => {
				expect(services.foo.foo).to.be.true();
			});
		});

		it("resolves services instantiated with injected classes", function() {
			function Foo(args){ this.foo = true; }

			var r = new Resolver({
				"services": {
					"fooClass": {
						"plainObject": Foo,
					},
					"foo": {
						"class": {"$ref": "fooClass"},
						"public": true,
					},
				},
			});

			return r.resolve().then((services) => {
				expect(services.foo).to.be.instanceOf(Foo);
				expect(services.foo.foo).to.be.true();
			});
		});

		it("resolves nested properties", function() {
			var r = new Resolver({
				"services": {
					"foo": {
						"plainObject": {
							"foo": "Foo",
						},
					},
					"testCase": {
						"plainObject": {
							"injected": {"$ref": "foo"},
						},
						"public": true,
					},
				},
			});

			return r.resolve().then((services) => {
				expect(services.testCase.injected).to.be.deep.equal({"foo": "Foo"});
			});
		});

		it("resolves multiple nested properties", function() {
			var r = new Resolver({
				"services": {
					"foo": {
						"plainObject": {
							"foo": "Foo",
						},
					},
					"bar": {
						"plainObject": {
							"bar": "Bar",
						},
					},
					"testCase": {
						"plainObject": {
							"injected": {"$ref": "foo"},
							"injected2": {"$ref": "bar"},
						},
						"public": true,
					},
				},
			});

			return r.resolve().then((services) => {
				expect(services.testCase.injected).to.be.deep.equal({"foo": "Foo"});
				expect(services.testCase.injected2).to.be.deep.equal({"bar": "Bar"});
			});
		});

		it("resolves deeply nested properties", function() {
			var r = new Resolver({
				"services": {
					"foo": {
						"plainObject": {
							"foo": "Foo",
						},
					},
					"bar": {
						"plainObject": {
							"bar": {"$ref": "foo"},
						},
					},
					"testCase": {
						"plainObject": {
							"injected": {"$ref": "foo"},
							"injected2": {"$ref": "bar"},
						},
						"public": true,
					},
				},
			});

			return r.resolve().then((services) => {
				expect(services.testCase.injected).to.be.deep.equal({"foo": "Foo"});
				expect(services.testCase.injected2).to.be.deep.equal({"bar": {"foo": "Foo"}});
			});
		});

		it("respects public option", function() {
			var r = new Resolver({
				"services": {
					"visible": {
						"plainObject": true,
						"public": true,
					},
					"hiddenImplicit": {
						"plainObject": true,
					},
					"hiddenExplicit": {
						"plainObject": true,
						"public": false,
					},
				},
			});

			return r.resolve().then((services) => {
				expect(services.visible).to.be.true();
				expect(services).not.to.have.property("hiddenImplicit");
				expect(services).not.to.have.property("hiddenExplicit");
			});
		});

		it("throws an exception when unknown service is referenced", function() {
			var r = new Resolver({
				"services": {
					"foo": {
						"factory": function(){},
						"arguments": [{"$ref": "bar"}],
						"public": true,
					},
				},
			});

			return r.resolve().then(
				function() { throw new Error("unexpected success"); },
				function (error) {
					expect(error.message).to.match(/Service »foo« depends on unknown service »bar«/);
				}
			);
		});
	});
});
