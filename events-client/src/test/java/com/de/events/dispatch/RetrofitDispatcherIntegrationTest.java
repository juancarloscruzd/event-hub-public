package com.de.events.dispatch;

import static okhttp3.mockwebserver.SocketPolicy.*;

import java.util.Date;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import com.de.events.config.TestEventsConfig;
import com.de.events.dispatch.RetrofitDispatcher;
import com.de.events.event.Event;
import com.de.events.event.EventFactory;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;

@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(classes = { TestEventsConfig.class })

public class RetrofitDispatcherIntegrationTest {

    @Rule
    public final MockWebServer server = new MockWebServer();

    // @Autowired
    RetrofitDispatcher dispatcher = new RetrofitDispatcher(this.server.url("/").toString());

    @Test
    public void testSuccessResponse() throws Exception {
        this.server.enqueue(new MockResponse().setBody("1000"));

        Date d = new Date();
        Event event = EventFactory.eventOf("MyTypeOfEvent", d);
        CompletableFuture<String> p = this.dispatcher.dispatch(event);
        Assert.assertEquals("", p.get());
    }

    @Test
    public void testDispatch() throws InterruptedException, ExecutionException {
        // this.server.enqueue(new MockResponse().setResponseCode(404));
        this.server.enqueue(new MockResponse().setSocketPolicy(DISCONNECT_AFTER_REQUEST));
        Date d = new Date();
        Event event = EventFactory.eventOf("MyTypeOfEvent", d);

        CompletableFuture<String> p = this.dispatcher.dispatch(event);

        Assert.assertEquals("error", p.get());

    }
}
