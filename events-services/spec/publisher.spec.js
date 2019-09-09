const Promise = require("bluebird");
var AWS = require("aws-sdk-mock");
const eventUtils = require("../src/eventUtils.js");
const logger = require("../src/logger.js");
const pub = require("../src/publisher");

AWS.Promise = Promise;
let publisher;
const currentEnv = process.env;
describe("publisher", () => {
  beforeEach(() => {
    process.env.RECEIVED_EVENTS_ARN = "MyReceivedArn";
    publisher = new pub.Publisher();
  });

  afterEach(() => {
    AWS.restore();
    process.env = currentEnv;
  });

  it("should be construct an un-initialized publisher,", () => {
    expect(publisher.SNS).not.toBeDefined();
    expect(publisher.RECEIVED_EVENTS_ARN).toBe("MyReceivedArn");
  });

  it("should be initialized upon request", () => {
    expect(publisher.SNS).not.toBeDefined();
    publisher.initialize();

    expect(publisher.SNS).toBeDefined();
  });

  it("should prepare an event for pushing", () => {
    publisher.initialize();
    let event = {};
    let time = new Date().getTime();
    publisher.prepareEvent(event);

    expect(event.publishDate - time).toBeLessThan(10);
    expect(event.publisher).toBe("PublisherLambda");
    expect(event.publisher).toBeDefined();
  });

  it("should publish the received event to a catchAll queue and to all existing topics", done => {
    let done1 = false;
    var event = {
      eventType: "ThatCoolEventType",
      eventDate: new Date().getTime()
    };

    let publish = (data, callback) => {
      var params = {
        TopicArn: "MyReceivedArn",
        Subject: "ThatCoolEventType",
        Message: eventUtils.stringify(event)
      };

      expect(data).toEqual(params);
      var topic = { topicArn: "1234567" };
      done1 = true;
      callback(undefined, topic);
    };

    AWS.mock("SNS", "publish", publish);
    publisher.initialize();
    publisher
      .publishEvent(event)
      .then(() => {
        expect(done1).toBeTruthy();
        done();
      })
      .catch(err => logger.console.error(err));
  });

  it("should publish the received event to a catchAll queue only if topic does not exists", done => {
    let done1 = false;
    var event = {
      eventType: "ThatCoolEventType",
      eventDate: new Date().getTime()
    };

    let publish = (data, callback) => {
      var params = {
        TopicArn: "MyReceivedArn",
        Subject: "ThatCoolEventType",
        Message: eventUtils.stringify(event)
      };

      expect(data).toEqual(params);
      var topic = { topicArn: "1234567" };
      done1 = true;
      callback("err", topic);
    };

    AWS.mock("SNS", "publish", publish);
    publisher.initialize();
    publisher
      .publishEvent(event)
      .then(res => {
        expect(res).toBe("[PUBLISHER] topic does not exist");
        expect(done1).toBeTruthy();
        done();
      })
      .catch(err => logger.error(err));
  });
});

describe("Handler", () => {
  beforeEach(() => (process.env.RECEIVED_EVENTS_ARN = "MyReceivedArn"));

  afterEach(() => AWS.restore());

  it("should NOT accept an invalid event (null)", () => {
    let message;
    let callback = (err, event) => {
      expect(err).toEqual("Message is not an Event!");
      expect(event).not.toBeDefined();
    };
    let context;
    pub.handler(message, context, callback);
  });

  it("should publish the given Event", donef => {
    let done1 = false;
    let publish = (data, callback) => {
      var topic = { topicArn: "1234567" };
      done1 = true;
      callback(null, topic);
    };

    AWS.mock("SNS", "publish", publish);
    var time = new Date().getTime();
    let message = {
      Message: eventUtils.stringify({
        eventType: "ThatCoolEventType",
        eventDate: time
      })
    };
    let callback = (err, event) => {
      expect(err).not.toBeDefined();
      expect(event.eventType).toEqual("ThatCoolEventType");
      expect(event.eventDate).toEqual(time);
      expect(event.publishDate).toBeDefined();
      expect(event.publisher).toEqual("PublisherLambda");
      expect(done1).toBeTruthy();
      donef();
    };
    let context;
    pub.handler(message, context, callback);
  });
});
