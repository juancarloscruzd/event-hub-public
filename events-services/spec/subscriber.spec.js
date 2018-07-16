var AWS = require('aws-sdk-mock');
const Promise = require("bluebird");
var subs = require('../src/subscriber');
var testSubscriber;
AWS.Promise = Promise;

describe("subscriber", function() {
	beforeEach(function() {
	    testSubscriber = new subs.Subscriber();
	});
	afterEach(function() {
	    AWS.restore();
	});

	it("should be initialized upon request", function() {
		expect(testSubscriber.sns).not.toBeDefined();
		expect(testSubscriber.sqs).not.toBeDefined();
		testSubscriber.init();
		expect(testSubscriber.sns).toBeDefined();
		expect(testSubscriber.sqs).toBeDefined();
	});    
    it("should create a topic for the event with the given type", function(done) {
    	let done1 = false;
    	let createTopic = function(data, cb){
    		expect(data).toEqual({Name:'MyEventType'});
			var topic = {topicArn:'1234567'};
			done1 = true;
			cb(null,topic);
		};
		AWS.mock('SNS', 'createTopic', createTopic);
		testSubscriber.init();
    	testSubscriber.createEventTopic('MyEventType').then( function(){
    		expect(done1).toBeTruthy()
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
    it("should NOT create a topic if eventType is undefined", function(done) {
    	let createTopic = jasmine.createSpy('createTopic')
		AWS.mock('SNS', 'createTopic', createTopic);
		testSubscriber.init();
		try{
			testSubscriber.createEventTopic();	
		} catch(e){
    		expect(createTopic).not.toHaveBeenCalled();
    		done();
    	};
    });
    it("should create the dedicated queue for the subscriber ", function(done) {
    	var doneCreateQueue = false;
    	let createQueue = function(data, cb) {
    		let params = {
            	QueueName: "DLVRY-notifications",
            	Attributes: {}
        	};
        	expect(data).toEqual(params);
        	doneCreateQueue = true;
        	cb(null, {QueueUrl:'MyQueueUrl'} )
    	};
    	var doneTagQueue = false;
    	let tagQueue = function(data) {
    		let params = {
                QueueUrl: 'MyQueueUrl',
                Tags: { 
                    'notificationUrl': 'https://my.hook.url'
                }
            };
			doneTagQueue = true;
			expect(data).toEqual(params);
    	};

    	AWS.mock('SQS', 'tagQueue', tagQueue);
		AWS.mock('SQS', 'createQueue', createQueue);

		testSubscriber.init();
    	var p = testSubscriber.createSubscriberQueue('notifications', 'https://my.hook.url').then(function( queuUrl){
    		expect(doneCreateQueue).toBeTruthy()
    		expect(doneTagQueue).toBeTruthy()
    		AWS.restore();
    		done();
    	}).catch(function(e){
    		console.log(e);
    		done();
    	});		
    });
    it("should NOT create the dedicated queue if subscriber is undefined", function(done) {
    	let createQueue = jasmine.createSpy('createQueue')
		AWS.mock('SQS', 'createQueue', createQueue);
		testSubscriber.init();
		try{
			testSubscriber.createSubscriberQueue();	
		} catch(e){
    		expect(createQueue).not.toHaveBeenCalled();
    		done();
    	};
    });

    it("should create the dedicated queue for the subscriber even without a notificationURL", function(done) {
    	//let createQueue = jasmine.createSpy('createQueue').and.returnValue(Promise.resolve({QueueUrl:'MyUrl'}));;
    	var doneCreateQueue = false;
    	let createQueue = function(data, cb) {
    		let params = {
            	QueueName: "DLVRY-notifications",
            	Attributes: {}
        	};
        	expect(data).toEqual(params);
        	doneCreateQueue = true;
        	cb(null, {QueueUrl:'MyQueueUrl'} )
    	};
    	let tagQueue = jasmine.createSpy('tagQueue')

    	AWS.mock('SQS', 'tagQueue', tagQueue);
		AWS.mock('SQS', 'createQueue', createQueue);

		testSubscriber.init();
    	var p = testSubscriber.createSubscriberQueue('notifications').then(function( queuUrl){
    		expect(doneCreateQueue).toBeTruthy();
    		expect(tagQueue).not.toHaveBeenCalled();
    		AWS.restore();
    		done();
    	}).catch(function(e){
    		console.log(e);
    		done();
    	});		
    });
    it("should load the ARN for the given queue", function(done) {
    	let getQueueAttributes = function(data, cb){
        	var params = {
        	    QueueUrl: 'MyQueueUrl',
    	        AttributeNames: ["QueueArn"]
	        };

    		expect(data).toEqual(params);
			var loadedQueue = {Attributes:{QueueArn:'myQueueArn'}};
			cb(null,loadedQueue);
		};
		AWS.mock('SQS', 'getQueueAttributes', getQueueAttributes);
		testSubscriber.init();
    	testSubscriber.getQueueArn({QueueUrl:'MyQueueUrl'}).then( function(){
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
    it("should set the policy for the queue", function(done) {
    	var doneSetAttibute = false;
    	let setQueueAttributes = function(data, cb){
	        var attributes = {
	            "Version": "2008-10-17",
	            "Id": "myQueueArn/SQSDefaultPolicy",
	            "Statement": [{
	                "Sid": "SidmyTopic",
	                "Effect": "Allow",
	                "Principal": {
	                    "AWS": "*"
	                },
	                "Action": "SQS:SendMessage",
	                "Resource": "myQueueArn",
	                "Condition": {
	                    "ArnEquals": {
	                        "aws:SourceArn": "myTopic"
	                    }
	                }
	            }]
	        };
	        let params = {
	            QueueUrl: "MyQueueUrl",
	            Attributes: {
	                'Policy': JSON.stringify(attributes)
	            }
	        };
	        doneSetAttibute = true;
    		expect(data).toEqual(params);
			var result = {Attributes:{QueueArn:'myQueueArn'}};
			cb(null, result);
		};
		AWS.mock('SQS', 'setQueueAttributes', setQueueAttributes);

		testSubscriber.init();
    	testSubscriber.setQueuePolicy('myTopic', {QueueUrl:'MyQueueUrl', QueueArn: 'myQueueArn'}).then( function(){
    		expect(doneSetAttibute).toBeTruthy();
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
    it("should subscribe a qqueue to a topic", function(done) {
    	let done1 = false;
    	let getQueueAttributes = function(data, cb){
			var loadedQueue = {Attributes:{QueueArn:'myQueueArn'}};
			done1 = true;
			cb(null,loadedQueue);
		};
		let done2 = false;
    	let setQueueAttributes = function(data, cb){
			var loadedQueue = {Attributes:{QueueArn:'myQueueArn'}};
			done2 = true;
			cb(null,loadedQueue);
		};
		let done3 = false;
    	let subscribe = function(data, cb){
        	let params = {
                'TopicArn': "1234567",
                'Protocol': 'sqs',
                'Endpoint': "myQueueArn"
	        };

    		expect(data).toEqual(params);
    		done3 = true;
			cb(null, {"result":"12345"});
		};

		let queue = {QueueUrl:'MyQueueUrl', QueueArn: 'myQueueArn'};

		AWS.mock('SQS', 'getQueueAttributes', getQueueAttributes);
		AWS.mock('SNS', 'subscribe', subscribe );
		AWS.mock('SQS', 'setQueueAttributes', setQueueAttributes);

		testSubscriber.init();
    	testSubscriber.subscribeQueueToTopic({TopicArn:'1234567'}, queue ).then( function(){
    		expect(done1).toBeTruthy();
    		expect(done2).toBeTruthy();
    		expect(done3).toBeTruthy();
    		done();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
    it("should subscribe a subscriber to an event type", function(donef) {
    	let done = [false,false,false,false,false,false];
    	let createTopic = function(data, cb){
			done[0] = true;
			cb(null,{TopicArn:'1234567'});
		};
    	let tagQueue = function(data) {
			done[1] = true;
    	};
    	let createQueue = function(data, cb) {
        	done[2] = true;
        	cb(null, {QueueUrl:'MyQueueUrl'} )
    	};

    	let getQueueAttributes = function(data, cb){
			var loadedQueue = {Attributes:{QueueArn:'myQueueArn'}};
			done[3] = true;
			cb(null,loadedQueue);
		};
    	let subscribe = function(data, cb){
    		done[4] = true;
			cb(null, {"result":"12345"});
		};
    	let setQueueAttributes = function(data, cb){
			var loadedQueue = {Attributes:{QueueArn:'myQueueArn'}};
			done[5] = true;
			cb(null,loadedQueue);
		};

		AWS.mock('SNS', 'createTopic', createTopic);
    	AWS.mock('SQS', 'tagQueue', tagQueue);
		AWS.mock('SQS', 'createQueue', createQueue);
		AWS.mock('SQS', 'getQueueAttributes', getQueueAttributes);
		AWS.mock('SNS', 'subscribe', subscribe );
		AWS.mock('SQS', 'setQueueAttributes', setQueueAttributes);

		testSubscriber.init();
    	testSubscriber.subscribeToEventType("MyGreatSubscriber", "ThisCoolEventType", "http://my.notification.url" ).then( function(){
    		expect(done[0]).toBeTruthy();
    		expect(done[1]).toBeTruthy();
    		expect(done[2]).toBeTruthy();
    		expect(done[3]).toBeTruthy();
    		expect(done[4]).toBeTruthy();
    		expect(done[5]).toBeTruthy();
    		donef();
    	}).catch(function(e){
    		console.log(e);
    	});
    });
});

describe("Subscriber Handler", function() {
	afterEach(function() {
	    AWS.restore();
	});

	it("should NOT accept an incomplete message (null)", function() {
		let message;
		let cb = function(err,subscription) {
			expect(err).toBe("Message is not a subscription!");
			expect(subscription).not.toBeDefined();
		};
		let context;
		subs.handler(message, context, cb);
	});
	it("should NOT accept an incomplete message (no subscriber)", function() {
		let message = {
			eventType:"ThisCoolEventType",
			notificationUrl:"http://my.notification.url"
		};
		let cb = function(err,subscription) {
			expect(err).toBe("Message is not a subscription!");
			expect(subscription).toBe( message );
		};
		let context;
		subs.handler(message, context, cb);
	});
	it("should NOT accept an incomplete message (no eventType)", function() {
		let message = {
			subscriber:"MyGreatSubscriber",
			notificationUrl:"http://my.notification.url"
		};
		let cb = function(err,subscription) {
			expect(err).toBe("Message is not a subscription!");
			expect(subscription).toBe( message );
		};
		let context;
		subs.handler(message, context, cb);
	});

	it("should receive a message and subscribe a subscriber to an eventType", function(donef) {

    	let done = [false,false,false,false,false,false, false];
    	let createTopic = function(data, cb){
			done[0] = true;
			cb(null,{TopicArn:'1234567'});
		};
    	let tagQueue = function(data) {
			done[1] = true;
    	};
    	let createQueue = function(data, cb) {
        	done[2] = true;
        	cb(null, {QueueUrl:'MyQueueUrl'} )
    	};

    	let getQueueAttributes = function(data, cb){
			var loadedQueue = {Attributes:{QueueArn:'myQueueArn'}};
			done[3] = true;
			cb(null,loadedQueue);
		};
    	let subscribe = function(data, cb){
    		done[4] = true;
			cb(null, {"result":"12345"});
		};
    	let setQueueAttributes = function(data, cb){
			var loadedQueue = {Attributes:{QueueArn:'myQueueArn'}};
			done[5] = true;
			cb(null,loadedQueue);
		};

		AWS.mock('SNS', 'createTopic', createTopic);
    	AWS.mock('SQS', 'tagQueue', tagQueue);
		AWS.mock('SQS', 'createQueue', createQueue);
		AWS.mock('SQS', 'getQueueAttributes', getQueueAttributes);
		AWS.mock('SNS', 'subscribe', subscribe );
		AWS.mock('SQS', 'setQueueAttributes', setQueueAttributes);

		let message = {
			eventType:"ThisCoolEventType",
			subscriber:"MyGreatSubscriber",
			notificationUrl:"http://my.notification.url"
		};
		let cb = function(err,subscription) {
			expect(err).not.toBeDefined();
			expect(subscription).toBe(message);
			done[6] = true;
    		expect(done[0]).toBeTruthy();
    		expect(done[1]).toBeTruthy();
    		expect(done[2]).toBeTruthy();
    		expect(done[3]).toBeTruthy();
    		expect(done[4]).toBeTruthy();
    		expect(done[5]).toBeTruthy();
    		expect(done[6]).toBeTruthy();
    		donef();
		};
		let context;
		subs.handler(message, context, cb);
		
	});
});