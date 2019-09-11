const Promise = require("bluebird");
const AWS = require("aws-sdk-mock");
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
    const event = {};
    publisher.initialize();
    publisher.prepareEvent(event);

    expect(event.publishDate - new Date().getTime()).toBeLessThan(10);
    expect(event.publisher).toBe("PublisherLambda");
    expect(event.publisher).toBeDefined();
  });

  it("should publish the received event to a catchAll queue and to all existing topics", done => {
    let done1 = false;
    const event = {
      eventType: "ThatCoolEventType",
      eventDate: new Date().getTime()
    };

    const publish = (data, callback) => {
      const params = {
        TopicArn: "MyReceivedArn",
        Subject: "ThatCoolEventType",
        Message: eventUtils.stringify(event)
      };

      expect(data).toEqual(params);
      const topic = { topicArn: "1234567" };
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
    const event = {
      eventType: "ThatCoolEventType",
      eventDate: new Date().getTime()
    };

    const publish = (data, callback) => {
      const params = {
        TopicArn: "MyReceivedArn",
        Subject: "ThatCoolEventType",
        Message: eventUtils.stringify(event)
      };

      expect(data).toEqual(params);
      const topic = { topicArn: "1234567" };
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
    const callback = (err, event) => {
      expect(err).toEqual("Message is not an Event!");
      expect(event).not.toBeDefined();
    };
    pub.handler(message, undefined, callback);
  });

  it("should publish the given Event", donef => {
    let done1 = false;
    const publish = (data, callback) => {
      const topic = { topicArn: "1234567" };
      done1 = true;
      callback(null, topic);
    };

    AWS.mock("SNS", "publish", publish);
    const time = new Date().getTime();
    const message = {
      Message: eventUtils.stringify({
        eventType: "ThatCoolEventType",
        eventDate: time
      })
    };
    const callback = (err, event) => {
      expect(err).not.toBeDefined();
      expect(event.eventType).toEqual("ThatCoolEventType");
      expect(event.eventDate).toEqual(time);
      expect(event.publishDate).toBeDefined();
      expect(event.publisher).toEqual("PublisherLambda");
      expect(done1).toBeTruthy();
      donef();
    };
    pub.handler(message, undefined, callback);
  });
});
