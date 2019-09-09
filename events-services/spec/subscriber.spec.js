const Promise = require("bluebird");
var AWS = require("aws-sdk-mock");
var subs = require("../src/subscriber");
const logger = require("../src/logger.js");

var testSubscriber;
AWS.Promise = Promise;

const currentEnv = process.env;

describe("subscriber", () => {
  beforeEach(() => {
    testSubscriber = new subs.Subscriber();
  });

  afterEach(() => {
    AWS.restore();
  });

  it("should be initialized upon request", () => {
    expect(testSubscriber.SNS).not.toBeDefined();
    expect(testSubscriber.SQS).not.toBeDefined();
    testSubscriber.initialize();

    expect(testSubscriber.SNS).toBeDefined();
    expect(testSubscriber.SQS).toBeDefined();
  });

  it("should create a topic for the event with the given type", done => {
    let done1 = false;
    let createTopic = (data, callback) => {
      expect(data).toEqual({ Name: "MyEventType" });
      done1 = true;
      callback(null, { topicArn: "1234567" });
    };
    AWS.mock("SNS", "createTopic", createTopic);
    testSubscriber.initialize();
    testSubscriber
      .createEventTopic("MyEventType")
      .then(() => {
        expect(done1).toBeTruthy();
        done();
      })
      .catch(err => {
        logger.error(err);
      });
  });

  it("should NOT create a topic if eventType is undefined", done => {
    let createTopic = jasmine.createSpy("createTopic");
    AWS.mock("SNS", "createTopic", createTopic);
    testSubscriber.initialize();
    try {
      testSubscriber.createEventTopic();
    } catch (e) {
      expect(createTopic).not.toHaveBeenCalled();
      done();
    }
  });

  it("should create the dedicated queue for the subscriber ", done => {
    var doneCreateQueue = false;
    let createQueue = (data, callback) => {
      let params = {
        QueueName: "DLVRY-notifications",
        Attributes: {}
      };

      expect(data).toEqual(params);
      doneCreateQueue = true;
      callback(null, { QueueUrl: "MyQueueUrl" });
    };
    var doneTagQueue = false;
    let tagQueue = data => {
      let params = {
        QueueUrl: "MyQueueUrl",
        Tags: {
          notificationUrl: "https://my.hook.url"
        }
      };
      doneTagQueue = true;

      expect(data).toEqual(params);
    };

    AWS.mock("SQS", "tagQueue", tagQueue);
    AWS.mock("SQS", "createQueue", createQueue);

    testSubscriber.initialize();
    testSubscriber
      .createSubscriberQueue("notifications", "https://my.hook.url")
      .then(() => {
        expect(doneCreateQueue).toBeTruthy();
        expect(doneTagQueue).toBeTruthy();
        AWS.restore();
        done();
      })
      .catch(err => {
        logger.error(err);
        done();
      });
  });

  it("should NOT create the dedicated queue if subscriber is undefined", done => {
    let createQueue = jasmine.createSpy("createQueue");
    AWS.mock("SQS", "createQueue", createQueue);
    testSubscriber.initialize();
    try {
      testSubscriber.createSubscriberQueue();
    } catch (e) {
      expect(createQueue).not.toHaveBeenCalled();
      done();
    }
  });

  it("should create the dedicated queue for the subscriber even without a notificationURL", done => {
    var doneCreateQueue = false;
    let createQueue = (data, callback) => {
      let params = {
        QueueName: "DLVRY-notifications",
        Attributes: {}
      };

      expect(data).toEqual(params);
      doneCreateQueue = true;
      callback(null, { QueueUrl: "MyQueueUrl" });
    };
    let tagQueue = jasmine.createSpy("tagQueue");

    AWS.mock("SQS", "tagQueue", tagQueue);
    AWS.mock("SQS", "createQueue", createQueue);

    testSubscriber.initialize();
    testSubscriber
      .createSubscriberQueue("notifications")
      .then(() => {
        expect(doneCreateQueue).toBeTruthy();
        expect(tagQueue).not.toHaveBeenCalled();
        AWS.restore();
        done();
      })
      .catch(err => {
        logger.error(err);
        done();
      });
  });

  it("should load the ARN for the given queue", done => {
    let getQueueAttributes = (data, callback) => {
      var params = {
        QueueUrl: "MyQueueUrl",
        AttributeNames: ["QueueArn"]
      };

      expect(data).toEqual(params);
      callback(null, { Attributes: { QueueArn: "myQueueArn" } });
    };
    AWS.mock("SQS", "getQueueAttributes", getQueueAttributes);
    testSubscriber.initialize();
    testSubscriber
      .getQueueArn({ QueueUrl: "MyQueueUrl" })
      .then(() => {
        done();
      })
      .catch(err => {
        logger.error(err);
      });
  });

  it("should set the policy for the queue", done => {
    var doneSetAttibute = false;
    let setQueueAttributes = (data, callback) => {
      var attributes = {
        Version: "2008-10-17",
        Id: "myQueueArn/SQSDefaultPolicy",
        Statement: [
          {
            Sid: "SidmyTopic",
            Effect: "Allow",
            Principal: {
              AWS: "*"
            },
            Action: "SQS:SendMessage",
            Resource: "myQueueArn",
            Condition: {
              ArnEquals: {
                "aws:SourceArn": "myTopic"
              }
            }
          }
        ]
      };
      doneSetAttibute = true;
      var dataObj = JSON.parse(data.Attributes.Policy);

      expect(dataObj.Id).toEqual(attributes.Id);
      expect(dataObj.Statement[0].Condition).toEqual(
        attributes.Statement[0].Condition
      );
      callback(null, { Attributes: { QueueArn: "myQueueArn" } });
    };
    AWS.mock("SQS", "setQueueAttributes", setQueueAttributes);

    testSubscriber.initialize();
    testSubscriber
      .setQueuePolicy(
        { TopicArn: "myTopic" },
        { QueueUrl: "MyQueueUrl", QueueArn: "myQueueArn" }
      )
      .then(() => {
        expect(doneSetAttibute).toBeTruthy();
        done();
      })
      .catch(err => {
        logger.error(err);
      });
  });

  it("should subscribe a queue to a topic", done => {
    let done1 = false,
      done2 = false,
      done3 = false;
    var loadedQueue = { Attributes: { QueueArn: "myQueueArn" } };

    let getQueueAttributes = (data, callback) => {
      done1 = true;
      callback(null, loadedQueue);
    };
    let setQueueAttributes = (data, callback) => {
      done2 = true;
      callback(null, loadedQueue);
    };
    let subscribe = (data, callback) => {
      let params = {
        TopicArn: "1234567",
        Protocol: "sqs",
        Endpoint: "myQueueArn"
      };

      expect(data).toEqual(params);
      done3 = true;
      callback(null, { result: "12345" });
    };

    let queue = { QueueUrl: "MyQueueUrl", QueueArn: "myQueueArn" };

    AWS.mock("SQS", "getQueueAttributes", getQueueAttributes);
    AWS.mock("SNS", "subscribe", subscribe);
    AWS.mock("SQS", "setQueueAttributes", setQueueAttributes);

    testSubscriber.initialize();
    testSubscriber
      .subscribeQueueToTopic({ TopicArn: "1234567" }, queue)
      .then(() => {
        expect(done1).toBeTruthy();
        expect(done2).toBeTruthy();
        expect(done3).toBeTruthy();
        done();
      })
      .catch(err => {
        logger.error(err);
      });
  });

  it("should subscribe a subscriber to an event type", donef => {
    let done = new Array(8).fill(false);
    let createTopic = (data, callback) => {
      done[0] = true;
      callback(null, { TopicArn: "1234567" });
    };
    let tagQueue = () => (done[1] = true);

    let createQueue = (data, callback) => {
      done[2] = true;
      callback(null, { QueueUrl: "MyQueueUrl" });
    };

    let getQueueAttributes = (data, callback) => {
      done[3] = true;
      callback(null, { Attributes: { QueueArn: "myQueueArn" } });
    };
    let subscribe = (data, callback) => {
      done[4] = true;
      callback(null, { result: "12345" });
    };
    let setQueueAttributes = (data, callback) => {
      done[5] = true;
      callback(null, { Attributes: { QueueArn: "myQueueArn" } });
    };

    AWS.mock("SNS", "createTopic", createTopic);
    AWS.mock("SQS", "tagQueue", tagQueue);
    AWS.mock("SQS", "createQueue", createQueue);
    AWS.mock("SQS", "getQueueAttributes", getQueueAttributes);
    AWS.mock("SNS", "subscribe", subscribe);
    AWS.mock("SQS", "setQueueAttributes", setQueueAttributes);

    testSubscriber.initialize();
    testSubscriber
      .subscribeToEventType(
        "MyGreatSubscriber",
        "ThisCoolEventType",
        "http://my.notification.url"
      )
      .then(() => {
        expect(done[0]).toBeTruthy();
        expect(done[1]).toBeTruthy();
        expect(done[2]).toBeTruthy();
        expect(done[3]).toBeTruthy();
        expect(done[4]).toBeTruthy();
        expect(done[5]).toBeTruthy();
        donef();
      })
      .catch(err => logger.error(err));
  });
});

describe("Subscriber Handler", () => {
  beforeEach(() => {
    process.env = { ...process.env, AWS_REGION: "us-west-1" };
  });

  afterEach(() => {
    process.env = currentEnv;
    AWS.restore();
  });

  it("should NOT accept an incomplete undefined event (null)", function() {
    let callback = (err, subscription) => {
      expect(err).toBe("Message is not a subscription!");
      expect(subscription).not.toBeDefined();
    };
    subs.handler(undefined, undefined, callback);
  });

  it("should NOT accept an incomplete message (no subscriber)", () => {
    let message = {
      eventType: "ThisCoolEventType",
      notificationUrl: "http://my.notification.url"
    };
    let callback = (err, subscription) => {
      expect(err).toBe("Message is not a subscription!");
      expect(subscription).toBe(message);
    };
    subs.handler(message, undefined, callback);
  });

  it("should NOT accept an incomplete message (no eventType)", () => {
    let message = {
      subscriber: "MyGreatSubscriber",
      notificationUrl: "http://my.notification.url"
    };
    let callback = function(err, subscription) {
      expect(err).toBe("Message is not a subscription!");
      expect(subscription).toBe(message);
    };
    let context;
    subs.handler(message, context, callback);
  });

  it("should receive a message and subscribe a subscriber to an eventType", donef => {
    const done = new Array(8).fill(false);
    const createdQueue = { QueueUrl: "MyQueueUrl", QueueArn: "myQueueArn" };
    const createdDeliveryStream = { result: true };
    const queueAttributes = { Attributes: { QueueArn: "myQueueArn" } };

    const createTopic = (data, callback) => {
      done[0] = true;
      callback(null, { TopicArn: "1234567" });
    };

    const tagQueue = () => (done[1] = true);

    const createQueue = (data, callback) => {
      done[2] = true;
      callback(null, createdQueue);
    };

    const getQueueAttributes = (data, callback) => {
      done[3] = true;
      callback(null, queueAttributes);
    };

    const subscribe = (data, callback) => {
      done[4] = true;
      callback(null, { result: "12345" });
    };

    const setQueueAttributes = (data, callback) => {
      done[5] = true;
      callback(null, queueAttributes);
    };

    const listDeliveryStreams = (data, callback) => {
      done[6] = true;
      callback(null, { DeliveryStreamNames: ["ds1", "ds2", "ds3"] });
    };

    const createDeliveryStream = (data, callback) => {
      done[6] = true;
      callback(null, createdDeliveryStream);
    };

    AWS.mock("SNS", "createTopic", createTopic);
    AWS.mock("SQS", "tagQueue", tagQueue);
    AWS.mock("SQS", "createQueue", createQueue);
    AWS.mock("SQS", "getQueueAttributes", getQueueAttributes);
    AWS.mock("SNS", "subscribe", subscribe);
    AWS.mock("SQS", "setQueueAttributes", setQueueAttributes);
    AWS.mock("Firehose", "listDeliveryStreams", listDeliveryStreams);
    AWS.mock("Firehose", "createDeliveryStream", createDeliveryStream);

    let message = {
      eventType: "ThisCoolEventType",
      subscriber: "MyGreatSubscriber",
      notificationUrl: "http://my.notification.url"
    };

    let callback = function(err, result) {
      expect(err).not.toBeDefined();
      expect(result).toEqual({
        request: message,
        subscription: createdQueue,
        deliveryStream: createdDeliveryStream
      });
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
    subs.handler(message, context, callback);
  });
});
