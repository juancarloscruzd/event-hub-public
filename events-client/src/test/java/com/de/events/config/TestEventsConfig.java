package com.de.events.config;

import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@EnableAutoConfiguration
@Configuration
@ComponentScan(basePackages = { "com.de.events", "com.bdb.commons.services", "com.bdb.commons.client" })
public class TestEventsConfig {

    // Empty
}