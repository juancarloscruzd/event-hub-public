describe("evetUtils", function() {
  var eventUtils = require("../src/eventUtils");

  // Check Type
  it("should check if the given event has a type", function() {
    expect(eventUtils.checkEventType({ eventType: "myType" })).toBeTruthy();
  });
  it("should check if the given event has a type (null type)", function() {
    expect(eventUtils.checkEventType({})).toBeFalsy();
  });
  it("should check if the given event has a type (undefined)", function() {
    expect(eventUtils.checkEventType({ eventType: "" })).toBeFalsy();
  });
  it("should check if the given event has a type (Empty)", function() {
    expect(eventUtils.checkEventType({ eventType: undefined })).toBeFalsy();
  });
  it("should check if the given event has a type (null)", function() {
    expect(eventUtils.checkEventType()).toBeFalsy();
  });
  // Check Date
  it("should check if the given event has a date", function() {
    expect(
      eventUtils.checkEventDate({ eventDate: new Date().getTime() })
    ).toBeTruthy();
  });
  it("should check if the given event has a date (null date)", function() {
    expect(eventUtils.checkEventDate({})).toBeFalsy();
  });
  it("should check if the given event has a date (undefined)", function() {
    expect(eventUtils.checkEventDate({ eventDate: undefined })).toBeFalsy();
  });
  it("should check if the given event has a date (Empty)", function() {
    expect(eventUtils.checkEventDate({ eventDate: "" })).toBeFalsy();
  });
  it("should check if the given event has a date (null)", function() {
    expect(eventUtils.checkEventDate()).toBeFalsy();
  });
  // Is Event
  it("should check if the given event is indeed an event", function() {
    expect(
      eventUtils.isEvent({
        eventDate: new Date().getTime(),
        eventType: "MyType"
      })
    ).toBeTruthy();
  });
  it("should check if the given event is indeed an event (false)", function() {
    expect(
      eventUtils.isEvent({ eventDate: new Date().getTime(), eventType: "" })
    ).toBeFalsy();
  });
  // Stringfy
  it("should convert an event into a json string", function() {
    let time = new Date().getTime();
    expect(eventUtils.stringify({ eventDate: time, eventType: "MyType" })).toBe(
      '{"eventDate":' + time + ',"eventType":"MyType"}'
    );
  });
  // GetOriginal
  it("should return the original event, contained on the given object - Null", function() {
    let event;
    expect(eventUtils.getOriginal(event)).toBe(null);
  });
  it("should return the original event, contained on the given object - Event", function() {
    let time = new Date().getTime();
    let event = { eventDate: time, eventType: "MyType" };

    expect(eventUtils.getOriginal(event)).toBe(event);
  });
  it("should return the original event, contained on the given object - Message", function() {
    let time = new Date().getTime();
    let event = { eventDate: time, eventType: "MyType" };

    expect(
      eventUtils.getOriginal({
        Message: '{"eventDate":' + time + ',"eventType":"MyType"}'
      })
    ).toEqual(event);
  });
});
