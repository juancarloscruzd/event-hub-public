package com.de.events.dispatch;

import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.de.events.event.Event;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class RetrofitDispatcher implements Dispatcher {
    private static final Logger LOGGER = LoggerFactory.getLogger(RetrofitDispatcher.class);
    private Retrofit retrofit;

    /**
     *
     * @param eventsUr
     */
    public RetrofitDispatcher(String eventsUrl) {
        super();
        this.retrofit = new Retrofit.Builder().baseUrl(eventsUrl).addConverterFactory(GsonConverterFactory.create()).build();
    }

    @Override
    public CompletableFuture<String> dispatch(Event event) {

        RetrofitDispatcherClient client = this.getRetrofitDispatcherClient();
        Call<Void> c = client.dispatch(event);
        CompletableFuture<String> s = new CompletableFuture<>();
        c.enqueue(this.getEventsCallback(s));
        return s;
    }

    /**
     *
     * @return
     */
    protected RetrofitDispatcherClient getRetrofitDispatcherClient() {
        return this.getRetrofit().create(RetrofitDispatcherClient.class);
    }

    /**
     * @return the eventsCallback
     */
    protected Callback<Void> getEventsCallback(final CompletableFuture<String> s) {
        final Logger l = LOGGER;
        return new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                s.complete("");
                l.info("Publishing event successfull");
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                s.complete("error");
                l.error("Failure dispatching event: ", t);
            }
        };
    }

    /**
     * @return the retrofit
     */
    protected Retrofit getRetrofit() {
        return this.retrofit;
    }
}
