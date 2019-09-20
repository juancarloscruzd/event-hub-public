var AWS = require("aws-sdk-mock");
const Promise = require("bluebird");
var listenerFactory = require("../src/listener");
var testListener;
AWS.Promise = Promise;
const eventUtils = require("../src/eventUtils.js");

describe("Listener", function() {
  beforeEach(function() {
    testListener = new listenerFactory.Listener();
  });
  beforeEach(function() {
    AWS.restore();
  });

  it("should be construct an un-initialized listener,", function() {
    expect(testListener.sns).not.toBeDefined();
    expect(testListener.lambda).not.toBeDefined();
  });
  it("should pass the message to a message handler", function(done) {
    let done1 = false;
    var event = {
      eventType: "ThatCoolEventType",
      eventDate: new Date().getTime()
    };

    let invoke = function(data, cb) {
      var params = {
        FunctionName: "myMessageHandler",
        InvocationType: "Listener event",
        Payload: eventUtils.stringify(event)
      };

      expect(data).toEqual(params);
      var result = {};
      done1 = true;
      cb(null, result);
    };
    AWS.mock("Lambda", "invoke", invoke);
    testListener.init();
    testListener
      .invokeMessageHandler(event, "myMessageHandler")
      .then(function() {
        expect(done1).toBeTruthy();
        done();
      })
      .catch(function(e) {
        console.log(e);
      });
  });
  it("should handle an array of messages", function(done) {
    let done1 = {};
    var events = [];
    events.push({
      eventType: "ThatCoolEventType1",
      eventDate: new Date().getTime()
    });
    events.push({
      eventType: "ThatCoolEventType2",
      eventDate: new Date().getTime()
    });
    events.push({
      eventType: "ThatCoolEventType3",
      eventDate: new Date().getTime()
    });

    let invoke = function(data, cb) {
      var e = JSON.parse(data.Payload);

      var result = {};
      done1[e.eventType] = true;
      cb(null, result);
    };
    AWS.mock("Lambda", "invoke", invoke);

    testListener.init();
    testListener
      .handleMessages(events, "myMessageHandler")
      .then(function() {
        expect(done1["ThatCoolEventType1"]).toBeTruthy();
        expect(done1["ThatCoolEventType2"]).toBeTruthy();
        expect(done1["ThatCoolEventType3"]).toBeTruthy();
        done();
      })
      .catch(function(e) {
        console.log(e);
      });
  });
  it("should handle an EMPTY array of messages", function(done) {
    let done1 = false;
    var events = [];

    let invoke = function(data, cb) {
      var e = JSON.parse(data.Payload);

      var result = {};
      done1 = true;
      cb(null, result);
    };
    AWS.mock("Lambda", "invoke", invoke);

    testListener.init();
    testListener
      .handleMessages(events, "myMessageHandler")
      .then(function() {
        expect(done1).toBeFalsy();
        done();
      })
      .catch(function(e) {
        console.log(e);
      });
  });
  it("should handle an UNDEFINED array of messages", function(done) {
    let done1 = false;
    var events;

    let invoke = function(data, cb) {
      var e = JSON.parse(data.Payload);

      var result = {};
      done1 = true;
      cb(null, result);
    };
    AWS.mock("Lambda", "invoke", invoke);

    testListener.init();
    testListener
      .handleMessages(events, "myMessageHandler")
      .then(function() {
        expect(done1).toBeFalsy();
        done();
      })
      .catch(function(e) {
        console.log(e);
      });
  });

  it("should check for messages on the given queue", function(done) {
    let done1 = false;

    let receiveMessage = function(data, cb) {
      var params = {
        QueueUrl: "myQueueUrl",
        MaxNumberOfMessages: 10
      };

      expect(data).toEqual(params);
      var result = {};
      done1 = true;
      cb(undefined, result);
    };
    AWS.mock("SQS", "receiveMessage", receiveMessage);
    testListener.init();
    testListener
      .checkForMessages("myQueueUrl")
      .then(function() {
        expect(done1).toBeTruthy();
        done();
      })
      .catch(function(e) {
        console.log(e);
      });
  });
});

describe("Handler", function() {
  beforeEach(function() {
    process.env.AWS_REGION = "us-west-2";
  });
  afterEach(function() {
    AWS.restore();
  });

  it("should check for messages on the given queue", function() {
    let done1 = false;
    let receiveMessage = function(data, cb) {
      var events = [];
      events.push({
        eventType: "ThatCoolEventType1",
        eventDate: new Date().getTime()
      });
      events.push({
        eventType: "ThatCoolEventType2",
        eventDate: new Date().getTime()
      });
      events.push({
        eventType: "ThatCoolEventType3",
        eventDate: new Date().getTime()
      });
      done1 = true;
      cb(undefined, events);
    };
    AWS.mock("SQS", "receiveMessage", receiveMessage);

    let messageObj = {
      Body: {
        Message: '{"messageQueueUrl":"myQueueUrl"}'
      }
    };
    let cb = function(err, message) {
      expect(err).not.toBeDefined();
      expect(message).toBeDefined();
    };
    let context;
    listenerFactory.handler(messageObj, context, cb);
  });
});
