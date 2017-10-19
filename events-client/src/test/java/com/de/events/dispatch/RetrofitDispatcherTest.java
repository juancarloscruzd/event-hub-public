package com.de.events.dispatch;

import static org.junit.Assert.*;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import org.junit.Test;

import com.de.events.dispatch.RetrofitDispatcher;
import com.de.events.dispatch.RetrofitDispatcherClient;

import retrofit2.Callback;

public class RetrofitDispatcherTest {

    @Test
    public void testRetrofitDispatcher() {
        RetrofitDispatcher d = new RetrofitDispatcher("http://localhost:8080/events/");
        assertEquals("http://localhost:8080/events/", d.getRetrofit().baseUrl().toString());
    }

    @Test
    public void testGetRetrofitDispatcherClient() {
        RetrofitDispatcher d = new RetrofitDispatcher("http://localhost:8080/events/");
        RetrofitDispatcherClient client = d.getRetrofitDispatcherClient();

        assertNotNull(client);
    }

    @Test
    public void testGetEventsCallback() throws InterruptedException, ExecutionException {
        RetrofitDispatcher d = new RetrofitDispatcher("http://localhost:8080/events/");

        CompletableFuture<String> s = new CompletableFuture<>();
        Callback<Void> callback = d.getEventsCallback(s);
        callback.onResponse(null, null);
        assertEquals("", s.get());
        s = new CompletableFuture<>();

        callback = d.getEventsCallback(s);
        callback.onFailure(null, null);
        assertEquals("error", s.get());
    }

}
