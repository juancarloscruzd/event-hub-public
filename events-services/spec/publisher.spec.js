
var AWS = require('aws-sdk-mock');
const Promise = require("bluebird");
var pub = require('../src/publisher');
var publisher;
AWS.Promise = Promise;
const eventUtils = require('../src/eventUtils.js');

describe("publisher", function() {
	beforeEach(function() {
		process.env.RECEIVED_EVENTS_ARN = "MyReceivedArn";
	    publisher = new pub.Publisher();
	});
	afterEach(function() {
	    AWS.restore();
	});

	it("should be construct an un-initialized publisher,", function() {
		expect(publisher.sns).not.toBeDefined();
		expect(publisher.RECEIVED_EVENTS_ARN).toBe("MyReceivedArn");
	});
	it("should be initialized upon request", function() {
		expect(publisher.sns).not.toBeDefined();
		publisher.init();
		expect(publisher.sns).toBeDefined();
	});
	it("should prepare an event for pushing", function() {
		publisher.init();
		let event = {};
		let time = new Date().getTime();
		publisher.prepareEvent(event);
		expect(time - event.publishDate).toBeLessThan(100);
		expect(time - event.publishDate).toBe(0);
		expect(event.publisher).toBe("PublisherLambda");
		expect(event.publisher).toBeDefined();
	});

    it("should publish the received event", function(done) {
    	let done1 = false;
		var event = {
			eventType:"ThatCoolEventType",
			eventDate: new Date().getTime()
		};

    	let publish = function(data, cb){
	        var params = {
	            'TopicArn': "MyReceivedArn",
	            'Subject': "ThatCoolEventType",
	            'Message': eventUtils.stringify(event)
	        };

    		expect(data).toEqual(params);
			var topic = {topicArn:'1234567'};
			done1 = true;
			cb(null,topic);
		};
		AWS.mock('SNS', 'publish', publish);
		publisher.init();
    	publisher.publishEvent(event).then( function(){
    		expect(done1).toBeTruthy()
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
});
describe("Handler", function() {
	beforeEach(function() {
		process.env.RECEIVED_EVENTS_ARN = "MyReceivedArn";
	});
	afterEach(function() {
	    AWS.restore();
	});

	it("should NOT accept an invalid event (null)", function() {
		let message;
		let cb = function(err, event ) {
			expect(err).toEqual("Message is not an Event!");
			expect(event).not.toBeDefined();
		};
		let context;
		pub.handler(message, context, cb);
	});

	it("should publish the given Event", function(donef) {
		
		let done1 = false;
    	let publish = function(data, cb){
			var topic = {topicArn:'1234567'};
			done1 = true;
			cb(null, topic);
		};

		AWS.mock('SNS', 'publish', publish);
		var time = new Date().getTime();
		let message = {Message: eventUtils.stringify( {eventType:"ThatCoolEventType", eventDate: time})};
		let cb = function(err, event ) {
			expect(err).not.toBeDefined();
			expect(event.eventType).toEqual("ThatCoolEventType");
			expect(event.eventDate).toEqual(time);
			expect(event.publishDate).toBeDefined()
			expect(event.publisher).toEqual("PublisherLambda");
			expect(done1).toBeTruthy();
			donef()
		};
		let context;
		pub.handler(message, context, cb);
	});
});