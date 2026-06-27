package apigateway.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

// // @Configuration
// // public class CorsConfig {

// //     @Bean
// //     public CorsWebFilter corsWebFilter() {
// //         CorsConfiguration config = new CorsConfiguration();
// //         config.setAllowCredentials(true);
// //         config.addAllowedOriginPattern("*");  // or specific origins
// //         config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
// //         config.addAllowedHeader("*");

// //         UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
// //         source.registerCorsConfiguration("/**", config);
// //         return new CorsWebFilter(source);
// //     }
// // }
@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowCredentials(true);
        config.setAllowedOrigins(Arrays.asList("http://localhost:5173")); 
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setExposedHeaders(Arrays.asList("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}


// package apigateway.apigateway.config;

// import org.springframework.context.annotation.Configuration;

/**
 * Gateway-level CORS is intentionally disabled.
 *
 * The API gateway forwards requests to downstream services (authservice,
 * userservice, bloodbankservice, communicationservice), and each of those
 * services already publishes its own CORS headers via a CorsConfigurationSource
 * bean. Letting the gateway ALSO emit Access-Control-Allow-Origin causes the
 * response to carry the header twice (e.g. "http://localhost:5173, http://localhost:5173"),
 * which browsers reject with:
 *   "The 'Access-Control-Allow-Origin' header contains multiple values ...,
 *    but only one is allowed."
 *
 * If you ever need to add an origin here, also remove the same origin from
 * the downstream services to keep the response single-valued.
 */
// @Configuration
// public class CorsConfig {
//     // intentionally empty — see class javadoc
// }