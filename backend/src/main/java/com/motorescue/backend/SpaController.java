package com.motorescue.backend;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the compiled Angular single-page app from the Spring Boot server.
 * Any non-API route without a file extension falls back to index.html so
 * deep links such as /customer or /mechanic work on a single localhost port.
 */
@Controller
public class SpaController {

    @GetMapping(value = { "/{path:[^\\.]*}", "/**/{path:[^\\.]*}" })
    public String forward() {
        return "forward:/index.html";
    }
}
