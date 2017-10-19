package com.de.events.dispatch;

import com.de.events.event.Event;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

/**
 *
 * @author Kiko Gatto
 *
 */
@FunctionalInterface
public interface RetrofitDispatcherClient {

    /**
     *
     * @param event
     * @return
     */
    @POST("dispatch")
    Call<Void> dispatch(@Body Event event);
}
