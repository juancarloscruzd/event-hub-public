var AWS = require('aws-sdk-mock');
const Promise = require("bluebird");
var deliveryFactory = require('../src/delivery');
var testDelivery;
AWS.Promise = Promise;
const eventUtils = require('../src/eventUtils.js');

describe("Listener", function() {
	beforeEach(function() {
	    //testListener = new listenerFactory.Listener();
	});
	beforeEach(function() {
	    //AWS.restore();
	});

	it("should be construct an un-initialized listener,", function() {
		//expect(testListener.sns).not.toBeDefined();
		//expect(testListener.lambda).not.toBeDefined();
	});
});