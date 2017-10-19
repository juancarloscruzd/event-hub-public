package com.de.events.event;

import java.util.Date;

import org.junit.Assert;
import org.junit.Test;

import com.de.events.mocks.MockEvent;

public class EventFactoryTest {

    @Test
    public void testEventFactory() {
        EventFactory f = new EventFactory();
        Assert.assertNotNull(f);
    }

    @Test
    public void testEventOfStringObject() {
        final Object payload = new Date();
        final long time = new Date().getTime();
        final Event event = EventFactory.eventOf("MyEvent", payload);

        Assert.assertTrue(event.getEventTime() - time < 500);
        Assert.assertEquals("MyEvent", event.getType());
        Assert.assertSame(payload, event.getPayload().get(0));
    }

    /**
     * Test method for {@link com.bcp.axioma.events.api.utils.EventFactory#eventOf(java.lang.Class, java.lang.Object)}.
     */
    @Test
    public void testEventOfClassPayload() {
        final Object payload = new Date();
        final long time = new Date().getTime();
        final Event event = EventFactory.eventOf(MockEvent.class, payload);

        Assert.assertTrue(event.getEventTime() - time < 500);
        Assert.assertEquals(MockEvent.class.getName(), event.getType());
        Assert.assertSame(payload, event.getPayload().get(0));
    }

    /**
     * Test method for {@link com.bcp.axioma.events.api.utils.EventFactory#eventOf(java.lang.Class, String, java.lang.Object)}.
     */

    @Test
    public void testEventOfClassStringPayload() {
        final Object payload = new Date();
        final long time = new Date().getTime();
        final Event event = EventFactory.eventOf(MockEvent.class, "type", payload);

        Assert.assertTrue(event.getEventTime() - time < 500);
        Assert.assertEquals(MockEvent.class.getName() + "::type", event.getType());
        Assert.assertSame(payload, event.getPayload().get(0));
    }

    @Test
    public void testEventOfNullStringPayload() {
        final Object payload = new Date();
        final long time = new Date().getTime();
        final Event event = EventFactory.eventOf(null, "type", payload);

        Assert.assertTrue(event.getEventTime() - time < 500);
        Assert.assertEquals("type", event.getType());
        Assert.assertSame(payload, event.getPayload().get(0));
    }

    @Test
    public void testEventOfClassNullPayload() {
        final Object payload = new Date();
        final long time = new Date().getTime();
        final Event event = EventFactory.eventOf(MockEvent.class, null, payload);

        Assert.assertTrue(event.getEventTime() - time < 500);
        Assert.assertEquals(MockEvent.class.getName(), event.getType());
        Assert.assertSame(payload, event.getPayload().get(0));
    }

    @Test
    public void testEventOfClassEmptyPayload() {
        final Object payload = new Date();
        final long time = new Date().getTime();
        final Event event = EventFactory.eventOf(MockEvent.class, "", payload);

        Assert.assertTrue(event.getEventTime() - time < 500);
        Assert.assertEquals(MockEvent.class.getName(), event.getType());
        Assert.assertSame(payload, event.getPayload().get(0));
    }

}
