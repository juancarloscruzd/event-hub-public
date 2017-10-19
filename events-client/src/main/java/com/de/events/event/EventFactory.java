/**
 *
 */
package com.de.events.event;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Arrays;
import java.util.Date;

/**
 *
 * @author Kiko Gatto
 *
 */
public class EventFactory {

    protected EventFactory() {
        super();
    }

    /**
     * @param type
     * @param payload
     * @return
     */
    public static Event eventOf(String type, Object payload) {
        return eventOf(null, type, payload);
    }

    /**
     * @param eventClass
     * @param payload
     * @return
     */
    public static <T extends Event> Event eventOf(Class<T> eventClass, Object... payload) {
        return eventOf(eventClass, null, payload);
    }

    /**
     * @param eventClass
     * @param type
     * @param payload
     * @return
     */
    public static <T extends Event> Event eventOf(Class<T> eventClass, String type, Object... payload) {

        if (eventClass == null) {
            return createSimpleEvent(type, payload);
        }

        final Long eventTime = new Date().getTime();
        final InvocationHandler handler = (Object proxy, Method method, Object[] args) -> {
            final String methodName = method.getName();
            switch (methodName) {
            case "getEventTime":
                return eventTime;
            case "getPayload":
                return Arrays.asList(payload);
            default:
                final String theType = type != null && !type.isEmpty() ? "::" + type : "";
                return eventClass.getName() + theType;
            }

        };
        return (Event) Proxy.newProxyInstance(eventClass.getClassLoader(), new Class[] { Event.class }, handler);
    }

    /**
     *
     * @param type
     * @param payload
     * @return
     */
    protected static Event createSimpleEvent(final String type, final Object... payload) {
        final Long datetime = new Date().getTime();
        return new Event() {
            @Override
            public String getType() {
                return type;
            }

            @Override
            public Long getEventTime() {
                return datetime;
            }

            @Override
            public java.util.List<Object> getPayload() {
                return Arrays.asList(payload);
            }
        };
    }
}
