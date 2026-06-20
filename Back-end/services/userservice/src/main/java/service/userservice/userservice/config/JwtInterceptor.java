package service.userservice.userservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import service.userservice.userservice.context.UserContext;

import java.util.Base64;
import java.util.Map;

@Component
public class JwtInterceptor implements HandlerInterceptor {
    @SuppressWarnings("unchecked")
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String payload = new String(Base64.getUrlDecoder().decode(authHeader.substring(7).split("\\.")[1]));
                UserContext.setClaims(new ObjectMapper().readValue(payload, Map.class));
                return true;
            } catch (Exception e) {
                response.setStatus(401);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"error\":\"Unauthorized\",\"message\":\"Access token is invalid.\"}");
                return false;
            }
        }
        response.setStatus(401);
        response.setContentType("application/json");
        response.getWriter().write("{\"success\":false,\"error\":\"Unauthorized\",\"message\":\"Access token is missing.\"}");
        return false;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}