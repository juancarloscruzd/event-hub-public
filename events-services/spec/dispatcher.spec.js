var AWS = require('aws-sdk-mock');
const Promise = require("bluebird");
var disp = require('../src/dispatcher');
var testDispatcher;
AWS.Promise = Promise;
const eventUtils = require('../src/eventUtils.js');

describe("Dispatcher", function() {
	beforeEach(function() {
        process.env.PUBLISHED_QUEUE_URL = "PUBLISHED_QUEUE_URL";
        process.env.CATCHALL_QUEUE_URL = "CATCHALL_QUEUE_URL";
	    testDispatcher = new disp.Dispatcher("myAwsAccountId");
	});
	beforeEach(function() {
	    AWS.restore();
	});

	it("should be construct an un-initialized publisher,", function() {
		expect(testDispatcher.sns).not.toBeDefined();
		expect(testDispatcher.PUBLISHED_QUEUE_URL).toBe("PUBLISHED_QUEUE_URL");
		expect(testDispatcher.CATCHALL_QUEUE_URL).toBe("CATCHALL_QUEUE_URL");
		expect(testDispatcher.AWS_ACCOUNTID).toBe("myAwsAccountId");
	});
    it("should delete a message from the queue", function(done) {
    	let done1 = false;
    	let deleteMessage = function(data, cb){
	        var params = {
	            ReceiptHandle: "1234567890",
	            QueueUrl: "PUBLISHED_QUEUE_URL"
	        };

    		expect(data).toEqual(params);
			var result = {};
			done1 = true;
			cb(null,result);
		};
		AWS.mock('SQS', 'deleteMessage', deleteMessage);
		testDispatcher.init();
    	testDispatcher.deleteMessage('1234567890').then( function(){
    		expect(done1).toBeTruthy()
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
    it("should dispatch an event to all it's subscribers (send to the eventType topic)", function(done) {
    	let done1 = false;
		var event = {
			eventType:"ThatCoolEventType",
			eventDate: new Date().getTime()
		};

    	let publish = function(data, cb){
	        var params = {
	            'TopicArn': "arn:aws:sns:undefined:myAwsAccountId:ThatCoolEventType",
	            'Subject': "ThatCoolEventType",
	            'Message': eventUtils.stringify(event),
	        };

    		expect(data).toEqual(params);
			var result = {};
			done1 = true;
			cb(null,result);
		};
		AWS.mock('SNS', 'publish', publish);
		testDispatcher.init();
    	testDispatcher.dispatchEvent(event, "ThatCoolEventType").then( function(){
    		expect(done1).toBeTruthy()
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
    it("should send all events to a catch-all queue", function(done) {
    	let done1 = false;
		var event = {
			eventType:"ThatCoolEventType",
			eventDate: new Date().getTime()
		};

    	let sendMessage = function(data, cb){
	        var params = {
	            MessageBody: eventUtils.stringify(event),
	            QueueUrl: "CATCHALL_QUEUE_URL"
	        };

    		expect(data).toEqual(params);
			var result = {};
			done1 = true;
			cb(null,result);
		};
		AWS.mock('SQS', 'sendMessage', sendMessage);
		testDispatcher.init();
    	testDispatcher.catchAll(event).then( function(){
    		expect(done1).toBeTruthy()
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
    it("should dispatch event to both catch all AND event topic for all subscribers", function(done) {
    	let done1 = false;
    	let done2 = false;
		var event = {
			eventType:"ThatCoolEventType",
			eventDate: new Date().getTime()
		};

    	let sendMessage = function(data, cb){
			var result = {};
			done1 = true;
			cb(null,result);
		};
    	let publish = function(data, cb){
			var result = {};
			done2 = true;
			cb(null,result);
		};
		AWS.mock('SNS', 'publish', publish);
		AWS.mock('SQS', 'sendMessage', sendMessage);

		testDispatcher.init();
    	testDispatcher.dispatch(event).then( function(){
    		expect(done1).toBeTruthy()
    		expect(done2).toBeTruthy()
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
});

describe("Dispatcher Handler", function() {
	beforeEach(function() {
        process.env.PUBLISHED_QUEUE_URL = "PUBLISHED_QUEUE_URL";
        process.env.CATCHALL_QUEUE_URL = "CATCHALL_QUEUE_URL";
	});

	afterEach(function() {
	    AWS.restore();
	});

	it("should NOT accept an incomplete message", function() {
		let message;
		let cb = function(err, event) {
			expect(err).toBe("Message is not an Event!");
			expect(event).not.toBeDefined();
		};
		let context;
		disp.handler(message, context, cb);
	});
	it("should dispatch the event on the message to all subscribers and to catch all", function(donef) {
    	let done1 = false;
    	let done2 = false;
    	let done3 = false;
		var event = {
			eventType:"ThatCoolEventType",
			eventDate: new Date().getTime()
		};

    	let sendMessage = function(data, cb){
			var result = {};
			done1 = true;
			cb(null,result);
		};
    	let publish = function(data, cb){
			var result = {};
			done2 = true;
			cb(null,result);
		};
    	let deleteMessage = function(data, cb){
			var result = {};
			done3 = true;
			cb(null,result);
		};
		AWS.mock('SQS', 'deleteMessage', deleteMessage);
		AWS.mock('SNS', 'publish', publish);
		AWS.mock('SQS', 'sendMessage', sendMessage);


		let context;
		var time = new Date().getTime();
		let message = {Message: eventUtils.stringify( {eventType:"ThatCoolEventType", eventDate: time})};
		let cb = function(err, event ) {
			expect(err).not.toBeDefined();
			expect(event.eventType).toEqual("ThatCoolEventType");
			expect(event.eventDate).toEqual(time);
    		expect(done1).toBeTruthy();
    		expect(done2).toBeTruthy();
			donef()
		};


		disp.handler(message, context, cb);
	});
	it("should delete the message, if there is a ReceiptHandle after dispatching the event on the message to all subscribers and to catch all", function(donef) {
    	let done1 = false;
    	let done2 = false;
    	let done3 = false;
		var event = {
			eventType:"ThatCoolEventType",
			eventDate: new Date().getTime()
		};

    	let sendMessage = function(data, cb){
			var result = {};
			done1 = true;
			cb(null,result);
		};
    	let publish = function(data, cb){
			var result = {};
			done2 = true;
			cb(null,result);
		};
    	let deleteMessage = function(data, cb){
			var result = {};
			done3 = true;
			cb(null,result);
		};
		AWS.mock('SQS', 'deleteMessage', deleteMessage);
		AWS.mock('SNS', 'publish', publish);
		AWS.mock('SQS', 'sendMessage', sendMessage);


		let context;
		var time = new Date().getTime();
		let message = {ReceiptHandle: "123456", Message: eventUtils.stringify( {eventType:"ThatCoolEventType", eventDate: time})};
		let cb = function(err, event ) {
			expect(err).not.toBeDefined();
			expect(event.eventType).toEqual("ThatCoolEventType");
			expect(event.eventDate).toEqual(time);
    		expect(done1).toBeTruthy();
    		expect(done2).toBeTruthy();
	   		expect(done3).toBeTruthy();
			donef()
		};


		disp.handler(message, context, cb);
	});

});
