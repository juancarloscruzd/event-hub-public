/**
 *
 */
package com.de.events.event;

import java.util.List;

/**
 *
 * @author Kiko Gatto
 *
 */
public interface Event {

    /**
     * @return
     */

    Long getEventTime();

    /**
     * @return
     */
    String getType();

    /**
     * @return
     */
    List<Object> getPayload();
}
