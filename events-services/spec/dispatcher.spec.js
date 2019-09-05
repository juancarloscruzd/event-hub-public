const Promise = require("bluebird");
const AWS = require("aws-sdk-mock");
const eventUtils = require("../src/eventUtils.js");
const logger = require("../src/logger.js");
const disp = require("../src/dispatcher");

AWS.Promise = Promise;
let testDispatcher;

describe("Dispatcher", () => {
  beforeEach(function() {
    process.env.PUBLISHED_QUEUE_URL = "PUBLISHED_QUEUE_URL";
    process.env.CATCHALL_QUEUE_URL = "CATCHALL_QUEUE_URL";
    process.env.AWS_ACCOUNTID = "myAwsAccountId";
    testDispatcher = new disp.Dispatcher();
  });

  afterEach(function() {
    AWS.restore();
  });

  it("should be construct an un-initialized publisher,", () => {
    expect(testDispatcher.sns).not.toBeDefined();
    expect(testDispatcher.PUBLISHED_QUEUE_URL).toBe("PUBLISHED_QUEUE_URL");
    expect(testDispatcher.CATCHALL_QUEUE_URL).toBe("CATCHALL_QUEUE_URL");
    expect(testDispatcher.AWS_ACCOUNTID).toBe("myAwsAccountId");
  });

  it("should dispatch an event to all it's subscribers (send to the eventType topic)", done => {
    let done1 = false;
    let event = {
      eventType: "ThatCoolEventType",
      eventDate: new Date().getTime()
    };

    let publish = function(data, callback) {
      let params = {
        TopicArn: "arn:aws:sns:undefined:myAwsAccountId:ThatCoolEventType",
        Subject: "ThatCoolEventType",
        Message: eventUtils.stringify(event)
      };

      expect(data).toEqual(params);
      let result = {};
      done1 = true;
      callback(null, result);
    };

    AWS.mock("SNS", "publish", publish);

    testDispatcher.initialize();
    testDispatcher
      .dispatchToEventsTopic(event, "ThatCoolEventType")
      .then(() => {
        expect(done1).toBeTruthy();
        done();
      })
      .catch(err => logger.error(err));
  });

  it("should send all events to a catch-all queue", done => {
    let done1 = false;
    let event = {
      eventType: "ThatCoolEventType",
      eventDate: new Date().getTime()
    };

    let sendMessage = (data, callback) => {
      let params = {
        MessageBody: eventUtils.stringify(event),
        QueueUrl: "CATCHALL_QUEUE_URL"
      };

      expect(data).toEqual(params);
      let result = {};
      done1 = true;
      callback(null, result);
    };
    AWS.mock("SQS", "sendMessage", sendMessage);
    testDispatcher.initialize();
    testDispatcher
      .dispatchToCatchAllQueue(event)
      .then(() => {
        expect(done1).toBeTruthy();
        done();
      })
      .catch(err => logger.error(err));
  });

  it("should dispatch an array of events to both catch all AND event topic for all subscribers", done => {
    let done1 = 0;
    let done2 = 0;
    let events = [
      {
        eventType: "ThatCoolEventType",
        eventDate: new Date().getTime(),
        application: "app1"
      },
      {
        eventType: "ThatCoolEventType",
        eventDate: new Date().getTime(),
        application: "app2"
      }
    ];

    let sendMessage = (data, callback) => {
      let result = {};
      done1++;
      callback(null, result);
    };

    let publish = (data, callback) => {
      let result = {};
      done2++;
      callback(null, result);
    };

    const putRecord = (data, callback) => {
      callback(null, { RecordId: "12345" });
    };

    AWS.mock("SNS", "publish", publish);
    AWS.mock("SQS", "sendMessage", sendMessage);
    AWS.mock("Firehose", "putRecord", putRecord);

    testDispatcher.initialize();
    testDispatcher
      .dispatchAll(events)
      .then(function() {
        expect(done1).toBe(2);
        expect(done2).toBe(2);
        done();
      })
      .catch(err => {
        logger.error(err);
        done();
      });
  });
});

describe("Dispatcher Handler", () => {
  beforeEach(function() {
    process.env.CATCHALL_QUEUE_URL = "CATCHALL_QUEUE_URL";
    process.env.AWS_REGION = "us-west-2";
  });

  afterEach(function() {
    AWS.restore();
  });

  it("should be resilient to an incomplete message in the array", function() {
    let sqsEvent = { Records: [] };

    // eslint-disable-next-line no-unused-vars
    let callback = function(err, _event) {
      //expect(err).toBe("Message is not an Event!");
      expect(err).not.toBeDefined();
    };
    let context;
    disp.handler(sqsEvent, context, callback);
  });

  it("should dispatch the event on the message to all subscribers and to catch all", donef => {
    let done1 = 0;
    let done2 = 0;
    let events = [
      {
        eventType: "ThatCoolEventType",
        eventDate: new Date().getTime(),
        application: "app1"
      },
      {
        eventType: "ThatCoolEventType",
        eventDate: new Date().getTime(),
        application: "app1"
      },
      {
        eventType: "ThatCoolEventType",
        eventDate: new Date().getTime(),
        application: "app1"
      }
    ];

    let sendMessage = (data, callback) => {
      let result = {};
      done1++;
      callback(null, result);
    };

    let publish = (data, callback) => {
      let result = {};
      done2++;
      callback(null, result);
    };

    const putRecord = (data, callback) => {
      callback(null, { RecordId: "12345" });
    };

    AWS.mock("SNS", "publish", publish);
    AWS.mock("SQS", "sendMessage", sendMessage);
    AWS.mock("Firehose", "putRecord", putRecord);

    let context;
    let sqsEvent = {
      Records: [
        {
          messageId: "c80e8021-a70a-42c7-a470-796e1186f753",
          receiptHandle:
            "AQEBJQ+/u6NsnT5t8Q/VbVxgdUl4TMKZ5FqhksRdIQvLBhwNvADoBxYSOVeCBXdnS9P+erlTtwEALHsnBXynkfPLH3BOUqmgzP25U8kl8eHzq6RAlzrSOfTO8ox9dcp6GLmW33YjO3zkq5VRYyQlJgLCiAZUpY2D4UQcE5D1Vm8RoKfbE+xtVaOctYeINjaQJ1u3mWx9T7tork3uAlOe1uyFjCWU5aPX/1OHhWCGi2EPPZj6vchNqDOJC/Y2k1gkivqCjz1CZl6FlZ7UVPOx3AMoszPuOYZ+Nuqpx2uCE2MHTtMHD8PVjlsWirt56oUr6JPp9aRGo6bitPIOmi4dX0FmuMKD6u/JnuZCp+AXtJVTmSHS8IXt/twsKU7A+fiMK01NtD5msNgVPoe9JbFtlGwvTQ==",
          body: eventUtils.stringify(events[0]),
          attributes: {
            ApproximateReceiveCount: "3",
            SentTimestamp: "1529104986221",
            SenderId: "594035263019",
            ApproximateFirstReceiveTimestamp: "1529104986230"
          },
          messageAttributes: {},
          md5OfBody: "9bb58f26192e4ba00f01e2e7b136bbd8",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:us-west-2:594035263019:NOTFIFOQUEUE",
          awsRegion: "us-west-2"
        }
      ]
    };

    // eslint-disable-next-line no-unused-vars
    let callback = (err, _event) => {
      expect(err).not.toBeDefined();
      //expect(events[0].eventType).toEqual("ThatCoolEventType");
      //expect(events[0].eventDate).toEqual(theevents[0].eventDate);
      expect(done1).toBe(1);
      expect(done2).toBe(1);
      donef();
    };

    disp.handler(sqsEvent, context, callback);
  });
});
