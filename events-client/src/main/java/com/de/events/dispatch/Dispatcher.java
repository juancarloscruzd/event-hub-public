/**
 *
 */
package com.de.events.dispatch;

import java.util.concurrent.CompletableFuture;

import com.de.events.event.Event;

/**
 *
 * @author Kiko Gatto
 *
 */
@FunctionalInterface
public interface Dispatcher {

    /**
     * @param event
     * @return
     */
    CompletableFuture<String> dispatch(Event event);

}
